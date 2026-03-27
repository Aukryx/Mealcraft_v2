import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import { getRecipeInformation } from '../api/recipes';
import { RecipeDetail } from '../types/api';
import { addToPlanning } from '../database/db';

export default function RecipeDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'RecipeDetail'>>();
  const { recipeId } = route.params;
  
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState(1);

  const handleAddToPlanning = async (slot: 'lunch' | 'dinner') => {
  const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
  const success = await addToPlanning(recipe, today, slot, servings);
  if (success) {
    alert(`Ajouté au ${slot === 'lunch' ? 'midi' : 'soir'} !`);
  }
};

  useEffect(() => {
    getRecipeInformation(recipeId).then((data) => {
      setRecipe(data);
      setLoading(false);
    });
  }, [recipeId]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!recipe) return <Text>Erreur lors du chargement de la recette.</Text>;

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: recipe.image }} style={styles.image} />
      
      <View style={styles.content}>
        <Text style={styles.title}>{recipe.title}</Text>
        <Text style={styles.subtitle}>{recipe.servings} portions • {recipe.readyInMinutes} min</Text>

        <Text style={styles.sectionTitle}>Nutrition (par portion)</Text>
        <View style={styles.nutritionGrid}>
          {recipe.nutrition?.nutrients.slice(0, 4).map((n, i) => (
            <View key={i} style={styles.nutritionItem}>
              <Text style={styles.nutriValue}>{Math.round(n.amount)}{n.unit}</Text>
              <Text style={styles.nutriLabel}>{n.name}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Instructions</Text>
        <Text style={styles.instructions}>{recipe.instructions.replace(/<[^>]*>?/gm, '')}</Text>

        {/* C'est ici qu'on ajoutera le sélecteur de portions et le bouton Planning plus tard */}
        <TouchableOpacity style={styles.planButton}>
           <Text style={styles.sectionTitle}>Ma portion</Text>
<View style={styles.servingsSelector}>
  <TouchableOpacity onPress={() => setServings(Math.max(1, servings - 1))} style={styles.serveBtn}>
    <Text style={styles.serveBtnText}>-</Text>
  </TouchableOpacity>
  <Text style={styles.servingsText}>{servings}</Text>
  <TouchableOpacity onPress={() => setServings(servings + 1)} style={styles.serveBtn}>
    <Text style={styles.serveBtnText}>+</Text>
  </TouchableOpacity>
</View>

<View style={styles.actionRow}>
  <TouchableOpacity style={[styles.planButton, {backgroundColor: '#0984E3'}]} onPress={() => handleAddToPlanning('lunch')}>
    <Text style={styles.planButtonText}>Midi</Text>
  </TouchableOpacity>
  <TouchableOpacity style={[styles.planButton, {backgroundColor: '#6C5CE7'}]} onPress={() => handleAddToPlanning('dinner')}>
    <Text style={styles.planButtonText}>Soir</Text>
  </TouchableOpacity>
</View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  image: { width: '100%', height: 250 },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2D3436' },
  subtitle: { fontSize: 16, color: '#636E72', marginVertical: 8 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  nutritionGrid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F8F9FA', padding: 15, borderRadius: 12 },
  nutritionItem: { alignItems: 'center' },
  nutriValue: { fontWeight: 'bold', fontSize: 16 },
  nutriLabel: { fontSize: 12, color: '#636E72' },
  instructions: { fontSize: 16, lineHeight: 24, color: '#2D3436' },
  planButton: { backgroundColor: '#E17055', padding: 18, borderRadius: 12, marginTop: 30, alignItems: 'center' },
  planButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  servingsSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  serveBtn: { backgroundColor: '#DFE6E9', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  serveBtnText: { fontSize: 20, fontWeight: 'bold' },
  servingsText: { fontSize: 22, marginHorizontal: 20, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 40 },
});