import React, { useEffect } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from './src/database/db';
import SearchScreen from './src/screens/SearchScreen';

export default function App() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
        <StatusBar style="dark" />
        <SearchScreen />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}