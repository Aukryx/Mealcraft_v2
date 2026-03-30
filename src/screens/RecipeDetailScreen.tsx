import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import { getRecipeInformation } from '../api/recipes';
import { RecipeDetail } from '../types/api';
import { addToPlanning, isFavorite, toggleFavorite } from '../database/db';

export default function RecipeDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'RecipeDetail'>>();
  const { recipeId } = route.params;
  
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState(1);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    // Chargement des données de la recette et du statut favori
    Promise.all([
      getRecipeInformation(recipeId),
      isFavorite(recipeId)
    ]).then(([recipeData, favStatus]) => {
      setRecipe(recipeData);
      setIsFav(favStatus);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [recipeId]);

  const handleToggleFavorite = async () => {
    const newState = await toggleFavorite(recipeId);
    setIsFav(newState);
  };

  const handleAddToPlanning = async (slot: 'lunch' | 'dinner') => {
    if (!recipe) return;
    const today = new Date().toISOString().split('T')[0];
    const success = await addToPlanning(recipe, today, slot, servings);
    if (success) {
      Alert.alert("Succès", `Ajouté au repas du ${slot === 'lunch' ? 'midi' : 'soir'} !`);
    }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#00B894" />
    </View>
  );

  if (!recipe) return (
    <View style={styles.center}>
      <Text>Erreur lors du chargement de la recette.</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Image avec bouton Favoris */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: recipe.image }} style={styles.image} />
        <TouchableOpacity 
          style={styles.favCircle} 
          onPress={handleToggleFavorite}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 24 }}>{isFav ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>{recipe.title}</Text>
        <Text style={styles.subtitle}>
          ⏱️ {recipe.readyInMinutes} min  •  🍽️ {recipe.servings} portions d'origine
        </Text>

        {/* Nutrition Grid */}
        <Text style={styles.sectionTitle}>Nutrition (par portion)</Text>
        <View style={styles.nutritionGrid}>
          {recipe.nutrition?.nutrients.slice(0, 4).map((n, i) => (
            <View key={i} style={styles.nutritionItem}>
              <Text style={styles.nutriValue}>{Math.round(n.amount)}{n.unit}</Text>
              <Text style={styles.nutriLabel}>{n.name}</Text>
            </View>
          ))}
        </View>

        {/* Instructions */}
        <Text style={styles.sectionTitle}>Instructions</Text>
        <Text style={styles.instructions}>
          {recipe.instructions ? recipe.instructions.replace(/<[^>]*>?/gm, '') : "Aucune instruction disponible."}
        </Text>

        <View style={styles.divider} />

        {/* Sélecteur de portions pour le planning */}
        <Text style={styles.sectionTitle}>Planifier ce repas</Text>
        <Text style={styles.label}>Combien de portions allez-vous consommer ?</Text>
        
        <View style={styles.servingsSelector}>
          <TouchableOpacity 
            onPress={() => setServings(Math.max(1, servings - 1))} 
            style={styles.serveBtn}
          >
            <Text style={styles.serveBtnText}>-</Text>
          </TouchableOpacity>
          
          <View style={styles.servingsDisplay}>
            <Text style={styles.servingsText}>{servings}</Text>
            <Text style={styles.servingsSub}>portion(s)</Text>
          </View>

          <TouchableOpacity 
            onPress={() => setServings(servings + 1)} 
            style={styles.serveBtn}
          >
            <Text style={styles.serveBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Boutons d'action Planning */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.planButton, {backgroundColor: '#0984E3'}]} 
            onPress={() => handleAddToPlanning('lunch')}
          >
            <Text style={styles.planButtonText}>Midi</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.planButton, {backgroundColor: '#6C5CE7'}]} 
            onPress={() => handleAddToPlanning('dinner')}
          >
            <Text style={styles.planButtonText}>Soir</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 280 },
  favCircle: {
    position: 'absolute',
    bottom: -25,
    right: 25,
    backgroundColor: '#FFF',
    width: 55,
    height: 55,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  content: { padding: 20, paddingTop: 30 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#2D3436', marginBottom: 5 },
  subtitle: { fontSize: 15, color: '#636E72', marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 15, marginBottom: 12, color: '#2D3436' },
  label: { fontSize: 14, color: '#636E72', marginBottom: 10 },
  nutritionGrid: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    backgroundColor: '#F8F9FA', 
    padding: 15, 
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F2F6'
  },
  nutritionItem: { alignItems: 'center' },
  nutriValue: { fontWeight: 'bold', fontSize: 16, color: '#2D3436' },
  nutriLabel: { fontSize: 11, color: '#636E72', marginTop: 2 },
  instructions: { fontSize: 16, lineHeight: 26, color: '#444', textAlign: 'justify' },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 25 },
  
  servingsSelector: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginVertical: 15,
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 20
  },
  serveBtn: { 
    backgroundColor: '#FFF', 
    width: 45, 
    height: 45, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DFE6E9',
    elevation: 2
  },
  serveBtnText: { fontSize: 24, fontWeight: 'bold', color: '#2D3436' },
  servingsDisplay: { alignItems: 'center', marginHorizontal: 30 },
  servingsText: { fontSize: 28, fontWeight: 'bold', color: '#00B894' },
  servingsSub: { fontSize: 12, color: '#636E72' },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 40 },
  planButton: { 
    flex: 0.48, 
    padding: 18, 
    borderRadius: 15, 
    alignItems: 'center',
    elevation: 3
  },
  planButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
});