import { db } from '../database/db';
import { RecipeDetail, SearchResult } from '../types/api';
import { RecipeCacheRow } from '../types/database';
import { translateText, translateBatch } from '../utils/translate';
import { calculateRecipeNutrition } from '../utils/nutritionCalc';

const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';
const DEFAULT_SERVINGS = 4;

// Structure interne de TheMealDB
interface MealDbMeal {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string;
  [key: string]: string;
}

const parseIngredients = (meal: MealDbMeal) => {
  const ingredients: { name: string; amount: number; unit: string; original: string; measure: string }[] = [];
  for (let i = 1; i <= 20; i++) {
    const name    = meal[`strIngredient${i}`]?.trim();
    const measure = meal[`strMeasure${i}`]?.trim() ?? '';
    if (name) {
      ingredients.push({ name, measure, amount: 0, unit: '', original: `${measure} ${name}`.trim() });
    }
  }
  return ingredients;
};

const cacheRowToRecipeDetail = (cached: RecipeCacheRow): RecipeDetail => ({
  id:                  cached.id,
  title:               cached.title,
  title_fr:            cached.title_fr ?? undefined,
  image:               cached.image_url ?? '',
  servings:            cached.servings,
  summary:             '',
  instructions:        JSON.parse(cached.instructions),
  instructions_fr:     cached.instructions_fr ?? undefined,
  nutrition:           JSON.parse(cached.nutrition),
  extendedIngredients: cached.ingredients ? JSON.parse(cached.ingredients) : [],
});

const toRecipeDetail = (meal: MealDbMeal, title_fr: string, instructions_fr: string): RecipeDetail => {
  const rawIngredients = parseIngredients(meal);

  const nutrition = calculateRecipeNutrition(
    rawIngredients.map(i => ({ name: i.name, measure: i.measure })),
    DEFAULT_SERVINGS
  );

  return {
    id:             parseInt(meal.idMeal),
    title:          meal.strMeal,
    title_fr,
    instructions_fr,
    image:          meal.strMealThumb,
    servings:       DEFAULT_SERVINGS,
    category:       meal.strCategory || undefined,
    area:           meal.strArea || undefined,
    instructions:   meal.strInstructions || 'Aucune instruction disponible.',
    summary:        '',
    extendedIngredients: rawIngredients.map(({ name, amount, unit, original }) => ({
      name, amount, unit, original
    })),
    nutrition: {
      nutrients: [
        { name: 'Calories',      amount: nutrition.calories, unit: 'kcal' },
        { name: 'Protein',       amount: nutrition.protein,  unit: 'g'    },
        { name: 'Carbohydrates', amount: nutrition.carbs,    unit: 'g'    },
        { name: 'Fat',           amount: nutrition.fat,      unit: 'g'    },
      ],
    },
  };
};

/**
 * Recherche des recettes par ingrédients via TheMealDB.
 * Cherche par le premier ingrédient, récupère les détails en parallèle
 * pour calculer le score de correspondance avec les autres ingrédients.
 */
export const searchRecipesByIngredients = async (ingredients: string[]): Promise<SearchResult[]> => {
  if (ingredients.length === 0) return [];

  try {
    const mainIngredient = ingredients[0];
    const filterRes = await fetch(`${BASE_URL}/filter.php?i=${encodeURIComponent(mainIngredient)}`);
    if (!filterRes.ok) throw new Error(`TheMealDB filter error: ${filterRes.status}`);

    const filterData = await filterRes.json();
    if (!filterData.meals) return [];

    const topMeals: { idMeal: string; strMeal: string; strMealThumb: string }[] =
      filterData.meals.slice(0, 10);

    // Récupération des détails en parallèle (pas de quota sur TheMealDB)
    const details = await Promise.all(
      topMeals.map(m =>
        fetch(`${BASE_URL}/lookup.php?i=${m.idMeal}`)
          .then(r => r.json())
          .then(d => d.meals?.[0] as MealDbMeal | undefined)
          .catch(() => undefined)
      )
    );

    const validMeals = details.filter((m): m is MealDbMeal => !!m);

    // Traduction des titres par lot
    const titles_fr = await translateBatch(validMeals.map(m => m.strMeal));

    const userIngredients = ingredients.map(i => i.toLowerCase());

    return validMeals.map((meal, i) => {
      const recipeIngredients = parseIngredients(meal).map(ing => ing.name.toLowerCase());
      const usedCount = userIngredients.filter(ui =>
        recipeIngredients.some(ri => ri.includes(ui) || ui.includes(ri))
      ).length;

      return {
        id:                   parseInt(meal.idMeal),
        title:                meal.strMeal,
        title_fr:             titles_fr[i],
        image:                meal.strMealThumb,
        category:             meal.strCategory || undefined,
        area:                 meal.strArea || undefined,
        usedIngredientCount:  usedCount,
        missedIngredientCount: Math.max(0, recipeIngredients.length - usedCount),
      } satisfies SearchResult;
    }).sort((a, b) => b.usedIngredientCount - a.usedIngredientCount);

  } catch (error) {
    console.error('❌ Erreur searchRecipesByIngredients:', error);
    return [];
  }
};

