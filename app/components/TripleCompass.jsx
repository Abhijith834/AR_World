// app/components/TripleCompass.jsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import {
  Magnetometer,
  Accelerometer,
  Gyroscope,
} from 'expo-sensors';
import * as Location from 'expo-location';

/* ---------------- constants ---------------- */
const MAG_RATE = 100;      // ms   (10 Hz)
const GYR_RATE = 20;       // ms   (50 Hz)
const GRV_RATE = 100;      // ms
const LP_ALPHA = 0.15;     // for raw magnetic smoothing
const COMP_W   = 0.98;     // gyro weight in complementary filter

/* ---------------- helpers ------------------ */
const toDeg = r => r * 180 / Math.PI;
const toRad = d => d * Math.PI / 180;

/* keep angle inside 0-360° */
const norm360 = a => (a + 360) % 360;

/* shortest angular distance (-180 … +180) */
const diff = (a, b) => ((a - b + 540) % 360) - 180;

/* ---------------- component ---------------- */
export default function TripleCompass() {
  /* headings ------------------------------------------------------------ */
  const [magHeading,  setMagHeading]  = useState(0);
  const [trueHeading, setTrueHeading] = useState(0);
  const [gpsHeading,  setGpsHeading]  = useState(null);
  const [calcHeading, setCalcHeading] = useState(0);

  /* refs for running values -------------------------------------------- */
  const gravRef  = useRef({ x: 0, y: 0, z: 0 });
  const magRef   = useRef(0);     // smoothed magnetic heading
  const calcRef  = useRef(0);     // complementary filter output
  const lastGyro = useRef(Date.now());

  /* ---------- accelerometer (gravity vector) ---------- */
  useEffect(() => {
    Accelerometer.setUpdateInterval(GRV_RATE);
    const accSub = Accelerometer.addListener(a => (gravRef.current = a));
    return () => accSub.remove();
  }, []);

  /* ---------- magnetometer (tilt-compensated) ---------- */
  useEffect(() => {
    Magnetometer.setUpdateInterval(MAG_RATE);
    const magSub = Magnetometer.addListener(({ x: mx, y: my, z: mz }) => {
      const { x: ax, y: ay, z: az } = gravRef.current;

      /* 1. normalise gravity */
      const g = Math.hypot(ax, ay, az) || 1;
      const gx = ax / g, gy = ay / g, gz = az / g;

      /* 2. project magnetic vector into horizontal plane */
      const hx = my * gz - mz * gy;
      const hy = mz * gx - mx * gz;

      let mag = toDeg(Math.atan2(hy, hx));
      if (mag < 0) mag += 360;

      /* 3. low-pass raw magnetic to calm jitter */
      mag = norm360(magRef.current + diff(mag, magRef.current) * LP_ALPHA);
      magRef.current = mag;
      setMagHeading(Math.round(mag));
    });
    return () => magSub.remove();
  }, []);

  /* ---------- gyroscope + complementary filter ---------- */
  useEffect(() => {
    Gyroscope.setUpdateInterval(GYR_RATE);
    const gyrSub = Gyroscope.addListener(({ z }) => {
      const now = Date.now();
      const dt  = (now - lastGyro.current) / 1000;   // seconds
      lastGyro.current = now;

      /* integrate gyro (rad · s⁻¹) to degrees */
      const delta = toDeg(z) * dt;
      const gyroIntegrated = norm360(calcRef.current + delta);

      /* fuse with magnetic reference */
      const mag = magRef.current;
      const fused = norm360(
        COMP_W * gyroIntegrated + (1 - COMP_W) * (gyroIntegrated - diff(gyroIntegrated, mag))
      );

      calcRef.current = fused;
      setCalcHeading(Math.round(fused));
    });
    return () => gyrSub.remove();
  }, []);

  /* ---------- true & satellite headings (unchanged) --- */
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const sub = await Location.watchHeadingAsync(h =>
        setTrueHeading(Math.round(h.trueHeading ?? h.magHeading ?? 0))
      );
      return () => sub.remove();
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let lastFix = null;
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        loc => {
          const h = loc.coords.heading;
          if (h >= 0) setGpsHeading(Math.round(h));
          lastFix = loc;
        }
      );
      return () => sub.remove();
    })();
  }, []);

  /* ----------------- UI ------------------- */
  const rows = [
    ['Magnetic',    magHeading],
    ['True North',  trueHeading],
    ['Satellite',   gpsHeading === null ? '—' : gpsHeading],
    ['Calculated',  calcHeading],
  ];

  return (
    <View style={styles.container}>
      {rows.map(([label, val]) => (
        <View key={label} style={styles.block}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{val}°</Text>
        </View>
      ))}

      {Platform.OS === 'android' && (
        <Text style={styles.note}>
          Satellite heading updates only while the device is moving.
        </Text>
      )}
    </View>
  );
}

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  block:     { alignItems: 'center', marginVertical: 8 },
  label:     { fontSize: 15, color: '#666' },
  value:     { fontSize: 48, fontWeight: 'bold' },
  note:      { marginTop: 16, fontSize: 12, color: '#888', textAlign: 'center', paddingHorizontal: 20 },
});
