export interface RecipeCacheRow {
  id: number;
  title: string;
  title_fr: string | null;
  image_url: string | null;
  servings: number;
  instructions: string;  // JSON sérialisé
  instructions_fr: string | null;
  nutrition: string;     // JSON sérialisé
  ingredients: string;   // JSON sérialisé (extendedIngredients)
  updated_at: string;
}

export interface ShoppingIngredient {
  recipeId: number;
  recipeTitle: string;
  name: string;
  amount: number;
  unit: string;
  original: string;
}

export interface PlanningRow {
  id?: number;
  date: string;         // YYYY-MM-DD
  meal_slot: 'lunch' | 'dinner';
  recipe_id: number;
  recipe_title: string;
  consumed_servings: number;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

export interface FavoriteRow {
  recipe_id: number;
  added_at: string;
}

export interface UserProfileRow {
  id: number;
  sex: 'male' | 'female';
  age: number;
  weight_kg: number;
  height_cm: number;
  goal: 'loss' | 'maintain' | 'gain';
}