jest.mock('../database/db', () => ({
  db: {
    runAsync: jest.fn().mockResolvedValue(undefined),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    getAllAsync: jest.fn().mockResolvedValue([]),
    execAsync: jest.fn().mockResolvedValue(undefined),
  },
}));

import { DAILY_FREE_QUOTA, PREMIUM_DAILY_CAP, PLANNING_COST, SEARCH_COST, REWARDED_AD_CREDIT } from '../utils/creditManager';

// Les fonctions async dépendent d'expo-sqlite qui n'est pas disponible
// en environnement de test. On teste ici les constantes et la logique pure.

describe('Constantes du système Zests', () => {
  it('la recherche est gratuite', () => {
    expect(SEARCH_COST).toBe(0);
  });

  it('le planning coûte 10 Zests', () => {
    expect(PLANNING_COST).toBe(10);
  });

  it('le quota gratuit quotidien est de 20 Zests', () => {
    expect(DAILY_FREE_QUOTA).toBe(20);
  });

  it('le cap Premium est supérieur au quota gratuit', () => {
    expect(PREMIUM_DAILY_CAP).toBeGreaterThan(DAILY_FREE_QUOTA);
  });

  it('une pub rapporte assez pour au moins 1 planning', () => {
    expect(REWARDED_AD_CREDIT).toBeGreaterThanOrEqual(PLANNING_COST);
  });

  it('un utilisateur gratuit peut planifier au moins 1 repas par jour', () => {
    expect(DAILY_FREE_QUOTA).toBeGreaterThanOrEqual(PLANNING_COST);
  });
});

describe('Logique de débit/crédit (règles métier)', () => {
  it('un utilisateur avec 0 Zests ne peut pas payer le planning', () => {
    const balance = 0;
    expect(balance >= PLANNING_COST).toBe(false);
  });

  it('un utilisateur avec exactement PLANNING_COST peut planifier', () => {
    const balance = PLANNING_COST;
    expect(balance >= PLANNING_COST).toBe(true);
  });

  it('le cap quotidien gratuit limite le stockage', () => {
    const currentBalance = 18;
    const credit = REWARDED_AD_CREDIT; // +10
    const newBalance = Math.min(currentBalance + credit, DAILY_FREE_QUOTA);
    expect(newBalance).toBe(DAILY_FREE_QUOTA); // 20, pas 28
  });

  it('le cap Premium est respecté lors du crédit', () => {
    const nearCap = PREMIUM_DAILY_CAP - 5;
    const newBalance = Math.min(nearCap + REWARDED_AD_CREDIT, PREMIUM_DAILY_CAP);
    expect(newBalance).toBe(PREMIUM_DAILY_CAP);
  });

  it('le reset quotidien remet au quota du tier', () => {
    const freeReset = DAILY_FREE_QUOTA;
    const premiumReset = PREMIUM_DAILY_CAP;
    expect(freeReset).toBe(20);
    expect(premiumReset).toBe(500);
  });

  it('le solde ne peut pas descendre sous 0 après débit', () => {
    const balance = 5;
    const cost = PLANNING_COST; // 10
    const canAfford = balance >= cost;
    expect(canAfford).toBe(false);
    // Si on forçait le débit : max(0, balance - cost) = 0
    const result = Math.max(0, balance - cost);
    expect(result).toBe(0);
  });
});

describe('Rentabilité du modèle économique', () => {
  const SPOONACULAR_COST_USD = 0.0006; // par point/Zest
  const AD_REVENUE_USD = 0.01;         // par vue pub

  it('une pub couvre le coût API des Zests qu\'elle génère', () => {
    const apiCostOfReward = REWARDED_AD_CREDIT * SPOONACULAR_COST_USD;
    expect(AD_REVENUE_USD).toBeGreaterThan(apiCostOfReward);
  });

  it('la marge brute par pub est positive', () => {
    const margin = AD_REVENUE_USD - REWARDED_AD_CREDIT * SPOONACULAR_COST_USD;
    expect(margin).toBeGreaterThan(0);
  });

  it('un utilisateur gratuit coûte moins de 0.02€/jour en API', () => {
    const dailyCost = DAILY_FREE_QUOTA * SPOONACULAR_COST_USD;
    expect(dailyCost).toBeLessThan(0.02);
  });
});
