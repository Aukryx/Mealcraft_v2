import React, { useEffect, useState } from 'react'; // N'oublie pas d'importer useEffect
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from './src/database/db';
import { searchRecipesByIngredients } from './src/api/recipes';
import Constants from 'expo-constants';

console.log("Clé détectée :", Constants.expoConfig?.extra?.spoonacularApiKey ? "OUI ✅" : "NON ❌");

export default function App() {
  const [dbReady, setDbReady] = useState(false); // État pour le témoin visuel

  useEffect(() => {
  initDatabase().then(async () => {
    // TEST API : on cherche des recettes avec "apple"
    const results = await searchRecipesByIngredients(['apple']);
    console.log("🍎 Résultats API :", results.length, "recettes trouvées");
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