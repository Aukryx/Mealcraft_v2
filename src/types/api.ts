export interface SearchResult {
  id: number;
  title: string;
  title_fr?: string;
  image: string;
  category?: string;
  area?: string;
  usedIngredientCount: number;
  missedIngredientCount: number;
}

export interface RecipeDetail {
  id: number;
  title: string;
  title_fr?: string;
  instructions_fr?: string;
  image: string;
  servings: number;
  readyInMinutes?: number;
  category?: string;
  area?: string;
  instructions: string;
  summary: string;
  extendedIngredients: {
    name: string;
    amount: number;
    unit: string;
    original: string;
  }[];
  nutrition?: {
    nutrients: {
      name: string;
      amount: number;
      unit: string;
    }[];
  };
}
