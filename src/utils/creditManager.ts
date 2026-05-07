import { db } from '../database/db';

export const DAILY_FREE_QUOTA = 20;
export const PREMIUM_DAILY_CAP = 500;
export const REWARDED_AD_CREDIT = 10;

export const SEARCH_COST = 0;
export const PLANNING_COST = 10;

const todayStr = () => new Date().toISOString().slice(0, 10);

const ensureProfileRow = async () => {
  await db.runAsync(
    `INSERT OR IGNORE INTO user_profile
       (id, sex, age, weight_kg, height_cm, goal, activity, balance_zests, is_premium, last_reset_date)
     VALUES (1, 'male', 25, 70, 175, 'maintain', 'moderate', ?, 0, ?)`,
    [DAILY_FREE_QUOTA, todayStr()]
  );
};

export const getZestBalance = async (): Promise<{ balance: number; isPremium: boolean }> => {
  try {
    await ensureProfileRow();

    const row = await db.getFirstAsync<{
      balance_zests: number;
      is_premium: number;
      last_reset_date: string | null;
    }>('SELECT balance_zests, is_premium, last_reset_date FROM user_profile WHERE id = 1');

    if (!row) return { balance: DAILY_FREE_QUOTA, isPremium: false };

    const today = todayStr();
    if (row.last_reset_date !== today) {
      const cap = row.is_premium ? PREMIUM_DAILY_CAP : DAILY_FREE_QUOTA;
      await db.runAsync(
        'UPDATE user_profile SET balance_zests = ?, last_reset_date = ? WHERE id = 1',
        [cap, today]
      );
      return { balance: cap, isPremium: !!row.is_premium };
    }

    return { balance: row.balance_zests, isPremium: !!row.is_premium };
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
    const { balance } = await getZestBalance();
    if (balance < cost) return false;
    await db.runAsync(
      'UPDATE user_profile SET balance_zests = balance_zests - ? WHERE id = 1',
      [cost]
    );
    return true;
  } catch (error) {
    console.error('❌ Erreur debitZests:', error);
    return false;
  }
};

export const creditZests = async (amount: number): Promise<number> => {
  try {
    const { balance, isPremium } = await getZestBalance();
    const cap = isPremium ? PREMIUM_DAILY_CAP : DAILY_FREE_QUOTA;
    const newBalance = Math.min(balance + amount, cap);
    await db.runAsync(
      'UPDATE user_profile SET balance_zests = ? WHERE id = 1',
      [newBalance]
    );
    return newBalance;
  } catch (error) {
    console.error('❌ Erreur creditZests:', error);
    return 0;
  }
};

// Brancher ici la lib AdMob réelle (react-native-google-mobile-ads) :
// afficher la rewarded ad, puis appeler creditZests dans le callback onEarnedReward.
export const watchRewardedAd = async (): Promise<number> => {
  return creditZests(REWARDED_AD_CREDIT);
};
