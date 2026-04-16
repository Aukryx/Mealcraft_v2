export interface RecipeCacheRow {
  id: number;
  title: string;
  image_url: string | null;
  servings: number;
  instructions: string; // JSON sérialisé
  nutrition: string;    // JSON sérialisé
  updated_at: string;
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