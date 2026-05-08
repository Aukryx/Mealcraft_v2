import { db, getQuests, upsertQuestRow, setQuestProgress, markQuestClaimed, getUserProfile } from '../database/db';
import { creditQuestZests } from './creditManager';
import { toLocalDateString } from './dateUtils';
import { calculateGoals } from './tdee';
import { QuestRow } from '../types/database';

const getWeekStart = (): string => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return toLocalDateString(monday);
};

const getWeekEnd = (): string => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + diff);
  return toLocalDateString(sunday);
};

const QUEST_DEFS: Omit<QuestRow, 'current_count' | 'expires_at' | 'completed_at' | 'claimed_at'>[] = [
  {
    id: 'daily_plan_meal',
    type: 'daily',
    label: "Planifie un repas aujourd'hui",
    target_count: 1,
    reward_zests: 5,
  },
  {
    id: 'daily_streak_3',
    type: 'daily',
    label: "Ouvre l'app 3 jours de suite",
    target_count: 3,
    reward_zests: 10,
  },
  {
    id: 'weekly_plan_5meals',
    type: 'weekly',
    label: 'Planifie 5 repas cette semaine',
    target_count: 5,
    reward_zests: 30,
  },
  {
    id: 'weekly_calorie_goal',
    type: 'weekly',
    label: "Atteins ton objectif calorique 2 fois",
    target_count: 2,
    reward_zests: 20,
  },
];

// --- Helpers de comptage ---

const countPlanningRows = async (start: string, end: string): Promise<number> => {
  const row = await db.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM planning WHERE date BETWEEN ? AND ?',
    [start, end]
  );
  return row?.cnt ?? 0;
};

// Jours cette semaine où les calories planifiées atteignent ≥80% de l'objectif TDEE
const countCalorieGoalDays = async (weekStart: string, weekEnd: string): Promise<number> => {
  try {
    const profile = await getUserProfile();
    if (!profile) return 0;

    const goals = calculateGoals(profile);
    const threshold = goals.calories * 0.8;

    const rows = await db.getAllAsync<{ date: string; total_cal: number }>(`
      SELECT date, SUM(calories * consumed_servings) as total_cal
      FROM planning
      WHERE date BETWEEN ? AND ?
      GROUP BY date
    `, [weekStart, weekEnd]);

    return rows.filter(r => r.total_cal >= threshold).length;
  } catch {
    return 0;
  }
};

// --- Streak (ouvrir l'app N jours consécutifs) ---

export const trackDailyOpen = async (): Promise<void> => {
  try {
    const today = toLocalDateString(new Date());
    const yesterday = toLocalDateString(new Date(Date.now() - 86_400_000));

    const [lastOpenRow, streakRow] = await Promise.all([
      db.getFirstAsync<{ value: string }>("SELECT value FROM app_settings WHERE key = 'last_open_date'"),
      db.getFirstAsync<{ value: string }>("SELECT value FROM app_settings WHERE key = 'streak_count'"),
    ]);

    const lastOpen = lastOpenRow?.value;
    if (lastOpen === today) return; // Déjà compté aujourd'hui

    const streak = parseInt(streakRow?.value ?? '0');
    const newStreak = lastOpen === yesterday ? streak + 1 : 1;

    await Promise.all([
      db.runAsync("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('last_open_date', ?)", [today]),
      db.runAsync("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('streak_count', ?)", [String(newStreak)]),
    ]);
  } catch (error) {
    console.error('❌ Erreur trackDailyOpen:', error);
  }
};

const getStreakCount = async (): Promise<number> => {
  try {
    const today = toLocalDateString(new Date());
    const yesterday = toLocalDateString(new Date(Date.now() - 86_400_000));

    const [lastOpenRow, streakRow] = await Promise.all([
      db.getFirstAsync<{ value: string }>("SELECT value FROM app_settings WHERE key = 'last_open_date'"),
      db.getFirstAsync<{ value: string }>("SELECT value FROM app_settings WHERE key = 'streak_count'"),
    ]);

    const lastOpen = lastOpenRow?.value;
    if (lastOpen !== today && lastOpen !== yesterday) return 0;
    return parseInt(streakRow?.value ?? '0');
  } catch {
    return 0;
  }
};

// --- Init & sync ---

export const initQuests = async (): Promise<void> => {
  try {
    const today = toLocalDateString(new Date());
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

    const [dailyMeal, weeklyMeals, streakCount, calorieGoalDays] = await Promise.all([
      countPlanningRows(today, today),
      countPlanningRows(weekStart, weekEnd),
      getStreakCount(),
      countCalorieGoalDays(weekStart, weekEnd),
    ]);

    const counts: Record<string, number> = {
      daily_plan_meal: dailyMeal,
      daily_streak_3: streakCount,
      weekly_plan_5meals: weeklyMeals,
      weekly_calorie_goal: calorieGoalDays,
    };

    const expiry: Record<string, string> = {
      daily_plan_meal: today,
      daily_streak_3: today,
      weekly_plan_5meals: weekEnd,
      weekly_calorie_goal: weekEnd,
    };

    const existing = await getQuests();
    const existingMap = new Map(existing.map(q => [q.id, q]));

    for (const def of QUEST_DEFS) {
      const row = existingMap.get(def.id);
      const newExpiry = expiry[def.id];
      const count = counts[def.id];
      const isCompleted = count >= def.target_count;

      if (!row || row.expires_at < today) {
        await upsertQuestRow({
          ...def,
          current_count: count,
          expires_at: newExpiry,
          completed_at: isCompleted ? today : null,
          claimed_at: null,
        });
        continue;
      }

      if (row.claimed_at) continue;

      const completedAt = isCompleted ? (row.completed_at ?? today) : null;
      await setQuestProgress(def.id, count, completedAt);
    }
  } catch (error) {
    console.error('❌ Erreur initQuests:', error);
  }
};

export const claimQuest = async (id: string): Promise<number> => {
  const quests = await getQuests();
  const quest = quests.find(q => q.id === id);

  if (!quest || !quest.completed_at || quest.claimed_at) return -1;

  const today = toLocalDateString(new Date());
  await markQuestClaimed(id, today);
  return creditQuestZests(quest.reward_zests);
};

export { getQuests };
