import { calculateTDEE, calculateGoals } from '../utils/tdee';
import { UserProfileRow } from '../types/database';

const baseProfile: UserProfileRow = {
  id: 1,
  sex: 'male',
  age: 30,
  weight_kg: 80,
  height_cm: 180,
  goal: 'maintain',
  activity: 'moderate',
};

describe('calculateTDEE', () => {
  it('calcule correctement pour un homme modérément actif', () => {
    // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    // TDEE = 1780 * 1.55 = 2759
    expect(calculateTDEE(baseProfile)).toBe(2759);
  });

  it('calcule correctement pour une femme', () => {
    const female = { ...baseProfile, sex: 'female' as const };
    // BMR = 10*80 + 6.25*180 - 5*30 - 161 = 1619 - 161 = 1614
    // TDEE = 1614 * 1.55 = 2502 (arrondi)
    expect(calculateTDEE(female)).toBe(Math.round(1614 * 1.55));
  });

  it('un profil sédentaire dépense moins qu\'un profil actif', () => {
    const sedentary = { ...baseProfile, activity: 'sedentary' as const };
    const active    = { ...baseProfile, activity: 'active' as const };
    expect(calculateTDEE(sedentary)).toBeLessThan(calculateTDEE(active));
  });

  it('une personne plus lourde a un TDEE plus élevé', () => {
    const light  = { ...baseProfile, weight_kg: 60 };
    const heavy  = { ...baseProfile, weight_kg: 100 };
    expect(calculateTDEE(light)).toBeLessThan(calculateTDEE(heavy));
  });

  it('une personne plus âgée a un TDEE plus faible', () => {
    const young = { ...baseProfile, age: 20 };
    const old   = { ...baseProfile, age: 60 };
    expect(calculateTDEE(young)).toBeGreaterThan(calculateTDEE(old));
  });
});

describe('calculateGoals', () => {
  it('renvoie les calories TDEE pour l\'objectif "maintain"', () => {
    const tdee = calculateTDEE(baseProfile);
    const goals = calculateGoals(baseProfile);
    expect(goals.calories).toBe(tdee);
  });

  it('déficit de 400 kcal pour l\'objectif "loss"', () => {
    const loss = calculateGoals({ ...baseProfile, goal: 'loss' });
    const maintain = calculateGoals(baseProfile);
    expect(maintain.calories - loss.calories).toBe(400);
  });

  it('surplus de 300 kcal pour l\'objectif "gain"', () => {
    const gain = calculateGoals({ ...baseProfile, goal: 'gain' });
    const maintain = calculateGoals(baseProfile);
    expect(gain.calories - maintain.calories).toBe(300);
  });

  it('les macros couvrent environ 100% des calories (±5% pour les arrondis)', () => {
    const goals = calculateGoals(baseProfile);
    const fromMacros =
      goals.protein_g * 4 +
      goals.carbs_g   * 4 +
      goals.fat_g     * 9;
    const ratio = fromMacros / goals.calories;
    expect(ratio).toBeGreaterThan(0.95);
    expect(ratio).toBeLessThan(1.05);
  });

  it('retourne des valeurs positives pour tous les profils extrêmes', () => {
    const extreme: UserProfileRow = {
      ...baseProfile, sex: 'female', age: 80, weight_kg: 45, height_cm: 150, goal: 'loss', activity: 'sedentary'
    };
    const goals = calculateGoals(extreme);
    expect(goals.calories).toBeGreaterThan(0);
    expect(goals.protein_g).toBeGreaterThan(0);
    expect(goals.carbs_g).toBeGreaterThan(0);
    expect(goals.fat_g).toBeGreaterThan(0);
  });
});
