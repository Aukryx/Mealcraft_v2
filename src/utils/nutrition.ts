/**
 * Extrait la valeur numérique d'une chaîne (ex: "450 kcal" -> 450)
 * Gère les entiers, les décimaux, les undefined et les nombres purs.
 */
export const normalizeNutrientValue = (value: string | number | undefined | null): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;

  // Regex pour capturer les nombres (incluant les points décimaux)
  const matches = value.match(/(\d+(\.\d+)?)/);
  return matches ? parseFloat(matches[0]) : 0;
};