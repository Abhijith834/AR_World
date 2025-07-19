
import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  useColorScheme,
  TouchableOpacity,
  Text,
} from 'react-native';

import LocationLive      from './components/Location';
import TripleCompass           from './components/TripleCompass';
import MultiCameraViewer from './components/MultiCameraViewer';

export default function App() {
  const isDark = useColorScheme() === 'dark';

  // modes: 'map' ➜ LocationLive, 'camera' ➜ MultiCameraViewer, 'compass' ➜ Compass
  const [mode, setMode] = useState('map');

  // pick which screen to show
  const renderContent = () => {
    switch (mode) {
      case 'camera':
        return <MultiCameraViewer />;
      case 'compass':
        return <TripleCompass />;
      default:
        return <LocationLive />;
    }
  };

  // determine next mode when the button is pressed
  const cycleMode = () => {
    setMode((prev) =>
      prev === 'map' ? 'camera' : prev === 'camera' ? 'compass' : 'map'
    );
  };

  // label displays the target screen
  const nextLabel =
    mode === 'map' ? 'Camera' : mode === 'camera' ? 'Compass' : 'Map';

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {renderContent()}

      <TouchableOpacity
        onPress={cycleMode}
        style={{
          position: 'absolute',
          right: 16,
          bottom: 40,
          backgroundColor: '#00000099',
          paddingVertical: 12,
          paddingHorizontal: 20,
          borderRadius: 30,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '600' }}>{nextLabel}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
