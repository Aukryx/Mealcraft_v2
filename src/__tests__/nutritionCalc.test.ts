import { parseMeasure, toGrams, findNutrition, calculateRecipeNutrition } from '../utils/nutritionCalc';

describe('parseMeasure', () => {
  it('parse un nombre entier avec unité', () => {
    expect(parseMeasure('200 g')).toEqual({ amount: 200, unit: 'g' });
  });

  it('parse un décimal', () => {
    expect(parseMeasure('1.5 tbsp')).toEqual({ amount: 1.5, unit: 'tbsp' });
  });

  it('parse une fraction seule', () => {
    expect(parseMeasure('3/4 tsp')).toEqual({ amount: 0.75, unit: 'tsp' });
  });

  it('parse un nombre mixte', () => {
    expect(parseMeasure('1 1/2 cup')).toEqual({ amount: 1.5, unit: 'cup' });
  });

  it('retourne zéro pour "to taste"', () => {
    expect(parseMeasure('to taste')).toEqual({ amount: 0, unit: '' });
  });

  it('retourne zéro pour une chaîne vide', () => {
    expect(parseMeasure('')).toEqual({ amount: 0, unit: '' });
  });

  it('parse sans unité (nombre seul)', () => {
    expect(parseMeasure('3')).toEqual({ amount: 3, unit: '' });
  });

  it('ignore la casse des mots-clés à ignorer', () => {
    expect(parseMeasure('For Garnish')).toEqual({ amount: 0, unit: '' });
  });
});

describe('toGrams', () => {
  it('retourne la valeur directe pour les grammes', () => {
    expect(toGrams(100, 'g')).toBe(100);
    expect(toGrams(100, 'gram')).toBe(100);
  });

  it('convertit les kilogrammes', () => {
    expect(toGrams(1, 'kg')).toBe(1000);
    expect(toGrams(0.5, 'kg')).toBe(500);
  });

  it('convertit les onces', () => {
    expect(toGrams(1, 'oz')).toBeCloseTo(28.35);
  });

  it('convertit les livres', () => {
    expect(toGrams(1, 'lb')).toBeCloseTo(453.59);
  });

  it('convertit les cups (approximation 200g)', () => {
    expect(toGrams(1, 'cup')).toBe(200);
    expect(toGrams(0.5, 'cup')).toBe(100);
  });

  it('convertit les cuillères à soupe', () => {
    expect(toGrams(1, 'tbsp')).toBe(15);
    expect(toGrams(1, 'tablespoon')).toBe(15);
  });

  it('convertit les cuillères à café', () => {
    expect(toGrams(1, 'tsp')).toBe(5);
    expect(toGrams(1, 'teaspoon')).toBe(5);
  });

  it('convertit les millilitres (≈ 1g/ml)', () => {
    expect(toGrams(250, 'ml')).toBe(250);
  });

  it('gère le pluriel (cups → cup)', () => {
    expect(toGrams(2, 'cups')).toBe(400);
    expect(toGrams(2, 'tbsps')).toBe(30);
  });

  it('retourne 0 pour une unité inconnue', () => {
    expect(toGrams(5, 'handful')).toBe(0);
  });

  it('retourne 0 si la quantité est 0 ou négative', () => {
    expect(toGrams(0, 'g')).toBe(0);
    expect(toGrams(-1, 'g')).toBe(0);
  });
});

describe('findNutrition', () => {
  it('trouve une correspondance exacte', () => {
    const result = findNutrition('chicken');
    expect(result).not.toBeNull();
    expect(result!.cal).toBeGreaterThan(0);
  });

  it('trouve une correspondance partielle (le nom contient la clé)', () => {
    const result = findNutrition('fresh tomatoes');
    expect(result).not.toBeNull();
  });

  it('retourne null pour un ingrédient inconnu', () => {
    expect(findNutrition('xyzabcunknown123')).toBeNull();
  });

  it('est insensible à la casse', () => {
    const lower = findNutrition('chicken');
    const upper = findNutrition('CHICKEN');
    expect(upper).toEqual(lower);
  });
});

describe('calculateRecipeNutrition', () => {
  it('retourne zéro si aucun ingrédient reconnu', () => {
    const result = calculateRecipeNutrition(
      [{ name: 'xyzunknown', measure: '100g' }],
      1
    );
    expect(result).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it('divise par le nombre de portions', () => {
    const single = calculateRecipeNutrition(
      [{ name: 'chicken', measure: '200g' }],
      1
    );
    const double = calculateRecipeNutrition(
      [{ name: 'chicken', measure: '200g' }],
      2
    );
    expect(single.calories).toBe(double.calories * 2);
    expect(single.protein).toBe(double.protein * 2);
  });

  it('retourne des entiers arrondis', () => {
    const result = calculateRecipeNutrition(
      [{ name: 'chicken', measure: '150g' }],
      1
    );
    expect(result.calories).toBe(Math.round(result.calories));
    expect(result.protein).toBe(Math.round(result.protein));
  });

  it('gère les mesures "to taste" sans planter', () => {
    const result = calculateRecipeNutrition(
      [
        { name: 'chicken', measure: '200g' },
        { name: 'salt', measure: 'to taste' },
      ],
      1
    );
    expect(result.calories).toBeGreaterThan(0);
  });

  it('utilise au minimum 1 portion même si servings=0', () => {
    const withZero = calculateRecipeNutrition(
      [{ name: 'chicken', measure: '100g' }],
      0
    );
    const withOne = calculateRecipeNutrition(
      [{ name: 'chicken', measure: '100g' }],
      1
    );
    expect(withZero).toEqual(withOne);
  });
});