/**
 * Recherche des recettes par nom via TheMealDB.
 * Le nom doit être en anglais (traduire côté appelant si nécessaire).
 */
export const searchRecipesByName = async (name: string): Promise<SearchResult[]> => {
  if (!name.trim()) return [];

  try {
    const res = await fetch(`${BASE_URL}/search.php?s=${encodeURIComponent(name.trim())}`);
    if (!res.ok) throw new Error(`TheMealDB search error: ${res.status}`);

    const data = await res.json();
    if (!data.meals) return [];

    const meals: MealDbMeal[] = data.meals.slice(0, 15);
    const titles_fr = await translateBatch(meals.map(m => m.strMeal));

    return meals.map((meal, i) => ({
      id:                   parseInt(meal.idMeal),
      title:                meal.strMeal,
      title_fr:             titles_fr[i],
      image:                meal.strMealThumb,
      category:             meal.strCategory || undefined,
      area:                 meal.strArea || undefined,
      usedIngredientCount:  0,
      missedIngredientCount: 0,
    } satisfies SearchResult));
  } catch (error) {
    console.error('❌ Erreur searchRecipesByName:', error);
    return [];
  }
};

/**
 * Détails d'une recette avec cache SQLite (TTL 24h).
 * Nutrition calculée localement depuis ANSES CIQUAL.
 */
export const getRecipeInformation = async (id: number): Promise<RecipeDetail | null> => {
  try {
    // 1. Cache SQLite
    const cached = await db.getFirstAsync<RecipeCacheRow>(
      'SELECT * FROM recipes_cache WHERE id = ?', [id]
    );

    if (cached) {
      const isExpired = Date.now() - new Date(cached.updated_at).getTime() > 24 * 60 * 60 * 1000;
      if (!isExpired) {
        try {
          return cacheRowToRecipeDetail(cached);
        } catch {
          // Cache corrompu, on recharge depuis l'API
        }
      }
    }

    // 2. Appel TheMealDB
    const response = await fetch(`${BASE_URL}/lookup.php?i=${id}`);
    if (!response.ok) throw new Error(`TheMealDB lookup error: ${response.status}`);

    const data = await response.json();
    const meal: MealDbMeal | undefined = data.meals?.[0];
    if (!meal) return null;

    // 3. Traduction
    const [title_fr, instructions_fr] = await Promise.all([
      translateText(meal.strMeal),
      translateText(meal.strInstructions ?? ''),
    ]);

    // 4. Construction de la recette complète
    const recipe = toRecipeDetail(meal, title_fr, instructions_fr);

    // 5. Mise en cache
    await db.runAsync(
      `INSERT OR REPLACE INTO recipes_cache
         (id, title, title_fr, image_url, servings, instructions, instructions_fr, nutrition, ingredients, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        recipe.id,
        recipe.title,
        title_fr,
        recipe.image,
        recipe.servings,
        JSON.stringify(recipe.instructions),
        instructions_fr,
        JSON.stringify(recipe.nutrition),
        JSON.stringify(recipe.extendedIngredients),
      ]
    );

    return recipe;
  } catch (error) {
    console.error('❌ Erreur getRecipeInformation:', error);
    return null;
  }
};
