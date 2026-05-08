import * as SQLite from 'expo-sqlite';
import { normalizeNutrientValue } from '../utils/nutrition';
import { PlanningRow, UserProfileRow, ShoppingIngredient, QuestRow } from '../types/database';
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

      -- Table items cochés de la liste de courses (filtrés par semaine)
      CREATE TABLE IF NOT EXISTS shopping_checked (
        key TEXT PRIMARY KEY,
        week_start TEXT NOT NULL
      );

      -- Cache requêtes Spoonacular (minimise les appels payants)
      CREATE TABLE IF NOT EXISTS api_cache (
        query_hash TEXT PRIMARY KEY,
        response_json TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
    `);

    // Migrations
    try { await db.execAsync('ALTER TABLE recipes_cache ADD COLUMN ingredients TEXT;'); } catch (_) {}
    try { await db.execAsync('ALTER TABLE recipes_cache ADD COLUMN title_fr TEXT;'); } catch (_) {}
    try { await db.execAsync('ALTER TABLE recipes_cache ADD COLUMN instructions_fr TEXT;'); } catch (_) {}
    try { await db.execAsync("ALTER TABLE user_profile ADD COLUMN activity TEXT NOT NULL DEFAULT 'moderate';"); } catch (_) {}
    try { await db.execAsync('ALTER TABLE user_profile ADD COLUMN balance_zests INTEGER NOT NULL DEFAULT 20;'); } catch (_) {}
    try { await db.execAsync('ALTER TABLE user_profile ADD COLUMN is_premium INTEGER NOT NULL DEFAULT 0;'); } catch (_) {}
    try { await db.execAsync('ALTER TABLE user_profile ADD COLUMN last_reset_date TEXT;'); } catch (_) {}
    try { await db.execAsync('ALTER TABLE user_profile ADD COLUMN quest_zests INTEGER NOT NULL DEFAULT 0;'); } catch (_) {}
    try { await db.execAsync('ALTER TABLE user_profile ADD COLUMN quest_zests_expires_at TEXT;'); } catch (_) {}
    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
    } catch (_) {}
    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS quests (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          label TEXT NOT NULL,
          target_count INTEGER NOT NULL,
          current_count INTEGER NOT NULL DEFAULT 0,
          reward_zests INTEGER NOT NULL,
          expires_at TEXT NOT NULL,
          completed_at TEXT,
          claimed_at TEXT
        );
      `);
    } catch (_) {}

  } catch (error) {
    console.error("❌ Erreur SQL lors de l'initialisation :", error);
  }
};

// --- FONCTIONS PLANNING (ISSUE #6) ---

