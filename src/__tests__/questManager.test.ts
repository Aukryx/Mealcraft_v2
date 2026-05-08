jest.mock('../database/db', () => ({
  db: {
    runAsync: jest.fn().mockResolvedValue(undefined),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    getAllAsync: jest.fn().mockResolvedValue([]),
  },
  getQuests: jest.fn().mockResolvedValue([]),
  upsertQuestRow: jest.fn().mockResolvedValue(undefined),
  setQuestProgress: jest.fn().mockResolvedValue(undefined),
  markQuestClaimed: jest.fn().mockResolvedValue(undefined),
  getUserProfile: jest.fn().mockResolvedValue(null),
}));

jest.mock('../utils/creditManager', () => ({
  creditQuestZests: jest.fn().mockResolvedValue(50),
}));

jest.mock('../utils/xpManager', () => ({
  addQuestXP: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../utils/tdee', () => ({
  calculateGoals: jest.fn().mockReturnValue({ calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 67 }),
}));

import { db, getQuests, upsertQuestRow, setQuestProgress, markQuestClaimed, getUserProfile } from '../database/db';
import { creditQuestZests } from '../utils/creditManager';
import { trackDailyOpen, claimQuest, initQuests } from '../utils/questManager';

const pad = (n: number) => String(n).padStart(2, '0');
const dateStr = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const today = dateStr(new Date());
const yesterday = dateStr(new Date(Date.now() - 86_400_000));
const twoDaysAgo = dateStr(new Date(Date.now() - 2 * 86_400_000));

const mock = (fn: unknown) => fn as jest.Mock;

beforeEach(() => jest.clearAllMocks());

// ─── trackDailyOpen ────────────────────────────────────────────────────────

describe('trackDailyOpen', () => {
  it('initialise le streak à 1 au premier lancement', async () => {
    mock(db.getFirstAsync)
      .mockResolvedValueOnce(null)   // last_open_date absent
      .mockResolvedValueOnce(null);  // streak_count absent

    await trackDailyOpen();

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('last_open_date'), [today]
    );
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('streak_count'), ['1']
    );
  });

  it('incrémente le streak si ouverture le lendemain', async () => {
    mock(db.getFirstAsync)
      .mockResolvedValueOnce({ value: yesterday })
      .mockResolvedValueOnce({ value: '4' });

    await trackDailyOpen();

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('streak_count'), ['5']
    );
  });

  it('remet le streak à 1 si ouverture non consécutive', async () => {
    mock(db.getFirstAsync)
      .mockResolvedValueOnce({ value: twoDaysAgo })
      .mockResolvedValueOnce({ value: '7' });

    await trackDailyOpen();

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('streak_count'), ['1']
    );
  });

  it('ne fait rien si l\'app a déjà été ouverte aujourd\'hui', async () => {
    mock(db.getFirstAsync)
      .mockResolvedValueOnce({ value: today })
      .mockResolvedValueOnce({ value: '3' });

    await trackDailyOpen();

    expect(db.runAsync).not.toHaveBeenCalled();
  });

  it('met à jour la date de dernière ouverture', async () => {
    mock(db.getFirstAsync)
      .mockResolvedValueOnce({ value: yesterday })
      .mockResolvedValueOnce({ value: '2' });

    await trackDailyOpen();

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('last_open_date'), [today]
    );
  });
});

// ─── claimQuest ────────────────────────────────────────────────────────────

describe('claimQuest', () => {
  const baseQuest = {
    id: 'daily_plan_meal',
    type: 'daily' as const,
    label: 'Planifie un repas',
    target_count: 1,
    current_count: 1,
    reward_zests: 5,
    expires_at: today,
    completed_at: today,
    claimed_at: null,
  };

  it('réclame et crédite les Zests si la quête est complétée', async () => {
    mock(getQuests).mockResolvedValueOnce([baseQuest]);
    mock(creditQuestZests).mockResolvedValueOnce(50);

    const result = await claimQuest('daily_plan_meal');

    expect(markQuestClaimed).toHaveBeenCalledWith('daily_plan_meal', today);
    expect(creditQuestZests).toHaveBeenCalledWith(5);
    expect(result).toBe(50);
  });

  it('retourne -1 si la quête est introuvable', async () => {
    mock(getQuests).mockResolvedValueOnce([]);

    const result = await claimQuest('daily_plan_meal');

    expect(result).toBe(-1);
    expect(markQuestClaimed).not.toHaveBeenCalled();
  });

  it('retourne -1 si la quête n\'est pas complétée', async () => {
    mock(getQuests).mockResolvedValueOnce([{ ...baseQuest, completed_at: null }]);

    const result = await claimQuest('daily_plan_meal');

    expect(result).toBe(-1);
    expect(creditQuestZests).not.toHaveBeenCalled();
  });

  it('retourne -1 si la quête est déjà réclamée', async () => {
    mock(getQuests).mockResolvedValueOnce([{ ...baseQuest, claimed_at: today }]);

    const result = await claimQuest('daily_plan_meal');

    expect(result).toBe(-1);
    expect(creditQuestZests).not.toHaveBeenCalled();
  });

  it('crédite le bon montant selon la quête', async () => {
    const weeklyQuest = { ...baseQuest, id: 'weekly_plan_5meals', reward_zests: 30 };
    mock(getQuests).mockResolvedValueOnce([weeklyQuest]);

    await claimQuest('weekly_plan_5meals');

    expect(creditQuestZests).toHaveBeenCalledWith(30);
  });
});

