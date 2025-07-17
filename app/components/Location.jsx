import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Platform } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

export default function LocationLive() {
  const [coords, setCoords] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ask permission & start watching
  useEffect(() => {
    let subscription;          // will hold Location.subscribe reference

    (async () => {
      try {
        // 1. Request foreground permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setIsLoading(false);
          return;
        }

        // 2. Start real-time updates (highAccuracy every 2 s / 5 m)
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Highest,   // use .High for less battery
            timeInterval: 2000,                    // ms between updates
            distanceInterval: 5                    // metres between updates
          },
          loc => {
            setCoords(loc.coords);
            setIsLoading(false);
          }
        );
      } catch (e) {
        setErrorMsg(e.message);
        setIsLoading(false);
      }
    })();

    // cleanup on unmount
    return () => subscription?.remove();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Fetching location…</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <MapView
      style={styles.map}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={{
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005
      }}
      region={{
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005
      }}
      showsUserLocation
      followsUserLocation
    >
      <Marker coordinate={coords} title="You are here" />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  error: { color: 'red', padding: 20, textAlign: 'center' }
});
