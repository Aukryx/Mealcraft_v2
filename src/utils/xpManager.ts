import { db, addXP, setPlanningStreak } from '../database/db';
import { toLocalDateString } from './dateUtils';

export const LEVELS = [
  { level: 1, minXP: 0,    title: 'Cuisinier Novice' },
  { level: 2, minXP: 50,   title: 'Apprenti Chef' },
  { level: 3, minXP: 150,  title: 'Sous-Chef' },
  { level: 4, minXP: 400,  title: 'Chef Confirmé' },
  { level: 5, minXP: 1000, title: 'Chef Étoilé' },
] as const;

export interface LevelInfo {
  level: number;
  title: string;
  xp: number;
  currentLevelXP: number;
  nextLevelXP: number | null;
  progress: number;
}

export const getLevelInfo = (xp: number): LevelInfo => {
  let current: typeof LEVELS[number] = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.minXP) current = lvl;
  }
  const nextLvl = LEVELS.find(l => l.level === current.level + 1) ?? null;
  const progress = nextLvl
    ? (xp - current.minXP) / (nextLvl.minXP - current.minXP)
    : 1;
  return {
    level: current.level,
    title: current.title,
    xp,
    currentLevelXP: current.minXP,
    nextLevelXP: nextLvl?.minXP ?? null,
    progress: Math.min(1, progress),
  };
};

// +1 XP par repas planifié + bonus streak (newStreak × 2) si nouveau jour
export const addMealXP = async (): Promise<void> => {
  try {
    const today = toLocalDateString(new Date());
    const yesterday = toLocalDateString(new Date(Date.now() - 86_400_000));

    const row = await db.getFirstAsync<{ last_planning_date: string | null; streak_days: number }>(
      'SELECT last_planning_date, streak_days FROM user_profile WHERE id = 1'
    );

    let streakBonus = 0;
    if (row && row.last_planning_date !== today) {
      const newStreak = row.last_planning_date === yesterday ? row.streak_days + 1 : 1;
      await setPlanningStreak(newStreak, today);
      streakBonus = newStreak * 2;
    }

    await addXP(1 + streakBonus);
  } catch (error) {
    console.error('❌ Erreur addMealXP:', error);
  }
};

// +5 XP par quête réclamée
export const addQuestXP = async (): Promise<void> => {
  await addXP(5);
};
