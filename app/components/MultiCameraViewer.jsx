import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  FlatList,
} from 'react-native';
import {
  CameraView,
  Camera,
  useCameraPermissions,
} from 'expo-camera';

/* the only lens IDs expo-camera can really return */
const LENS_IDS = ['back', 'front'];

export default function MultiCameraViewer() {
  /* ───── permission ───── */
  const [permission, requestPermission] = useCameraPermissions();

  /* ───── state ───── */
  const [lenses, setLenses] = useState(null);  // null → still probing
  const [active, setActive] = useState([]);    // preview on/off per lens

  /* ask once if status is “undetermined” */
  useEffect(() => {
    if (permission?.status === 'undetermined' && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  /* enumerate lenses after permission is granted */
  useEffect(() => {
    (async () => {
      if (permission?.status !== 'granted') return;

      let list;
      if (typeof Camera.getAvailableCameraTypesAsync === 'function') {
        try {
          list = await Camera.getAvailableCameraTypesAsync();
        } catch (e) {
          console.warn('Camera enumeration error:', e);
        }
      }
      /* keep only “back” & “front”, fall back if OS returns nothing */
      const safe = (list || LENS_IDS).filter((t) =>
        t === 'back' || t === 'front'
      );

      setLenses(safe);
      setActive(safe.map((_, i) => i === 0)); // start rear by default
    })();
  }, [permission]);

  /* helper: toggle a tile */
  const toggle = (idx) =>
    setActive((prev) => prev.map((v, i) => (i === idx ? !v : v)));

  /* ───── UI branches ───── */
  if (!permission || permission.status === 'undetermined') {
    return <Center label="Requesting camera permission…" />;
  }

  if (permission.status !== 'granted') {
    return (
      <Center label="Camera access denied">
        {permission.canAskAgain && (
          <TouchableOpacity onPress={requestPermission} style={styles.button}>
            <Text style={styles.buttonText}>Grant</Text>
          </TouchableOpacity>
        )}
      </Center>
    );
  }

  if (!lenses) {
    return (
      <Center label="Loading cameras…">
        <ActivityIndicator />
      </Center>
    );
  }

  /* ───── main grid (always 2 items) ───── */
  return (
    <FlatList
      data={lenses}
      keyExtractor={(facing) => facing}
      numColumns={2}
      contentContainerStyle={styles.list}
      renderItem={({ item: facing, index }) => (
        <View style={styles.tile}>
          {active[index] && (
            <CameraView style={styles.preview} facing={facing} isActive />
          )}
          <TouchableOpacity
            style={styles.overlay}
            onPress={() => toggle(index)}
            activeOpacity={0.8}
          >
            <Text style={styles.label}>{facing}</Text>
            <Text style={styles.hint}>
              {active[index] ? 'tap to stop' : 'tap to start'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

/* centered helper */
function Center({ label, children }) {
  return (
    <View style={styles.center}>
      <Text style={styles.message}>{label}</Text>
      {children}
    </View>
  );
}

/* ───── styles ───── */
const GAP = 12;

const styles = StyleSheet.create({
  list: { padding: GAP },
  tile: {
    flex: 1,
    margin: GAP / 2,
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000',          // keeps grid square while loading
  },
  preview: { ...StyleSheet.absoluteFillObject },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingBottom: 8,
  },
  label: { color: '#fff', fontWeight: '700' },
  hint:  { color: '#fff', fontSize: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  message: { marginBottom: 14, fontSize: 16, textAlign: 'center' },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#007aff',
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: '700' },
});
