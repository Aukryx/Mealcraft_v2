import { UserProfileRow } from '../types/database';

// Formule de Mifflin-St Jeor
const calculateBMR = (profile: UserProfileRow): number => {
  const { sex, age, weight_kg, height_cm } = profile;
  if (sex === 'male') {
    return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
  } else {
    return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;
  }
};

// Activité modérée (PAL 1.55) — bon compromis par défaut
export const calculateTDEE = (profile: UserProfileRow): number => {
  return Math.round(calculateBMR(profile) * 1.55);
};

export interface NutritionGoals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

// Répartition des macros selon l'objectif
export const calculateGoals = (profile: UserProfileRow): NutritionGoals => {
  const tdee = calculateTDEE(profile);

  const calorieTargets = {
    loss:     tdee - 400,
    maintain: tdee,
    gain:     tdee + 300,
  };

  const calories = calorieTargets[profile.goal];

  // Répartition standard : 30% prot / 40% glucides / 30% lipides
  return {
    calories,
    protein_g: Math.round((calories * 0.30) / 4),
    carbs_g:   Math.round((calories * 0.40) / 4),
    fat_g:     Math.round((calories * 0.30) / 9),
  };
};
