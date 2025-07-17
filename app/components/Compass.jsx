// app/components/Compass.jsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Magnetometer } from 'expo-sensors';

const UPDATE_MS = 200;   // 5 Hz – plenty for UI
const ALPHA     = 0.2;   // 0 < ALPHA ≤ 1  (smaller = smoother)

// Circular low-pass filter.
// Keeps angles in 0-360° and avoids the 359° ↔ 1° jump.
function filterAngle(prev, raw) {
  const diff = ((raw - prev + 540) % 360) - 180; // shortest direction
  return (prev + diff * ALPHA + 360) % 360;
}

export default function Compass() {
  const [heading, setHeading] = useState(0);

  useEffect(() => {
    Magnetometer.setUpdateInterval(UPDATE_MS);

    const sub = Magnetometer.addListener(({ x, y }) => {
      // raw heading
      let angle = Math.atan2(y, x) * 180 / Math.PI + 90;
      if (angle < 0) angle += 360;

      // smooth it
      setHeading(prev => filterAngle(prev, angle));
    });

    return () => sub.remove();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        {Math.round(heading)}°
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading:   { fontSize: 72, fontWeight: 'bold' },
});
