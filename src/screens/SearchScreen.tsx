import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { searchRecipesByIngredients, searchRecipesByName } from '../api/recipes';
import { SearchResult } from '../types/api';
import { translateIngredients } from '../utils/ingredients';
import { translateText } from '../utils/translate';
import { useLanguage } from '../context/LanguageContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { getZestBalance, DAILY_FREE_QUOTA, PREMIUM_DAILY_CAP } from '../utils/creditManager';

export default function SearchScreen() {
  const [searchMode, setSearchMode] = useState<'ingredients' | 'name'>('ingredients');
  const [ingredient, setIngredient] = useState('');
  const [ingredientsList, setIngredientsList] = useState<string[]>([]);
  const [recipeName, setRecipeName] = useState('');
  const [recipes, setRecipes] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [zestBalance, setZestBalance] = useState(DAILY_FREE_QUOTA);
  const [isPremium, setIsPremium] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isFr } = useLanguage();

  useFocusEffect(
    useCallback(() => {
      getZestBalance().then(({ balance, isPremium: premium }) => {
        setZestBalance(balance);
        setIsPremium(premium);
      });
    }, [])
  );

  const switchMode = (mode: 'ingredients' | 'name') => {
    if (mode === searchMode) return;
    setSearchMode(mode);
    setRecipes([]);
    setErrorMsg(null);
    setIngredient('');
    setIngredientsList([]);
    setRecipeName('');
  };

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
    setLoading(true);
    setErrorMsg(null);
    try {
      if (searchMode === 'ingredients') {
        const translated = translateIngredients(ingredientsList);
        const results = await searchRecipesByIngredients(translated);
        setRecipes(results);
      } else {
        const nameEn = isFr
          ? await translateText(recipeName.trim(), 'fr', 'en')
          : recipeName.trim();
        const results = await searchRecipesByName(nameEn);
        setRecipes(results);
      }
    } catch {
      setRecipes([]);
      setErrorMsg('Une erreur est survenue lors de la recherche.');
    } finally {
      setLoading(false);
    }
  };

  const canSearch = searchMode === 'ingredients'
    ? ingredientsList.length > 0
    : recipeName.trim().length > 0;

  const cap = isPremium ? PREMIUM_DAILY_CAP : DAILY_FREE_QUOTA;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.mainTitle}>MealCraft</Text>
        <View style={styles.zestBadge}>
          <Text style={styles.zestText}>⚡ {zestBalance} / {cap}</Text>
          {isPremium && <Text style={styles.premiumTag}>PRO</Text>}
        </View>
      </View>

      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, searchMode === 'ingredients' && styles.modeBtnActive]}
          onPress={() => switchMode('ingredients')}
        >
          <Text style={[styles.modeBtnText, searchMode === 'ingredients' && styles.modeBtnTextActive]}>
            Par ingrédients
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, searchMode === 'name' && styles.modeBtnActive]}
          onPress={() => switchMode('name')}
        >
          <Text style={[styles.modeBtnText, searchMode === 'name' && styles.modeBtnTextActive]}>
            Par nom
          </Text>
        </TouchableOpacity>
      </View>

      {searchMode === 'ingredients' ? (
        <>
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
          <View style={styles.tagContainer}>
            {ingredientsList.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => removeIngredient(ingredientsList.indexOf(item))}
                style={styles.tag}
              >
                <Text style={styles.tagText}>{item}  ✕</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : (
        <TextInput
          style={styles.nameInput}
          placeholder="Ex: chicken curry, pasta..."
          value={recipeName}
          onChangeText={setRecipeName}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
      )}

      {errorMsg && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
        </View>
      )}

      {canSearch && (
        <TouchableOpacity
          style={[styles.searchButton, loading && { opacity: 0.7 }]}
          onPress={handleSearch}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.buttonText}>Trouver des recettes</Text>
          }
        </TouchableOpacity>
      )}

      <FlatList
        data={recipes}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
          >
            <Image source={{ uri: item.image }} style={styles.cardImage} />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {isFr && item.title_fr ? item.title_fr : item.title}
              </Text>
              <View style={styles.cardMeta}>
                {item.usedIngredientCount > 0 && (
                  <Text style={styles.matchBadge}>✓ {item.usedIngredientCount} correspondance(s)</Text>
                )}
                {item.area && (
                  <Text style={styles.areaBadge}>{item.area}</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>
              {!canSearch
                ? searchMode === 'ingredients'
                  ? 'Ajoutez des ingrédients pour commencer !'
                  : 'Tapez un nom de recette pour commencer !'
                : 'Aucune recette trouvée.'}
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  mainTitle: { fontSize: 28, fontWeight: 'bold', color: '#2D3436' },
  zestBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E0E0E0', gap: 6 },
  zestText: { fontSize: 13, fontWeight: '700', color: '#2D3436' },
  premiumTag: { backgroundColor: '#6C5CE7', color: '#FFF', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  modeToggle: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, padding: 4, marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0' },
  modeBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#0984E3' },
  modeBtnText: { fontWeight: '600', fontSize: 14, color: '#636E72' },
  modeBtnTextActive: { color: '#FFF' },
  nameInput: { backgroundColor: '#FFF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0', fontSize: 16, height: 52, marginBottom: 15 },
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
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  matchBadge: { color: '#00B894', fontSize: 12, fontWeight: '600' },
  areaBadge: { color: '#636E72', fontSize: 12, backgroundColor: '#F1F2F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#B2BEC3', fontSize: 16 },
  errorBanner: { backgroundColor: '#FFEAA7', padding: 12, borderRadius: 10, marginBottom: 10 },
  errorText: { color: '#D63031', fontWeight: '600', textAlign: 'center', fontSize: 14 },
});
