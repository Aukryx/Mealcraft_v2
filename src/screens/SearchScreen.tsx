import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator 
} from 'react-native';
import { searchRecipesByIngredients } from '../api/recipes';
import { SearchResult } from '../types/api';

export default function SearchScreen() {
  const [ingredient, setIngredient] = useState('');
  const [ingredientsList, setIngredientsList] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const addIngredient = () => {
    if (ingredient.trim()) {
      setIngredientsList([...ingredientsList, ingredient.trim().toLowerCase()]);
      setIngredient('');
    }
  };

  const removeIngredient = (index: number) => {
    setIngredientsList(ingredientsList.filter((_, i) => i !== index));
  };

  const handleSearch = async () => {
    console.log("🔍 Bouton cliqué ! Recherche pour :", ingredientsList);
    setLoading(true);
    const results = await searchRecipesByIngredients(ingredientsList);
    console.log("✅ Résultats trouvés :", results.length);
    setRecipes(results);
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.mainTitle}>MealCraft</Text>

      {/* Saisie */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ex: poulet, tomate..."
          value={ingredient}
          onChangeText={setIngredient}
          onSubmitEditing={addIngredient}
        />
        <TouchableOpacity style={styles.addButton} onPress={addIngredient}>
          <Text style={styles.buttonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Tags */}
      <View style={styles.tagContainer}>
        {ingredientsList.map((item, index) => (
          <TouchableOpacity key={index} onPress={() => removeIngredient(index)} style={styles.tag}>
            <Text style={styles.tagText}>{item}  ✕</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bouton Action */}
      {ingredientsList.length > 0 && (
        <TouchableOpacity 
          style={[styles.searchButton, loading && { opacity: 0.7 }]} 
          onPress={handleSearch}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Trouver des recettes</Text>}
        </TouchableOpacity>
      )}

      {/* Résultats */}
      <FlatList
        data={recipes}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.9}>
            <Image source={{ uri: item.image }} style={styles.cardImage} />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>
                ⚠️ Manque {item.missedIngredientCount} ingrédient(s)
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>
              {ingredientsList.length === 0 
                ? "Ajoutez des ingrédients pour commencer !" 
                : "Aucune recette trouvée."}
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F8F9FA' },
  mainTitle: { fontSize: 28, fontWeight: 'bold', color: '#2D3436', marginBottom: 20 },
  inputContainer: { flexDirection: 'row', marginBottom: 10 },
  input: { flex: 1, backgroundColor: '#FFF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0' },
  addButton: { backgroundColor: '#00B894', width: 50, marginLeft: 10, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  tag: { backgroundColor: '#DFE6E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  tagText: { color: '#2D3436', fontSize: 14 },
  searchButton: { backgroundColor: '#0984E3', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 15, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardImage: { width: '100%', height: 160 },
  cardContent: { padding: 12 },
  cardTitle: { fontWeight: 'bold', fontSize: 16, color: '#2D3436' },
  cardSubtitle: { color: '#D63031', marginTop: 4, fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#B2BEC3', fontSize: 16 }
});