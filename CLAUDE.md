# MealCraft v2 — Guide pour Claude

## Vue d'ensemble

Application React Native (Expo) de gestion de repas :
- Recherche de recettes par ingrédients → **TheMealDB API** (gratuite, sans clé)
- Traduction FR↔EN → **MyMemory API** (gratuite, sans clé, rate-limit ~300ms/batch)
- Nutrition calculée **localement** depuis les données ANSES CIQUAL (`src/data/ciqualNutrition.ts`)
- Persistance locale **SQLite** via `expo-sqlite`
- Navigation : Stack (Welcome → MainTabs/RecipeDetail/ShoppingList) + Bottom Tabs (Search/Planning/Favorites/Profile)
- **Monétisation** : Zests (monnaie virtuelle) — recherche gratuite, planning = 10 Zests/ajout

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
  components/
    CreditModal.tsx       # Modal "Zests insuffisants" (pub / premium)
  context/LanguageContext.tsx  # Contexte FR/EN persisté en DB
  database/db.ts          # Schéma SQLite + toutes les fonctions DB
  navigation/RootNavigator.tsx
  screens/
    WelcomeScreen.tsx     # Onboarding (une seule fois)
    SearchScreen.tsx      # Recherche par ingrédients (GRATUIT)
    RecipeDetailScreen.tsx # Détail + ajout au planning (10 Zests)
    PlanningScreen.tsx    # Semaine courante + totaux nutritionnels
    FavoritesScreen.tsx   # Liste des favoris
    ShoppingListScreen.tsx # Liste de courses générée depuis le planning
    ProfileScreen.tsx     # Profil utilisateur + objectifs TDEE + solde Zests
  types/
    api.ts                # SearchResult, RecipeDetail
    database.ts           # RecipeCacheRow, PlanningRow, UserProfileRow, ...
  utils/
    creditManager.ts      # Gestion Zests : quota, débit, crédit pub/premium
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

### Système de monétisation — Zests

`src/utils/creditManager.ts` centralise toute la logique de crédits.

| Constante | Valeur | Rôle |
|---|---|---|
| `SEARCH_COST` | 0 | Recherche gratuite (top-of-funnel) |
| `PLANNING_COST` | 10 | Coût d'un ajout au planning |
| `DAILY_FREE_QUOTA` | 20 | Quota gratuit quotidien (≈ 2 plannings/jour) |
| `PREMIUM_DAILY_CAP` | 500 | Soft cap Premium |
| `REWARDED_AD_CREDIT` | 10 | Zests gagnés par pub regardée |

**Reset quotidien** : `getZestBalance()` compare `last_reset_date` à `today`. Si différent → reset au quota du tier. Pattern idempotent, sans cron.

**Débit planning** (`confirmAddToPlanning` dans `RecipeDetailScreen`) :
1. Vérification solde (`zestBalance < PLANNING_COST`)
2. Si insuffisant → ferme la modal planning, ouvre `CreditModal`
3. Si suffisant → `debitZests(10)` → `addToPlanning()`

**Pub simulée** : `watchRewardedAd()` dans `creditManager.ts` crédite immédiatement 10 Zests. Pour la prod, brancher la lib AdMob (`react-native-google-mobile-ads`) et appeler `creditZests(REWARDED_AD_CREDIT)` dans le callback `onEarnedReward`.

**Colonnes DB ajoutées à `user_profile`** :
- `balance_zests INTEGER DEFAULT 20`
- `is_premium INTEGER DEFAULT 0`
- `last_reset_date TEXT`

**Table `api_cache`** : prête pour Spoonacular (`query_hash TEXT PK`, `response_json TEXT`, `timestamp INTEGER`). Non utilisée avec TheMealDB.

