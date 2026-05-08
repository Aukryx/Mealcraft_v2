import { CIQUAL, CiqualEntry } from '../data/ciqualNutrition';

// --- Parsing des mesures TheMealDB ---

const SKIP_MEASURES = /^(to taste|for garnish|garnish|optional|as needed|season|a pinch|some|a few)/i;

export const parseMeasure = (measure: string): { amount: number; unit: string } => {
  const s = measure?.trim() ?? '';
  if (!s || SKIP_MEASURES.test(s)) return { amount: 0, unit: '' };

  // Nombre mixte : "1 1/2"
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)/);
  if (mixed) {
    const amount = parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]);
    const unit = s.slice(mixed[0].length).trim().match(/^([a-zA-Z]+)/)?.[1] ?? '';
    return { amount, unit };
  }

  // Fraction seule : "3/4"
  const frac = s.match(/^(\d+)\/(\d+)/);
  if (frac) {
    const amount = parseInt(frac[1]) / parseInt(frac[2]);
    const unit = s.slice(frac[0].length).trim().match(/^([a-zA-Z]+)/)?.[1] ?? '';
    return { amount, unit };
  }

  // Nombre décimal ou entier : "200", "1.5"
  const num = s.match(/^(\d+(?:\.\d+)?)/);
  if (num) {
    const amount = parseFloat(num[1]);
    const unit = s.slice(num[0].length).trim().match(/^([a-zA-Z]+)/)?.[1] ?? '';
    return { amount, unit };
  }

  return { amount: 0, unit: '' };
};

export const toGrams = (amount: number, unit: string): number => {
  if (amount <= 0) return 0;
  const u = unit.toLowerCase().replace(/s$/, ''); // enlève le pluriel

  switch (u) {
    case 'g':
    case 'gram':
    case 'gramme':
      return amount;
    case 'kg':
    case 'kilogram':
      return amount * 1000;
    case 'oz':
    case 'ounce':
      return amount * 28.35;
    case 'lb':
    case 'lbs':
    case 'pound':
      return amount * 453.59;
    case 'cup':
      return amount * 200; // approximation (eau=240g, farine=120g → moyenne 200g)
    case 'tablespoon':
    case 'tbsp':
    case 'tbs':
      return amount * 15;
    case 'teaspoon':
    case 'tsp':
      return amount * 5;
    case 'ml':
    case 'milliliter':
    case 'millilitre':
      return amount; // ≈ 1g/ml
    case 'l':
    case 'liter':
    case 'litre':
      return amount * 1000;
    case 'pinch':
      return amount * 0.5;
    default:
      return 0;
  }
};

// --- Recherche dans CIQUAL ---

export const findNutrition = (name: string): CiqualEntry | null => {
  const lower = name.toLowerCase().trim();

  // 1. Correspondance exacte
  if (CIQUAL[lower]) return CIQUAL[lower];

  // 2. Le nom contient une clé connue (ex: "chicken breast fillet" → "chicken breast")
  for (const key of Object.keys(CIQUAL)) {
    if (lower.includes(key)) return CIQUAL[key];
  }

  // 3. Une clé contient le nom (ex: "salmon" dans "smoked salmon")
  for (const key of Object.keys(CIQUAL)) {
    if (key.includes(lower) && lower.length > 3) return CIQUAL[key];
  }

  return null;
};

// --- Calcul nutritionnel complet ---

export interface NutritionResult {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const calculateRecipeNutrition = (
  ingredients: { name: string; measure: string }[],
  servings: number
): NutritionResult => {
  let total = { cal: 0, prot: 0, carbs: 0, fat: 0 };

  for (const ing of ingredients) {
    const nutrition = findNutrition(ing.name);
    if (!nutrition) continue;

    const { amount, unit } = parseMeasure(ing.measure);
    const grams = toGrams(amount, unit);
    if (grams <= 0) continue;

    const factor = grams / 100;
    total.cal   += nutrition.cal   * factor;
    total.prot  += nutrition.prot  * factor;
    total.carbs += nutrition.carbs * factor;
    total.fat   += nutrition.fat   * factor;
  }

  const s = Math.max(servings, 1);
  return {
    calories: Math.round(total.cal   / s),
    protein:  Math.round(total.prot  / s),
    carbs:    Math.round(total.carbs / s),
    fat:      Math.round(total.fat   / s),
  };
};
