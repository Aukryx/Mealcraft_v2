import React, { useEffect, useState } from 'react'; // N'oublie pas d'importer useEffect
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from './src/database/db';

export default function App() {
  const [dbReady, setDbReady] = useState(false); // État pour le témoin visuel

  useEffect(() => {
    initDatabase().then(() => {
      setDbReady(true); // On passe à true quand c'est fini
    });
  }, []);

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Text style={styles.title}>MealCraft v2</Text>
        
        {/* Témoin visuel direct sur le téléphone */}
        <Text style={{ color: dbReady ? 'green' : 'red', fontWeight: 'bold' }}>
          {dbReady ? "✅ Base de données : OK" : "⏳ Initialisation DB..."}
        </Text>

        <StatusBar style="auto" />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  }
});