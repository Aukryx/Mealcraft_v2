import { db } from '../database/db';

export const DAILY_FREE_QUOTA = 20;
export const FREE_BALANCE_CAP = 200;
export const PREMIUM_DAILY_CAP = 500;
export const REWARDED_AD_CREDIT = 10;

export const SEARCH_COST = 0;
export const PLANNING_COST = 10;

const todayStr = () => new Date().toISOString().slice(0, 10);

const daysFromNowStr = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const ensureProfileRow = async () => {
  await db.runAsync(
    `INSERT OR IGNORE INTO user_profile
       (id, sex, age, weight_kg, height_cm, goal, activity, balance_zests, is_premium, last_reset_date, quest_zests, quest_zests_expires_at)
     VALUES (1, 'male', 25, 70, 175, 'maintain', 'moderate', ?, 0, ?, 0, NULL)`,
    [DAILY_FREE_QUOTA, todayStr()]
  );
};

type ProfileZestRow = {
  balance_zests: number;
  is_premium: number;
  last_reset_date: string | null;
  quest_zests: number;
  quest_zests_expires_at: string | null;
};

export const getZestBalance = async (): Promise<{ balance: number; isPremium: boolean }> => {
  try {
    await ensureProfileRow();

    const row = await db.getFirstAsync<ProfileZestRow>(
      'SELECT balance_zests, is_premium, last_reset_date, quest_zests, quest_zests_expires_at FROM user_profile WHERE id = 1'
    );

    if (!row) return { balance: DAILY_FREE_QUOTA, isPremium: false };

    const today = todayStr();
    let { balance_zests, quest_zests } = row;
    const updates: string[] = [];
    const params: (string | number)[] = [];

    // Reset journalier
    if (row.last_reset_date !== today) {
      balance_zests = row.is_premium ? PREMIUM_DAILY_CAP : DAILY_FREE_QUOTA;
      updates.push('balance_zests = ?', 'last_reset_date = ?');
      params.push(balance_zests, today);
    }

    // Expiration des Zests de quête (30 jours)
    if (quest_zests > 0 && row.quest_zests_expires_at && row.quest_zests_expires_at < today) {
      quest_zests = 0;
      updates.push('quest_zests = 0', 'quest_zests_expires_at = NULL');
    }

    if (updates.length > 0) {
      await db.runAsync(
        `UPDATE user_profile SET ${updates.join(', ')} WHERE id = 1`,
        params
      );
    }

    return { balance: balance_zests + quest_zests, isPremium: !!row.is_premium };
  } catch (error) {
    console.error('❌ Erreur getZestBalance:', error);
    return { balance: DAILY_FREE_QUOTA, isPremium: false };
  }
};

export const canAfford = async (cost: number): Promise<boolean> => {
  const { balance } = await getZestBalance();
  return balance >= cost;
};

export const debitZests = async (cost: number): Promise<boolean> => {
  try {
    // getZestBalance gère le reset journalier et l'expiration avant qu'on lise
    const { balance } = await getZestBalance();
    if (balance < cost) return false;

    const row = await db.getFirstAsync<{ balance_zests: number; quest_zests: number }>(
      'SELECT balance_zests, quest_zests FROM user_profile WHERE id = 1'
    );
    if (!row) return false;

    // On débite balance_zests en premier (s'efface chaque jour de toute façon)
    const newBalance = Math.max(0, row.balance_zests - cost);
    const deficit = cost - (row.balance_zests - newBalance);
    const newQuestZests = Math.max(0, row.quest_zests - deficit);

    await db.runAsync(
      'UPDATE user_profile SET balance_zests = ?, quest_zests = ? WHERE id = 1',
      [newBalance, newQuestZests]
    );
    return true;
  } catch (error) {
    console.error('❌ Erreur debitZests:', error);
    return false;
  }
};

// Crédits standard (pubs) → dans balance_zests
export const creditZests = async (amount: number): Promise<number> => {
  try {
    await getZestBalance(); // assure reset/expiry
    const row = await db.getFirstAsync<{ balance_zests: number; quest_zests: number }>(
      'SELECT balance_zests, quest_zests FROM user_profile WHERE id = 1'
    );
    if (!row) return 0;
    const cap = FREE_BALANCE_CAP;
    const newBalance = Math.min(row.balance_zests + amount, cap - row.quest_zests);
    await db.runAsync('UPDATE user_profile SET balance_zests = ? WHERE id = 1', [Math.max(0, newBalance)]);
    return Math.max(0, newBalance) + row.quest_zests;
  } catch (error) {
    console.error('❌ Erreur creditZests:', error);
    return 0;
  }
};

// Crédits quêtes → dans quest_zests, expirent dans 30 jours
export const creditQuestZests = async (amount: number): Promise<number> => {
  try {
    await getZestBalance(); // assure reset/expiry
    const row = await db.getFirstAsync<{ balance_zests: number; quest_zests: number; is_premium: number }>(
      'SELECT balance_zests, quest_zests, is_premium FROM user_profile WHERE id = 1'
    );
    if (!row) return 0;
    const cap = row.is_premium ? PREMIUM_DAILY_CAP : FREE_BALANCE_CAP;
    const newQuestZests = Math.min(row.quest_zests + amount, cap - row.balance_zests);
    const expiresAt = daysFromNowStr(30);
    await db.runAsync(
      'UPDATE user_profile SET quest_zests = ?, quest_zests_expires_at = ? WHERE id = 1',
      [Math.max(0, newQuestZests), expiresAt]
    );
    return row.balance_zests + Math.max(0, newQuestZests);
  } catch (error) {
    console.error('❌ Erreur creditQuestZests:', error);
    return 0;
  }
};

// Brancher ici la lib AdMob réelle (react-native-google-mobile-ads) :
// afficher la rewarded ad, puis appeler creditZests dans le callback onEarnedReward.
export const watchRewardedAd = async (): Promise<number> => {
  return creditZests(REWARDED_AD_CREDIT);
};
