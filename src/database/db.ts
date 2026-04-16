import * as SQLite from 'expo-sqlite';
import { PlanningRow } from '../types/database';
import { normalizeNutrientValue } from '../utils/nutrition';

// Ouverture de la base de données (MealCraft.db)
export const db = SQLite.openDatabaseSync('mealcraft.db');

export const initDatabase = async () => {
  try {
    // Activation des clés étrangères pour les relations entre tables
    await db.execAsync('PRAGMA foreign_keys = ON;');

    await db.execAsync(`
      -- Table Cache Recettes
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
    `);

    console.log("✅ Base de données initialisée (Tables prêtes)");
  } catch (error) {
    console.error("❌ Erreur SQL lors de l'initialisation :", error);
  }
};

export const addToPlanning = async (recipe: any, date: string, mealSlot: 'lunch' | 'dinner', servings: number) => {
  try {
    // On extrait les nutriments principaux via notre utilitaire de normalisation
    const calories = normalizeNutrientValue(recipe.nutrition?.nutrients.find((n: any) => n.name === 'Calories')?.amount);
    const protein = normalizeNutrientValue(recipe.nutrition?.nutrients.find((n: any) => n.name === 'Protein')?.amount);
    const fat = normalizeNutrientValue(recipe.nutrition?.nutrients.find((n: any) => n.name === 'Fat')?.amount);
    const carbs = normalizeNutrientValue(recipe.nutrition?.nutrients.find((n: any) => n.name === 'Carbohydrates')?.amount);

    await db.runAsync(
      `INSERT INTO planning (date, meal_slot, recipe_id, recipe_title, consumed_servings, calories, protein_g, fat_g, carbs_g)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [date, mealSlot, recipe.id, recipe.title, servings, calories, protein, fat, carbs]
    );
    console.log("📅 Ajouté au planning avec succès !");
    return true;
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout au planning :", error);
    return false;
  }
};

// Récupérer le planning pour une date donnée
export const getPlanningForDate = async (date: string): Promise<PlanningRow[]> => {
  return await db.getAllAsync<PlanningRow>(
    'SELECT * FROM planning WHERE date = ? ORDER BY meal_slot DESC',
    [date]
  );
};

// Supprimer un repas du planning
export const removeFromPlanning = async (id: number) => {
  await db.runAsync('DELETE FROM planning WHERE id = ?', [id]);
};