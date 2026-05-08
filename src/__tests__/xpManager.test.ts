jest.mock('../database/db', () => ({
  db: {
    getFirstAsync: jest.fn(),
  },
  addXP: jest.fn().mockResolvedValue(undefined),
  setPlanningStreak: jest.fn().mockResolvedValue(undefined),
}));

import { db, addXP, setPlanningStreak } from '../database/db';
import { getLevelInfo, addMealXP, addQuestXP, LEVELS } from '../utils/xpManager';

const mock = (fn: unknown) => fn as jest.Mock;

const pad = (n: number) => String(n).padStart(2, '0');
const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = dateStr(new Date());
const yesterday = dateStr(new Date(Date.now() - 86_400_000));
const twoDaysAgo = dateStr(new Date(Date.now() - 2 * 86_400_000));

beforeEach(() => {
  jest.resetAllMocks();
  mock(addXP).mockResolvedValue(undefined);
  mock(setPlanningStreak).mockResolvedValue(undefined);
  mock(db.getFirstAsync).mockResolvedValue(null);
});

// ─── getLevelInfo ──────────────────────────────────────────────────────────

describe('getLevelInfo', () => {
  it('retourne le niveau 1 pour 0 XP', () => {
    const info = getLevelInfo(0);
    expect(info.level).toBe(1);
    expect(info.title).toBe('Cuisinier Novice');
    expect(info.progress).toBe(0);
    expect(info.nextLevelXP).toBe(50);
  });

  it('reste au niveau 1 avec 49 XP', () => {
    const info = getLevelInfo(49);
    expect(info.level).toBe(1);
    expect(info.progress).toBeCloseTo(49 / 50);
  });

  it('passe au niveau 2 à exactement 50 XP', () => {
    const info = getLevelInfo(50);
    expect(info.level).toBe(2);
    expect(info.title).toBe('Apprenti Chef');
    expect(info.currentLevelXP).toBe(50);
    expect(info.nextLevelXP).toBe(150);
  });

  it('retourne niveau 3 avec 200 XP', () => {
    const info = getLevelInfo(200);
    expect(info.level).toBe(3);
    expect(info.title).toBe('Sous-Chef');
  });

  it('retourne niveau 5 (max) à 1000 XP', () => {
    const info = getLevelInfo(1000);
    expect(info.level).toBe(5);
    expect(info.title).toBe('Chef Étoilé');
    expect(info.nextLevelXP).toBeNull();
    expect(info.progress).toBe(1);
  });

  it('progress plafonné à 1 au niveau max', () => {
    expect(getLevelInfo(99999).progress).toBe(1);
  });

  it('progress correct au milieu d\'un palier', () => {
    // Niveau 2 : 50–150 → midpoint = 100 → progress = 0.5
    expect(getLevelInfo(100).progress).toBeCloseTo(0.5);
  });
});

// ─── addMealXP ─────────────────────────────────────────────────────────────

describe('addMealXP', () => {
  it('ajoute 1 XP + bonus streak (×2) pour un nouveau jour consécutif', async () => {
    mock(db.getFirstAsync).mockResolvedValueOnce({ last_planning_date: yesterday, streak_days: 2 });

    await addMealXP();

    // newStreak = 3 → bonus = 6 → total = 7
    expect(setPlanningStreak).toHaveBeenCalledWith(3, today);
    expect(addXP).toHaveBeenCalledWith(7);
  });

  it('ajoute seulement 1 XP si déjà planifié aujourd\'hui (streak inchangé)', async () => {
    mock(db.getFirstAsync).mockResolvedValueOnce({ last_planning_date: today, streak_days: 5 });

    await addMealXP();

    expect(setPlanningStreak).not.toHaveBeenCalled();
    expect(addXP).toHaveBeenCalledWith(1);
  });

  it('remet le streak à 1 si un jour a été sauté', async () => {
    mock(db.getFirstAsync).mockResolvedValueOnce({ last_planning_date: twoDaysAgo, streak_days: 4 });

    await addMealXP();

    // newStreak = 1 → bonus = 2 → total = 3
    expect(setPlanningStreak).toHaveBeenCalledWith(1, today);
    expect(addXP).toHaveBeenCalledWith(3);
  });

  it('démarre un streak à 1 au premier planification (last_planning_date null)', async () => {
    mock(db.getFirstAsync).mockResolvedValueOnce({ last_planning_date: null, streak_days: 0 });

    await addMealXP();

    expect(setPlanningStreak).toHaveBeenCalledWith(1, today);
    expect(addXP).toHaveBeenCalledWith(3); // 1 + 1*2
  });

  it('ne plante pas si getUserProfile retourne null', async () => {
    mock(db.getFirstAsync).mockResolvedValueOnce(null);

    await expect(addMealXP()).resolves.toBeUndefined();
    expect(addXP).toHaveBeenCalledWith(1);
  });
});

// ─── addQuestXP ────────────────────────────────────────────────────────────

describe('addQuestXP', () => {
  it('ajoute 5 XP', async () => {
    await addQuestXP();
    expect(addXP).toHaveBeenCalledWith(5);
  });
});
