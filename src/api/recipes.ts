import Constants from 'expo-constants';
import { db } from '../database/db';
import { RecipeDetail, SearchResult } from '../types/api';
import { RecipeCacheRow } from '../types/database';

const API_KEY = Constants.expoConfig?.extra?.spoonacularApiKey;
const BASE_URL = 'https://api.spoonacular.com/recipes';

/**
 * Recherche des recettes par ingrédients
 */
export const searchRecipesByIngredients = async (ingredients: string[]): Promise<SearchResult[]> => {
  if (ingredients.length === 0) return [];
  
  // Utilisation de l'anglais recommandée pour maximiser les résultats avec 50 pts/jour
  const ingredientsQuery = encodeURIComponent(ingredients.join(','));
  const url = `${BASE_URL}/findByIngredients?ingredients=${ingredientsQuery}&number=10&apiKey=${API_KEY}`;

  try {
    const response = await fetch(url);
    
    // Gestion du quota (Erreur 402)
    if (response.status === 402) {
      console.error("❌ Quota Spoonacular épuisé pour aujourd'hui !");
      return [];
    }

    if (!response.ok) throw new Error(`Erreur API: ${response.status}`);
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("❌ Erreur searchRecipesByIngredients:", error);
    return [];
  }
};

/**
 * Détails d'une recette avec Cache SQLite (TTL 24h) et Fallback Instructions
 */
export const getRecipeInformation = async (id: number): Promise<RecipeDetail | null> => {
  try {
    // 1. Vérification du cache pour économiser les points
    const cached = await db.getFirstAsync<RecipeCacheRow>(
      'SELECT * FROM recipes_cache WHERE id = ?',
      [id]
    );

    if (cached) {
      const isExpired = new Date().getTime() - new Date(cached.updated_at).getTime() > 24 * 60 * 60 * 1000;
      if (!isExpired) {
        return {
          ...cached,
          image: cached.image_url,
          instructions: JSON.parse(cached.instructions),
          nutrition: JSON.parse(cached.nutrition),
        } as unknown as RecipeDetail;
      }
    }

    // 2. Appel API si nécessaire
    const response = await fetch(`${BASE_URL}/${id}/information?includeNutrition=true&apiKey=${API_KEY}`);
    
    if (response.status === 402) {
      console.error("❌ Quota épuisé lors de la récupération des détails");
      return null;
    }

    if (!response.ok) throw new Error(`Erreur API: ${response.status}`);

    const data: RecipeDetail = await response.json();

    // 3. Logique de Fallback pour les instructions
    // On utilise le résumé (summary) si les instructions sont vides
    const finalInstructions = (data.instructions && data.instructions.trim() !== "") 
      ? data.instructions 
      : (data.summary && data.summary.trim() !== "" 
          ? data.summary 
          : "Aucune instruction détaillée n'est disponible.");

    data.instructions = finalInstructions;

    // 4. Sauvegarde en cache
    await db.runAsync(
      `INSERT OR REPLACE INTO recipes_cache (id, title, image_url, servings, instructions, nutrition, ingredients, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        id,
        data.title,
        data.image,
        data.servings,
        JSON.stringify(data.instructions),
        JSON.stringify(data.nutrition),
        JSON.stringify(data.extendedIngredients ?? []),
      ]
    );

    return data;
  } catch (error) {
    console.error("❌ Erreur getRecipeInformation:", error);
    return null;
  }
};