// ─── initQuests ────────────────────────────────────────────────────────────

describe('initQuests', () => {
  const PAST = '2020-01-01';
  const ALL_IDS = ['daily_plan_meal', 'daily_streak_3', 'weekly_plan_5meals', 'weekly_calorie_goal'];

  // Reconstruit les 4 mockResolvedValueOnce attendus par initQuests
  // (countPlanningRows daily, countPlanningRows weekly, streak last_open, streak count)
  const setupCounts = ({ daily = 0, weekly = 0, streak = 0 } = {}) => {
    mock(db.getFirstAsync)
      .mockResolvedValueOnce({ cnt: daily })
      .mockResolvedValueOnce({ cnt: weekly })
      .mockResolvedValueOnce(streak > 0 ? { value: today } : null)
      .mockResolvedValueOnce(streak > 0 ? { value: String(streak) } : null);
  };

  const TARGETS: Record<string, number> = {
    daily_plan_meal: 1, daily_streak_3: 3, weekly_plan_5meals: 5, weekly_calorie_goal: 2,
  };

  const makeQuestRow = (id: string, overrides: Record<string, unknown> = {}) => ({
    id,
    type: id.startsWith('daily') ? 'daily' : 'weekly',
    label: `Quest ${id}`,
    target_count: TARGETS[id],
    current_count: 0,
    reward_zests: 5,
    expires_at: today,
    completed_at: null,
    claimed_at: null,
    ...overrides,
  });

  beforeEach(() => {
    jest.resetAllMocks();
    mock(db.runAsync).mockResolvedValue(undefined);
    mock(db.getFirstAsync).mockResolvedValue(null);
    mock(db.getAllAsync).mockResolvedValue([]);
    mock(getQuests).mockResolvedValue([]);
    mock(upsertQuestRow).mockResolvedValue(undefined);
    mock(setQuestProgress).mockResolvedValue(undefined);
    mock(markQuestClaimed).mockResolvedValue(undefined);
    mock(getUserProfile).mockResolvedValue(null);
  });

  it('crée toutes les quêtes si aucune n\'existe en DB', async () => {
    setupCounts();
    mock(getQuests).mockResolvedValueOnce([]);

    await initQuests();

    expect(upsertQuestRow).toHaveBeenCalledTimes(4);
  });

  it('remet à zéro une quête expirée avec upsertQuestRow', async () => {
    setupCounts({ daily: 1 });
    mock(getQuests).mockResolvedValueOnce([makeQuestRow('daily_plan_meal', { expires_at: PAST })]);

    await initQuests();

    // daily_plan_meal expirée → upsert ; 3 autres inexistantes → upsert
    expect(upsertQuestRow).toHaveBeenCalledTimes(4);
    // setQuestProgress ne doit pas être appelé pour la quête expirée
    expect(setQuestProgress).not.toHaveBeenCalled();
  });

  it('met à jour la progression des quêtes valides non réclamées', async () => {
    setupCounts({ daily: 0, weekly: 3, streak: 2 });
    mock(getQuests).mockResolvedValueOnce(ALL_IDS.map(id => makeQuestRow(id)));

    await initQuests();

    expect(setQuestProgress).toHaveBeenCalledTimes(4);
    expect(upsertQuestRow).not.toHaveBeenCalled();
  });

  it('ignore les quêtes déjà réclamées', async () => {
    setupCounts({ daily: 1 });
    mock(getQuests).mockResolvedValueOnce(
      ALL_IDS.map(id => makeQuestRow(id, id === 'daily_plan_meal' ? { claimed_at: today } : {}))
    );

    await initQuests();

    expect(setQuestProgress).not.toHaveBeenCalledWith('daily_plan_meal', expect.anything(), expect.anything());
    expect(setQuestProgress).toHaveBeenCalledTimes(3);
  });

  it('marque complète si count atteint la cible', async () => {
    setupCounts({ daily: 1 }); // daily_plan_meal target = 1
    mock(getQuests).mockResolvedValueOnce([makeQuestRow('daily_plan_meal')]);

    await initQuests();

    expect(setQuestProgress).toHaveBeenCalledWith('daily_plan_meal', 1, today);
  });

  it('ne marque pas complète si count inférieur à la cible', async () => {
    setupCounts({ weekly: 3 }); // weekly_plan_5meals target = 5, count = 3
    mock(getQuests).mockResolvedValueOnce([makeQuestRow('weekly_plan_5meals')]);

    await initQuests();

    expect(setQuestProgress).toHaveBeenCalledWith('weekly_plan_5meals', 3, null);
  });

  it('insère avec completed_at si une quête fraîche est immédiatement atteinte', async () => {
    setupCounts({ daily: 1 });
    mock(getQuests).mockResolvedValueOnce([]);

    await initQuests();

    expect(upsertQuestRow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'daily_plan_meal', completed_at: today })
    );
  });
});
