# MealCraft v2 — Guide pour Claude

## Vue d'ensemble

Application React Native (Expo) de gestion de repas :
- Recherche de recettes par ingrédients → **TheMealDB API** (gratuite, sans clé)
- Traduction FR↔EN → **MyMemory API** (gratuite, sans clé, rate-limit ~300ms/batch)
- Nutrition calculée **localement** depuis les données ANSES CIQUAL (`src/data/ciqualNutrition.ts`)
- Persistance locale **SQLite** via `expo-sqlite`
- Navigation : Stack (Welcome → MainTabs/RecipeDetail/ShoppingList) + Bottom Tabs (Search/Planning/Favorites/Profile)

## Stack technique

| Couche | Lib |
|---|---|
| Framework | React Native 0.81.5 + Expo ~54 |
| Navigation | @react-navigation v7 (native-stack + bottom-tabs) |
| Base de données | expo-sqlite ~16 |
| Language | TypeScript ~5.9 |

## Structure des fichiers

```
src/
  api/recipes.ts          # Appels TheMealDB + cache SQLite
  context/LanguageContext.tsx  # Contexte FR/EN persisté en DB
  database/db.ts          # Schéma SQLite + toutes les fonctions DB
  navigation/RootNavigator.tsx
  screens/
    WelcomeScreen.tsx     # Onboarding (une seule fois)
    SearchScreen.tsx      # Recherche par ingrédients
    RecipeDetailScreen.tsx # Détail + ajout au planning (modal)
    PlanningScreen.tsx    # Semaine courante + totaux nutritionnels
    FavoritesScreen.tsx   # Liste des favoris
    ShoppingListScreen.tsx # Liste de courses générée depuis le planning
    ProfileScreen.tsx     # Profil utilisateur + objectifs TDEE
  types/
    api.ts                # SearchResult, RecipeDetail
    database.ts           # RecipeCacheRow, PlanningRow, UserProfileRow, ...
  utils/
    dateUtils.ts          # toLocalDateString (évite les décalages UTC)
    ingredients.ts        # Dictionnaire FR→EN (traduction côté client)
    nutrition.ts          # normalizeNutrientValue
    nutritionCalc.ts      # parseMeasure + toGrams + calculateRecipeNutrition
    tdee.ts               # Mifflin-St Jeor + macros selon objectif
    translate.ts          # translateText / translateBatch via MyMemory
```

## Conventions de code

- **Pas de commentaires** sauf quand le WHY n'est pas évident (contrainte cachée, workaround)
- Styles toujours dans `StyleSheet.create` en bas du fichier, jamais inline sauf pour les valeurs dynamiques
- Les valeurs `%` dans les styles passent par `as any` (limitation TypeScript + StyleSheet)
- `useFocusEffect` + `useCallback` pour recharger les données à chaque fois qu'un écran devient actif
- Erreurs DB : `console.error` + return valeur par défaut (pas de throw)

## Logique métier importante

### Cache recettes (TTL 24h)
`getRecipeInformation` vérifie d'abord `recipes_cache`. Si expiré ou corrompu (try/catch JSON.parse), il rappelle l'API. Le cache inclut `title_fr`, `instructions_fr`, `ingredients` (JSON), `nutrition` (JSON).

### Calcul nutritionnel
1. `parseMeasure` extrait amount + unit de la mesure TheMealDB (fractions, mixtes, décimaux)
2. `toGrams` convertit en grammes (cup = 200g approximation volontaire)
3. Lookup dans CIQUAL : exact → nom contient clé → clé contient nom (>3 chars)
4. Division par `servings` → valeurs **par portion**
5. Dans `addToPlanning`, les valeurs stockées en DB sont **par portion**
6. Dans `PlanningScreen`, les totaux multiplient par `consumed_servings` → correct

### Migrations SQLite
Pattern try/catch pour ALTER TABLE (pas de système de versions). Sur install fraîche, le CREATE TABLE initial ne contient pas `ingredients`/`title_fr`/`instructions_fr` — ces colonnes sont ajoutées par les migrations ensuite.

### Traduction
- `translateIngredient` : dictionnaire statique FR→EN (exact match normalisé) pour la recherche
- `translateText` / `translateBatch` : MyMemory API, découpe les textes > 450 chars en phrases, batch de 3 avec 300ms de délai

## Problèmes connus / dette technique

### Bugs / Comportements inattendus
- **`initDatabase()` non attendu** (`App.tsx:10`) : l'init est async mais non awaited dans useEffect. Si un écran utilise la DB avant la fin de l'init, les tables pourraient ne pas exister encore.
- **`FavoritesScreen` ne localise pas les titres** : `getAllFavorites` ne récupère pas `title_fr`. Les favoris affichent toujours le titre anglais, même si `isFr = true`.
- **État "coché" de la liste de courses non persisté** : `ShoppingListScreen` remet à zéro les items cochés à chaque navigation.
- **`setErrorMsg` jamais appelé** dans `RecipeDetailScreen` catch block — l'état existe mais n'est pas utilisé en cas d'erreur réseau.

### Performance
- **`findNutrition` O(n²)** : deux boucles sur `Object.keys(CIQUAL)` par ingrédient. Pour 20 ingrédients × taille CIQUAL. Acceptable actuellement mais à optimiser si CIQUAL grandit.
- **Pas de `React.memo`** sur les items de FlatList (SearchScreen, FavoritesScreen).

### Type safety
- `as unknown as RecipeDetail` dans `recipes.ts:148` (reconstruction depuis le cache)
- `{ route }: any` dans `TabNavigator` (RootNavigator.tsx:31)
- `width: ... as any` dans PlanningScreen (pourcentages StyleSheet)

### UX / Fonctionnel
- Niveau d'activité physique fixé à 1.55 (modéré) — non configurable par l'utilisateur
- `getWeekDays()` calculé au mount — l'app ouverte à minuit n'actualise pas la semaine sans redémarrage
- La recherche n'utilise que le **premier ingrédient** pour filtrer sur TheMealDB (limite de l'API), les autres servent au scoring côté client

## Prochaines fonctionnalités prioritaires (backlog)

1. **Persistance des items cochés** dans la liste de courses (SQLite ou AsyncStorage)
2. **Titre FR dans les favoris** — ajouter `title_fr` dans `getAllFavorites`
3. **Niveau d'activité configurable** dans le profil (sédentaire → très actif)
4. **Await initDatabase** avant le premier rendu (splash screen ou état loading)
5. **Système de migrations versionné** pour remplacer les try/catch ALTER TABLE
6. **Recherche par nom de recette** en complément de la recherche par ingrédients

## Commandes utiles

```bash
npm start          # Lance le serveur Expo (scan QR avec Expo Go)
npm run android    # Lance sur émulateur Android
npm run ios        # Lance sur simulateur iOS
```