**Fix critique** : `saveUserProfile` utilisait `INSERT OR REPLACE` qui réinitialisait les Zests. Remplacé par `ON CONFLICT(id) DO UPDATE SET` pour ne toucher que les colonnes profil.

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
Pattern try/catch pour ALTER TABLE (pas de système de versions). Sur install fraîche, le CREATE TABLE initial crée les colonnes de base ; les migrations ajoutent les nouvelles colonnes pour les utilisateurs existants.

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
- `getWeekDays()` calculé au mount — l'app ouverte à minuit n'actualise pas la semaine sans redémarrage
- La recherche n'utilise que le **premier ingrédient** pour filtrer sur TheMealDB (limite de l'API), les autres servent au scoring côté client
- Pub rewarded simulée (pas de lib AdMob réelle intégrée)
- Pas d'in-app purchase réel pour le Premium (toggle DB direct en dev)

## Backlog priorisé

### Court terme
1. **Tests unitaires** — Jest sur les fonctions pures (nutritionCalc, creditManager, translate)
2. **Intégration AdMob réelle** — remplacer `watchRewardedAd()` par `react-native-google-mobile-ads`
3. **Fix `setErrorMsg`** — le brancher dans le catch block de RecipeDetailScreen
4. **Fix type `{ route }: any`** — typer correctement TabNavigator dans RootNavigator

### Moyen terme
5. **Système de Quêtes** (Phase 1 gamification, faisable 100% local)
   - Table `quests` : `id, type, label, target_count, current_count, reward_zests, expires_at, completed_at`
   - Quêtes quotidiennes : "Planifie un repas" (+5 Zests), "Ouvre l'app 3 jours de suite" (+10 Zests)
   - Quêtes hebdo : "Complète ton planning 5 jours" (+30 Zests), "Atteins ton objectif calorique 2 fois" (+20 Zests)
   - Cap anti-farm : max 200 Zests stockés pour les gratuits
   - Péremption : Zests de quêtes expirent après 30j (champ `earned_type: 'quest'|'purchased'`)
   - Composant `QuestList.tsx` dans ProfileScreen
6. **Système de niveaux** (Phase 2 gamification)
   - XP calculée depuis : nombre de plannings + quêtes complétées + streak
   - Badge "niveau" dans ProfileScreen : Cuisinier Novice → Sous-chef → Chef Étoilé
   - Streak de jours consécutifs avec au moins un repas planifié
7. **"Créer ma recette"** — formulaire local → SQLite + récompense Zests pour réduire la dépendance API
8. **Affiliation GMS** — champ `product_url` nullable dans ShoppingList, liens Amazon Associates en PoC

### Long terme
9. **Migration Spoonacular** — `api_cache` déjà prête (query_hash/response_json/timestamp). Nécessite clé API payante. À faire après validation du modèle économique avec de vrais utilisateurs.
10. **Cosmétiques minimalistes** — couleurs d'accent thémées (1 seul token dynamique, pas de refactor complet StyleSheet) + avatar parmi 5-6 emojis/SVG statiques. Seulement si les métriques de rétention le justifient.
11. **Backend Premium (IAP)** — RevenueCat ou Stripe pour le vrai flux d'achat Premium

## État actuel (2026-05)

| Feature | Status |
|---|---|
| TheMealDB (recherche + détail) | ✅ En prod |
| Cache SQLite 24h | ✅ En prod |
| Traduction MyMemory FR↔EN | ✅ En prod |
| Planning hebdomadaire + nutrition CIQUAL | ✅ En prod |
| Liste de courses + cases persistées | ✅ En prod |
| Favoris avec titre FR | ✅ En prod |
| Profil TDEE + niveau d'activité | ✅ En prod |
| Système Zests + CreditModal | ✅ En prod (simulé) |
| Spoonacular | ❌ Non migré (table api_cache prête) |
| AdMob réel | ❌ Simulé uniquement |
| Tests | ❌ Aucun |
| Quêtes / Gamification | ❌ Backlog moyen terme |

## Commandes utiles

```bash
npm start          # Lance le serveur Expo (scan QR avec Expo Go)
npm run android    # Lance sur émulateur Android
npm run ios        # Lance sur simulateur iOS
```
