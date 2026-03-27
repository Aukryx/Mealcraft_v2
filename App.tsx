import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from './src/database/db';
import { getRecipeInformation } from './src/api/recipes';

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const setup = async () => {
      await initDatabase();
      setDbReady(true);

      // TEST DU CACHE : On appelle deux fois la même recette
      // ID 716429 est une recette de pâtes souvent utilisée en test
      console.log("--- Premier appel ---");
      await getRecipeInformation(716429);
      
      console.log("--- Deuxième appel (devrait être Cache Hit) ---");
      await getRecipeInformation(716429);
    };

    setup();
  }, []);

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Text style={styles.title}>MealCraft v2</Text>
        <Text style={{ color: dbReady ? 'green' : 'red', fontWeight: 'bold' }}>
          {dbReady ? "✅ Base de données & Cache : OK" : "⏳ Initialisation..."}
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