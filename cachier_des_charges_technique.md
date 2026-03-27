# Cahier des charges technique — MealCraft

## 1) Objectif
Définir l’architecture technique, les choix d’implémentation et les contraintes de l’application mobile.

## 2) Stack cible
- **Framework mobile** : React Native avec Expo.
- **Langage** : TypeScript.
- **Navigation** : React Navigation (Stack + Tabs).
- **État global** : Zustand (ou Context API si périmètre réduit).
- **Stockage local** :
  - AsyncStorage pour préférences/favoris.
  - SQLite (expo-sqlite) pour planning repas et requêtes locales.

## 3) Architecture applicative

### Couches
- **UI** : écrans + composants réutilisables.
- **Application** : logique métier (planning, nutrition, favoris).
- **Data** : clients API + persistance locale + cache.

### Modules principaux
- `search` : recherche ingrédients/recettes.
- `recipe` : fiche recette + nutrition.
- `planner` : gestion hebdomadaire des repas.
- `favorites` : gestion des favoris.

## 4) Intégration API (Spoonacular)

### Endpoints minimum
- `recipes/findByIngredients`
- `recipes/{id}/information?includeNutrition=true`

### Règles
- Timeout réseau et gestion des erreurs standardisée.
- Mapping strict des réponses API vers des modèles internes typés.
- Limitation du nombre d’appels par session (quota).

## 5) Modèle de données local

### Exemple d’enregistrement planning
```json
{
  "date": "2026-03-27",
  "mealSlot": "lunch",
  "recipeId": 12345,
  "title": "Poulet au curry",
  "nutrition": {
    "calories": 450,
    "protein_g": 30,
    "fat_g": 15,
    "carbs_g": 40
  }
}
```

### Contraintes de données
- Clé unique recommandée : (`date`, `mealSlot`).
- Valeurs nutritionnelles stockées en unités numériques (grammes/kcal).

### Normalisation des unités (obligatoire)
- Les valeurs nutritionnelles API (ex. `"30 g"`, `"120 mg"`) doivent être converties en `number` avant persistance.
- Implémenter une fonction utilitaire centralisée (ex. `normalizeNutrientValue()`) appelée dans la couche Data.
- Unité cible en base :
  - macronutriments en grammes (`g`)
  - énergie en kilocalories (`kcal`)
- En cas de valeur invalide/non parsable : stocker `null` et journaliser un warning applicatif.

### Données planning liées aux portions
- Le planning doit stocker, en plus des nutriments, les champs :
  - `recipeServings` (nombre de portions de la recette source)
  - `consumedServings` (nombre de portions consommées)
- Calcul nutritionnel au moment de l’agrégation :
  - `nutritionConsumed = nutritionTotal × (consumedServings / recipeServings)`

## 6) Stratégie cache & hors-ligne
- Mise en cache locale des recettes consultées (TTL recommandé : 24 h).
- Lecture prioritaire du cache si donnée fraîche.
- Planning et favoris consultables hors ligne en permanence.

## 7) Sécurité et configuration
- Clé API stockée via variables d’environnement (jamais en dur dans le code).
- Journalisation limitée en production (pas de données sensibles).

## 8) Risques techniques et mitigation
- **Quota API insuffisant** → cache agressif + réduction des appels doublons.
- **Ingrédient non reconnu** → autocomplétion/normalisation des termes.
- **Usage hors ligne** → stockage local obligatoire pour planning/favoris.

## 9) Qualité et validation
- Typage strict TypeScript (`strict: true`).
- Tests ciblés sur logique métier critique : planning, calcul nutritionnel, cache.
- Vérification manuelle sur Android et iOS avant livraison.