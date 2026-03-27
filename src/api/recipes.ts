import Constants from 'expo-constants';
import { SearchResult } from '../types/api';

const API_KEY = Constants.expoConfig?.extra?.spoonacularApiKey;
const BASE_URL = 'https://api.spoonacular.com/recipes';

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