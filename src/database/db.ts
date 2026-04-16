import * as SQLite from 'expo-sqlite';
import { normalizeNutrientValue } from '../utils/nutrition';
import { PlanningRow, UserProfileRow, ShoppingIngredient } from '../types/database';
import { RecipeDetail } from '../types/api';

// Ouverture de la base de données
export const db = SQLite.openDatabaseSync('mealcraft.db');

export const initDatabase = async () => {
  try {
    // Activation des clés étrangères
    await db.execAsync('PRAGMA foreign_keys = ON;');

    await db.execAsync(`
      -- Table Cache Recettes (Détails complets)
      CREATE TABLE IF NOT EXISTS recipes_cache (
        id INTEGER PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        image_url TEXT,
        servings INTEGER,
        instructions TEXT,
        nutrition TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Table Planning
      CREATE TABLE IF NOT EXISTS planning (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        meal_slot TEXT NOT NULL,
        recipe_id INTEGER NOT NULL,
        recipe_title TEXT,
        consumed_servings REAL,
        calories REAL,
        protein_g REAL,
        fat_g REAL,
        carbs_g REAL,
        FOREIGN KEY (recipe_id) REFERENCES recipes_cache (id) ON DELETE CASCADE
      );

      -- Table Favoris
      CREATE TABLE IF NOT EXISTS favorites (
        recipe_id INTEGER PRIMARY KEY NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recipe_id) REFERENCES recipes_cache (id) ON DELETE CASCADE
      );

      -- Table Profil utilisateur (une seule ligne, id = 1)
      CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY NOT NULL DEFAULT 1,
        sex TEXT NOT NULL DEFAULT 'male',
        age INTEGER NOT NULL DEFAULT 25,
        weight_kg REAL NOT NULL DEFAULT 70,
        height_cm REAL NOT NULL DEFAULT 175,
        goal TEXT NOT NULL DEFAULT 'maintain'
      );
    `);

    // Migration : ajout de la colonne ingredients si elle n'existe pas encore
    try {
      await db.execAsync('ALTER TABLE recipes_cache ADD COLUMN ingredients TEXT;');
    } catch (_) {
      // Colonne déjà présente, on ignore
    }

  } catch (error) {
    console.error("❌ Erreur SQL lors de l'initialisation :", error);
  }
};

// --- FONCTIONS PLANNING (ISSUE #6) ---

export const addToPlanning = async (recipe: RecipeDetail, date: string, mealSlot: 'lunch' | 'dinner', servings: number) => {
  try {
    const calories = normalizeNutrientValue(recipe.nutrition?.nutrients.find((n: any) => n.name === 'Calories')?.amount);
    const protein = normalizeNutrientValue(recipe.nutrition?.nutrients.find((n: any) => n.name === 'Protein')?.amount);
    const fat = normalizeNutrientValue(recipe.nutrition?.nutrients.find((n: any) => n.name === 'Fat')?.amount);
    const carbs = normalizeNutrientValue(recipe.nutrition?.nutrients.find((n: any) => n.name === 'Carbohydrates')?.amount);

    await db.runAsync(
      `INSERT INTO planning (date, meal_slot, recipe_id, recipe_title, consumed_servings, calories, protein_g, fat_g, carbs_g)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [date, mealSlot, recipe.id, recipe.title, servings, calories, protein, fat, carbs]
    );
    return true;
  } catch (error) {
    console.error("❌ Erreur addToPlanning :", error);
    return false;
  }
};

export const getPlanningForDate = async (date: string) => {
  try {
    return await db.getAllAsync<PlanningRow>('SELECT * FROM planning WHERE date = ?', [date]);
  } catch (error) {
    console.error("❌ Erreur getPlanningForDate :", error);
    return [];
  }
};

export const removeFromPlanning = async (id: number) => {
  try {
    await db.runAsync('DELETE FROM planning WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error("❌ Erreur removeFromPlanning :", error);
    return false;
  }
};

// --- FONCTIONS PROFIL ---

export const getUserProfile = async (): Promise<UserProfileRow | null> => {
  try {
    return await db.getFirstAsync<UserProfileRow>('SELECT * FROM user_profile WHERE id = 1');
  } catch (error) {
    console.error("❌ Erreur getUserProfile :", error);
    return null;
  }
};

export const saveUserProfile = async (profile: Omit<UserProfileRow, 'id'>): Promise<boolean> => {
  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO user_profile (id, sex, age, weight_kg, height_cm, goal)
       VALUES (1, ?, ?, ?, ?, ?)`,
      [profile.sex, profile.age, profile.weight_kg, profile.height_cm, profile.goal]
    );
    return true;
  } catch (error) {
    console.error("❌ Erreur saveUserProfile :", error);
    return false;
  }
};

export const isFavorite = async (recipeId: number): Promise<boolean> => {
  try {
    const row = await db.getFirstAsync<{recipe_id: number}>(
      'SELECT recipe_id FROM favorites WHERE recipe_id = ?', 
      [recipeId]
    );
    return !!row;
  } catch (error) {
    return false;
  }
};

/**
 * Ajoute ou retire une recette des favoris
 */
export const toggleFavorite = async (recipeId: number) => {
  try {
    const exists = await isFavorite(recipeId);
    if (exists) {
      await db.runAsync('DELETE FROM favorites WHERE recipe_id = ?', [recipeId]);
      return false; // Retiré
    } else {
      await db.runAsync('INSERT INTO favorites (recipe_id) VALUES (?)', [recipeId]);
      return true; // Ajouté
    }
  } catch (error) {
    console.error("Erreur toggleFavorite", error);
    return false;
  }
};

// --- LISTE DE COURSES ---

export const getShoppingList = async (startDate: string, endDate: string): Promise<ShoppingIngredient[]> => {
  try {
    const rows = await db.getAllAsync<{
      recipe_id: number;
      recipe_title: string;
      consumed_servings: number;
      recipe_servings: number;
      ingredients: string | null;
    }>(`
      SELECT
        p.recipe_id,
        p.recipe_title,
        p.consumed_servings,
        r.servings as recipe_servings,
        r.ingredients
      FROM planning p
      JOIN recipes_cache r ON p.recipe_id = r.id
      WHERE p.date BETWEEN ? AND ?
    `, [startDate, endDate]);

    const items: ShoppingIngredient[] = [];

    for (const row of rows) {
      if (!row.ingredients) continue;

      const parsed: { name: string; amount: number; unit: string; original: string }[] =
        JSON.parse(row.ingredients);

      const ratio = row.recipe_servings > 0
        ? row.consumed_servings / row.recipe_servings
        : 1;

      for (const ing of parsed) {
        items.push({
          recipeId: row.recipe_id,
          recipeTitle: row.recipe_title,
          name: ing.name,
          amount: Math.round(ing.amount * ratio * 10) / 10,
          unit: ing.unit,
          original: ing.original,
        });
      }
    }

    return items;
  } catch (error) {
    console.error("❌ Erreur getShoppingList :", error);
    return [];
  }
};

/**
 * Récupère la liste complète avec les infos du cache
 */
export const getAllFavorites = async () => {
  try {
    return await db.getAllAsync<any>(`
      SELECT f.recipe_id as id, r.title, r.image_url 
      FROM favorites f
      JOIN recipes_cache r ON f.recipe_id = r.id
      ORDER BY f.added_at DESC
    `);
  } catch (error) {
    console.error("Erreur getAllFavorites", error);
    return [];
  }
};