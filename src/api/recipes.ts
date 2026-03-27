import Constants from 'expo-constants';
import { db } from '../database/db';
import { RecipeDetail, SearchResult } from '../types/api';
import { RecipeCacheRow } from '../types/database';

const API_KEY = Constants.expoConfig?.extra?.spoonacularApiKey;
const BASE_URL = 'https://api.spoonacular.com/recipes';

// --- RECHERCHE SIMPLE (Pas de cache ici car les résultats changent trop) ---
export const searchRecipesByIngredients = async (ingredients: string[]): Promise<SearchResult[]> => {
  const ingredientsQuery = ingredients.join(',');
  const url = `${BASE_URL}/findByIngredients?ingredients=${ingredientsQuery}&number=10&apiKey=${API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Erreur réseau');
    return await response.json();
  } catch (error) {
    console.error("Erreur API Search:", error);
    return [];
  }
};

// --- RÉCUPÉRATION DÉTAILS AVEC CACHE TTL 24H ---
export const getRecipeInformation = async (id: number): Promise<RecipeDetail | null> => {
  try {
    // 1. Vérifier le cache
    const cached = await db.getFirstAsync<RecipeCacheRow>(
      'SELECT * FROM recipes_cache WHERE id = ?',
      [id]
    );

    if (cached) {
      const updatedAt = new Date(cached.updated_at).getTime();
      const now = new Date().getTime();
      const isExpired = now - updatedAt > 24 * 60 * 60 * 1000; // 24h en ms

      if (!isExpired) {
        console.log(`📦 [Cache Hit] Recette ${id}`);
        return {
          ...cached,
          image: cached.image_url, // On réaligne le nom de propriété
          instructions: JSON.parse(cached.instructions),
          nutrition: JSON.parse(cached.nutrition),
        } as unknown as RecipeDetail;
      }
    }

    // 2. Si pas en cache ou expiré -> Appel API
    console.log(`🌐 [API Call] Recette ${id}`);
    const response = await fetch(`${BASE_URL}/${id}/information?includeNutrition=true&apiKey=${API_KEY}`);
    const data: RecipeDetail = await response.json();

    // 3. Stocker en base pour la prochaine fois
    await db.runAsync(
      `INSERT OR REPLACE INTO recipes_cache (id, title, image_url, servings, instructions, nutrition, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [id, data.title, data.image, data.servings, JSON.stringify(data.instructions), JSON.stringify(data.nutrition)]
    );

    return data;
  } catch (error) {
    console.error("Erreur getRecipeInformation:", error);
    return null;
  }
};