export const addToPlanning = async (recipe: RecipeDetail, date: string, mealSlot: 'lunch' | 'dinner', servings: number) => {
  try {
    const calories = normalizeNutrientValue(recipe.nutrition?.nutrients.find(n => n.name === 'Calories')?.amount);
    const protein = normalizeNutrientValue(recipe.nutrition?.nutrients.find(n => n.name === 'Protein')?.amount);
    const fat = normalizeNutrientValue(recipe.nutrition?.nutrients.find(n => n.name === 'Fat')?.amount);
    const carbs = normalizeNutrientValue(recipe.nutrition?.nutrients.find(n => n.name === 'Carbohydrates')?.amount);

    await db.runAsync(
      `INSERT INTO planning (date, meal_slot, recipe_id, recipe_title, consumed_servings, calories, protein_g, fat_g, carbs_g)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [date, mealSlot, recipe.id, recipe.title_fr ?? recipe.title, servings, calories, protein, fat, carbs]
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
      `INSERT INTO user_profile (id, sex, age, weight_kg, height_cm, goal, activity, balance_zests, is_premium, last_reset_date)
       VALUES (1, ?, ?, ?, ?, ?, ?, 20, 0, NULL)
       ON CONFLICT(id) DO UPDATE SET
         sex = excluded.sex,
         age = excluded.age,
         weight_kg = excluded.weight_kg,
         height_cm = excluded.height_cm,
         goal = excluded.goal,
         activity = excluded.activity`,
      [profile.sex, profile.age, profile.weight_kg, profile.height_cm, profile.goal, profile.activity]
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
        MAX(p.recipe_title) as recipe_title,
        SUM(p.consumed_servings) as consumed_servings,
        r.servings as recipe_servings,
        r.ingredients
      FROM planning p
      JOIN recipes_cache r ON p.recipe_id = r.id
      WHERE p.date BETWEEN ? AND ?
      GROUP BY p.recipe_id, r.servings, r.ingredients
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

// --- DEV ONLY : reset complet de la DB ---
export const resetDatabase = async (): Promise<void> => {
  await db.execAsync(`
    DROP TABLE IF EXISTS planning;
    DROP TABLE IF EXISTS favorites;
    DROP TABLE IF EXISTS recipes_cache;
    DROP TABLE IF EXISTS user_profile;
    DROP TABLE IF EXISTS shopping_checked;
    DROP TABLE IF EXISTS app_settings;
    DROP TABLE IF EXISTS api_cache;
  `);
  await initDatabase();
};

// --- ONBOARDING ---

export const isOnboardingDone = async (): Promise<boolean> => {
  try {
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM app_settings WHERE key = 'onboarding_done'"
    );
    return row?.value === 'true';
  } catch {
    return false;
  }
};

export const setOnboardingDone = async (): Promise<void> => {
  try {
    await db.runAsync(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('onboarding_done', 'true')"
    );
  } catch (error) {
    console.error("❌ Erreur setOnboardingDone :", error);
  }
};

// --- LISTE DE COURSES : COCHES ---

export const getCheckedShoppingKeys = async (weekStart: string): Promise<string[]> => {
  try {
    const rows = await db.getAllAsync<{ key: string }>(
      'SELECT key FROM shopping_checked WHERE week_start = ?', [weekStart]
    );
    return rows.map(r => r.key);
  } catch {
    return [];
  }
};

export const toggleShoppingCheck = async (key: string, weekStart: string, checked: boolean): Promise<void> => {
  try {
    if (checked) {
      await db.runAsync(
        'INSERT OR REPLACE INTO shopping_checked (key, week_start) VALUES (?, ?)', [key, weekStart]
      );
    } else {
      await db.runAsync('DELETE FROM shopping_checked WHERE key = ?', [key]);
    }
  } catch (error) {
    console.error('❌ Erreur toggleShoppingCheck:', error);
  }
};

// --- QUÊTES ---

export const getQuests = async (): Promise<QuestRow[]> => {
  try {
    return await db.getAllAsync<QuestRow>('SELECT * FROM quests');
  } catch {
    return [];
  }
};

export const upsertQuestRow = async (quest: QuestRow): Promise<void> => {
  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO quests
         (id, type, label, target_count, current_count, reward_zests, expires_at, completed_at, claimed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [quest.id, quest.type, quest.label, quest.target_count, quest.current_count,
       quest.reward_zests, quest.expires_at, quest.completed_at, quest.claimed_at]
    );
  } catch (error) {
    console.error('❌ Erreur upsertQuestRow:', error);
  }
};

export const setQuestProgress = async (id: string, count: number, completedAt: string | null): Promise<void> => {
  try {
    await db.runAsync(
      'UPDATE quests SET current_count = ?, completed_at = ? WHERE id = ?',
      [count, completedAt, id]
    );
  } catch (error) {
    console.error('❌ Erreur setQuestProgress:', error);
  }
};

export const markQuestClaimed = async (id: string, claimedAt: string): Promise<void> => {
  try {
    await db.runAsync('UPDATE quests SET claimed_at = ? WHERE id = ?', [claimedAt, id]);
  } catch (error) {
    console.error('❌ Erreur markQuestClaimed:', error);
  }
};

export const getAllFavorites = async (): Promise<{ id: number; title: string; title_fr: string | null; image_url: string | null }[]> => {
  try {
    return await db.getAllAsync<{ id: number; title: string; title_fr: string | null; image_url: string | null }>(`
      SELECT f.recipe_id as id, r.title, r.title_fr, r.image_url
      FROM favorites f
      JOIN recipes_cache r ON f.recipe_id = r.id
      ORDER BY f.added_at DESC
    `);
  } catch (error) {
    console.error("Erreur getAllFavorites", error);
    return [];
  }
};