jest.mock('../database/db', () => ({
  db: {
    runAsync: jest.fn().mockResolvedValue(undefined),
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn().mockResolvedValue([]),
    execAsync: jest.fn().mockResolvedValue(undefined),
  },
}));

import { db } from '../database/db';
import {
  getZestBalance,
  debitZests,
  creditZests,
  creditQuestZests,
  DAILY_FREE_QUOTA,
  FREE_BALANCE_CAP,
  PREMIUM_DAILY_CAP,
} from '../utils/creditManager';

const mock = (fn: unknown) => fn as jest.Mock;
const today = () => new Date().toISOString().slice(0, 10);
const FUTURE = '2099-12-31';
const PAST = '2020-01-01';

const fullRow = (overrides: Record<string, unknown> = {}) => ({
  balance_zests: 20,
  is_premium: 0,
  last_reset_date: today(),
  quest_zests: 0,
  quest_zests_expires_at: null,
  ...overrides,
});

beforeEach(() => {
  jest.resetAllMocks();
  mock(db.runAsync).mockResolvedValue(undefined);
  mock(db.getAllAsync).mockResolvedValue([]);
  mock(db.execAsync).mockResolvedValue(undefined);
});

// ─── getZestBalance ────────────────────────────────────────────────────────

describe('getZestBalance', () => {
  it('retourne DAILY_FREE_QUOTA si aucune ligne en DB', async () => {
    mock(db.getFirstAsync).mockResolvedValueOnce(null);
    expect(await getZestBalance()).toEqual({ balance: DAILY_FREE_QUOTA, isPremium: false });
  });

  it('retourne balance_zests + quest_zests valides', async () => {
    mock(db.getFirstAsync).mockResolvedValueOnce(
      fullRow({ balance_zests: 15, quest_zests: 30, quest_zests_expires_at: FUTURE })
    );
    expect((await getZestBalance()).balance).toBe(45);
  });

  it('remet balance_zests au quota quotidien si nouvelle journée', async () => {
    mock(db.getFirstAsync).mockResolvedValueOnce(
      fullRow({ balance_zests: 5, last_reset_date: PAST })
    );
    expect((await getZestBalance()).balance).toBe(DAILY_FREE_QUOTA);
  });

  it('le reset journalier n\'efface pas les quest_zests valides', async () => {
    mock(db.getFirstAsync).mockResolvedValueOnce(
      fullRow({ balance_zests: 5, last_reset_date: PAST, quest_zests: 30, quest_zests_expires_at: FUTURE })
    );
    expect((await getZestBalance()).balance).toBe(DAILY_FREE_QUOTA + 30);
  });

  it('expire les quest_zests si la date est dépassée', async () => {
    mock(db.getFirstAsync).mockResolvedValueOnce(
      fullRow({ balance_zests: 15, quest_zests: 50, quest_zests_expires_at: PAST })
    );
    expect((await getZestBalance()).balance).toBe(15);
  });

  it('reconnaît un compte Premium', async () => {
    mock(db.getFirstAsync).mockResolvedValueOnce(fullRow({ is_premium: 1 }));
    expect((await getZestBalance()).isPremium).toBe(true);
  });

  it('remet un Premium au PREMIUM_DAILY_CAP si nouvelle journée', async () => {
    mock(db.getFirstAsync).mockResolvedValueOnce(
      fullRow({ is_premium: 1, balance_zests: 50, last_reset_date: PAST })
    );
    expect((await getZestBalance()).balance).toBe(PREMIUM_DAILY_CAP);
  });
});

// ─── debitZests ────────────────────────────────────────────────────────────

