import * as SQLite from 'expo-sqlite';

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