describe('debitZests', () => {
  const setup = (balanceZests: number, questZests: number) => {
    const expires = questZests > 0 ? FUTURE : null;
    mock(db.getFirstAsync)
      .mockResolvedValueOnce(fullRow({ balance_zests: balanceZests, quest_zests: questZests, quest_zests_expires_at: expires }))
      .mockResolvedValueOnce({ balance_zests: balanceZests, quest_zests: questZests });
  };

  const updateArgs = (): [number, number] | undefined => {
    const call = mock(db.runAsync).mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('SET balance_zests = ?, quest_zests')
    );
    return call?.[1] as [number, number] | undefined;
  };

  it('retourne false si solde total insuffisant', async () => {
    mock(db.getFirstAsync).mockResolvedValueOnce(fullRow({ balance_zests: 5, quest_zests: 3 }));
    expect(await debitZests(10)).toBe(false);
  });

  it('débite balance_zests en premier, quest_zests inchangés', async () => {
    setup(15, 30);
    expect(await debitZests(10)).toBe(true);
    expect(updateArgs()).toEqual([5, 30]);
  });

  it('puise dans quest_zests quand balance_zests insuffisant', async () => {
    setup(3, 20);
    expect(await debitZests(10)).toBe(true);
    expect(updateArgs()).toEqual([0, 13]);
  });

  it('fonctionne quand le coût est exactement le solde total', async () => {
    setup(5, 5);
    expect(await debitZests(10)).toBe(true);
    expect(updateArgs()).toEqual([0, 0]);
  });
});

// ─── creditZests ───────────────────────────────────────────────────────────

describe('creditZests', () => {
  const setup = (balanceZests: number, questZests: number) => {
    const expires = questZests > 0 ? FUTURE : null;
    mock(db.getFirstAsync)
      .mockResolvedValueOnce(fullRow({ balance_zests: balanceZests, quest_zests: questZests, quest_zests_expires_at: expires }))
      .mockResolvedValueOnce({ balance_zests: balanceZests, quest_zests: questZests });
  };

  it('crédite balance_zests et retourne le nouveau solde total', async () => {
    setup(10, 0);
    expect(await creditZests(10)).toBe(20);
  });

  it('ne dépasse pas FREE_BALANCE_CAP', async () => {
    setup(180, 10);
    // disponible = FREE_BALANCE_CAP - 10 (quest) - 180 (balance) = 10 → balance = 190
    expect(await creditZests(20)).toBe(FREE_BALANCE_CAP);
  });
});

// ─── creditQuestZests ──────────────────────────────────────────────────────

describe('creditQuestZests', () => {
  const setup = (balanceZests: number, questZests: number, isPremium = 0) => {
    const expires = questZests > 0 ? FUTURE : null;
    mock(db.getFirstAsync)
      .mockResolvedValueOnce(fullRow({ balance_zests: balanceZests, quest_zests: questZests, quest_zests_expires_at: expires, is_premium: isPremium }))
      .mockResolvedValueOnce({ balance_zests: balanceZests, quest_zests: questZests, is_premium: isPremium });
  };

  // Cherche le UPDATE sur quest_zests (et non l'INSERT OR IGNORE)
  const questUpdateArgs = (): [number, string] | undefined => {
    const call = mock(db.runAsync).mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('SET quest_zests = ?')
    );
    return call?.[1] as [number, string] | undefined;
  };

  it('ajoute au pool quest_zests et retourne le solde total', async () => {
    setup(15, 0);
    expect(await creditQuestZests(20)).toBe(35);
  });

  it('fixe une date d\'expiration à ~30 jours', async () => {
    setup(15, 0);
    await creditQuestZests(10);
    const expiresAt = questUpdateArgs()?.[1] ?? '';
    expect(expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(expiresAt > today()).toBe(true);
  });

  it('plafonne à FREE_BALANCE_CAP - balance_zests', async () => {
    setup(180, 10);
    // disponible = 200 - 180 = 20, on crédite 30 → quest_zests = min(10+30, 20) = 20
    // retour = 180 + 20 = 200
    expect(await creditQuestZests(30)).toBe(FREE_BALANCE_CAP);
  });

  it('respecte le PREMIUM_DAILY_CAP pour les comptes Premium', async () => {
    setup(100, 0, 1);
    // cap = 500, disponible = 500-100 = 400, crédite 50 → quest_zests = 50
    // retour = 100 + 50 = 150
    expect(await creditQuestZests(50)).toBe(150);
  });
});
