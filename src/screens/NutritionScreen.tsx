import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getPlanningForDate, getUserProfile } from '../database/db';
import { calculateGoals, NutritionGoals } from '../utils/tdee';
import { toLocalDateString } from '../utils/dateUtils';

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const getWeekDays = () => {
  const days: string[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push(toLocalDateString(d));
  }
  return days;
};

const getDayLabel = (dateStr: string) => {
  const [, , day] = dateStr.split('-').map(Number);
  const d = new Date(dateStr + 'T12:00:00');
  return { short: DAY_LABELS[d.getDay()], num: day };
};

type Totals = { cal: number; prot: number; carbs: number; fat: number };

const MACROS: { key: keyof Totals; label: string; goalKey: keyof NutritionGoals; color: string; emoji: string }[] = [
  { key: 'prot',  label: 'Protéines', goalKey: 'protein_g', color: '#74B9FF', emoji: '🥩' },
  { key: 'carbs', label: 'Glucides',  goalKey: 'carbs_g',   color: '#FDCB6E', emoji: '🍞' },
  { key: 'fat',   label: 'Lipides',   goalKey: 'fat_g',     color: '#FD79A8', emoji: '🥑' },
];

export default function NutritionScreen() {
  const today = toLocalDateString(new Date());
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [todayTotals, setTodayTotals] = useState<Totals>({ cal: 0, prot: 0, carbs: 0, fat: 0 });
  const [weeklyData, setWeeklyData] = useState<{ date: string; cal: number }[]>([]);

  const loadData = useCallback(async () => {
    const profile = await getUserProfile();
    const computedGoals = profile ? calculateGoals(profile) : null;
    setGoals(computedGoals);

    const weekDays = getWeekDays();
    const todayMeals = await getPlanningForDate(today);
    const totals = todayMeals.reduce(
      (acc, m) => ({
        cal: acc.cal + m.calories * m.consumed_servings,
        prot: acc.prot + m.protein_g * m.consumed_servings,
        carbs: acc.carbs + m.carbs_g * m.consumed_servings,
        fat: acc.fat + m.fat_g * m.consumed_servings,
      }),
      { cal: 0, prot: 0, carbs: 0, fat: 0 }
    );
    setTodayTotals(totals);

    const weekly = await Promise.all(
      weekDays.map(async date => {
        if (date === today) return { date, cal: totals.cal };
        const meals = await getPlanningForDate(date);
        return { date, cal: meals.reduce((sum, m) => sum + m.calories * m.consumed_servings, 0) };
      })
    );
    setWeeklyData(weekly);
  }, [today]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const calPct = goals ? Math.min((todayTotals.cal / goals.calories) * 100, 100) : 0;
  const calOver = goals ? todayTotals.cal > goals.calories : false;
  const maxWeeklyCal = Math.max(...weeklyData.map(d => d.cal), goals?.calories ?? 1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Nutrition du jour</Text>
      <Text style={styles.dateLabel}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>

      {/* CALORIES */}
      <View style={styles.calCard}>
        <View style={styles.calHeader}>
          <Text style={styles.calEmoji}>🔥</Text>
          <View>
            <Text style={styles.calTitle}>CALORIES</Text>
            <Text style={styles.calValue}>{Math.round(todayTotals.cal)} kcal</Text>
          </View>
          {goals && (
            <View style={styles.calGoalBox}>
              <Text style={styles.calPct}>{Math.round(calPct)}%</Text>
              <Text style={styles.calGoalText}>/ {goals.calories} kcal</Text>
            </View>
          )}
        </View>
        <View style={styles.bigBarTrack}>
          <View style={[
            styles.bigBarFill,
            { width: `${calPct}%` as any, backgroundColor: calOver ? '#FF7675' : '#00B894' },
          ]} />
        </View>
        {!goals && (
          <Text style={styles.noProfileHint}>Configure ton profil pour voir tes objectifs</Text>
        )}
      </View>

      {/* MACROS */}
      <Text style={styles.sectionTitle}>Macronutriments</Text>
      <View style={styles.macroRow}>
        {MACROS.map(({ key, label, goalKey, color, emoji }) => {
          const val = todayTotals[key] as number;
          const goal = goals ? (goals[goalKey] as number) : null;
          const pct = goal ? Math.min((val / goal) * 100, 100) : 0;
          return (
            <View key={key} style={styles.macroCard}>
              <Text style={styles.macroEmoji}>{emoji}</Text>
              <Text style={styles.macroLabel}>{label}</Text>
              <Text style={styles.macroVal}>{Math.round(val)}g</Text>
              {goal && <Text style={styles.macroGoal}>/ {goal}g</Text>}
              <View style={styles.macroBarTrack}>
                <View style={[styles.macroBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
              </View>
              <Text style={[styles.macroPct, { color }]}>{goal ? `${Math.round(pct)}%` : '–'}</Text>
            </View>
          );
        })}
      </View>

      {/* RÉPARTITION CALORIQUE */}
      {goals && (todayTotals.prot + todayTotals.carbs + todayTotals.fat) > 0 && (
        <>
          <Text style={styles.sectionTitle}>Répartition calorique</Text>
          <View style={styles.splitCard}>
            {MACROS.map(({ key, label, color }) => {
              const val = todayTotals[key] as number;
              const factor = key === 'fat' ? 9 : 4;
              const kcal = val * factor;
              const totalKcal = todayTotals.prot * 4 + todayTotals.carbs * 4 + todayTotals.fat * 9;
              const pct = totalKcal > 0 ? Math.round((kcal / totalKcal) * 100) : 0;
              return (
                <View key={key} style={styles.splitItem}>
                  <View style={[styles.splitDot, { backgroundColor: color }]} />
                  <Text style={styles.splitLabel}>{label}</Text>
                  <Text style={styles.splitKcal}>{Math.round(kcal)} kcal</Text>
                  <Text style={[styles.splitPct, { color }]}>{pct}%</Text>
                </View>
              );
            })}
            <View style={styles.splitBarRow}>
              {MACROS.map(({ key, color }) => {
                const val = todayTotals[key] as number;
                const factor = key === 'fat' ? 9 : 4;
                const kcal = val * factor;
                const totalKcal = todayTotals.prot * 4 + todayTotals.carbs * 4 + todayTotals.fat * 9;
                const pct = totalKcal > 0 ? (kcal / totalKcal) * 100 : 0;
                return (
                  <View key={key} style={[styles.splitBarSegment, { flex: pct || 1, backgroundColor: color }]} />
                );
              })}
            </View>
          </View>
        </>
      )}

      {/* SEMAINE */}
      <Text style={styles.sectionTitle}>Cette semaine</Text>
      <View style={styles.weekCard}>
        {weeklyData.map(({ date, cal }) => {
          const { short, num } = getDayLabel(date);
          const barH = maxWeeklyCal > 0 ? Math.max(4, (cal / maxWeeklyCal) * 72) : 4;
          const isToday = date === today;
          const isOver = goals ? cal > goals.calories : false;
          return (
            <View key={date} style={styles.weekCol}>
              <Text style={styles.weekCalText}>{cal > 0 ? `${Math.round(cal / 100) / 10}k` : ''}</Text>
              <View style={styles.weekBarContainer}>
                <View style={[
                  styles.weekBar,
                  { height: barH, backgroundColor: isOver ? '#FF7675' : isToday ? '#00B894' : '#B2BEC3' },
                ]} />
                {goals && (
                  <View style={[
                    styles.weekGoalLine,
                    { bottom: Math.max(4, (goals.calories / maxWeeklyCal) * 72) },
                  ]} />
                )}
              </View>
              <Text style={[styles.weekDay, isToday && styles.weekDayToday]}>{short}</Text>
              <Text style={[styles.weekNum, isToday && styles.weekDayToday]}>{num}</Text>
            </View>
          );
        })}
      </View>

      {goals && (
        <Text style={styles.goalHint}>
          Objectif : {goals.calories} kcal · {goals.protein_g}g prot · {goals.carbs_g}g gluc · {goals.fat_g}g lip
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 18, paddingBottom: 40 },

  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#2D3436', marginBottom: 2 },
  dateLabel: { fontSize: 13, color: '#636E72', marginBottom: 20, textTransform: 'capitalize' },

  // Calories card
  calCard: {
    backgroundColor: '#2D3436',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    elevation: 4,
  },
  calHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  calEmoji: { fontSize: 32 },
  calTitle: { color: '#FFF', opacity: 0.6, fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  calValue: { color: '#FFF', fontSize: 28, fontWeight: 'bold' },
  calGoalBox: { marginLeft: 'auto' as any, alignItems: 'flex-end' },
  calPct: { color: '#00B894', fontSize: 22, fontWeight: 'bold' },
  calGoalText: { color: '#FFF', opacity: 0.45, fontSize: 12 },
  bigBarTrack: { height: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 5 },
  bigBarFill: { height: 10, borderRadius: 5 },
  noProfileHint: { color: '#FFF', opacity: 0.5, fontSize: 12, textAlign: 'center', marginTop: 12 },

  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#636E72', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 },

  // Macro cards
  macroRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  macroCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F2F6',
  },
  macroEmoji: { fontSize: 22, marginBottom: 6 },
  macroLabel: { fontSize: 10, color: '#636E72', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  macroVal: { fontSize: 18, fontWeight: 'bold', color: '#2D3436' },
  macroGoal: { fontSize: 11, color: '#B2BEC3', marginBottom: 10 },
  macroBarTrack: { width: '100%', height: 6, backgroundColor: '#F1F2F6', borderRadius: 3, marginBottom: 6 },
  macroBarFill: { height: 6, borderRadius: 3 },
  macroPct: { fontSize: 13, fontWeight: 'bold' },

  // Split card
  splitCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F2F6',
  },
  splitItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  splitDot: { width: 10, height: 10, borderRadius: 5 },
  splitLabel: { flex: 1, fontSize: 14, color: '#2D3436' },
  splitKcal: { fontSize: 13, color: '#636E72', marginRight: 8 },
  splitPct: { fontSize: 14, fontWeight: 'bold', minWidth: 36, textAlign: 'right' },
  splitBarRow: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  splitBarSegment: { height: 8 },

  // Weekly chart
  weekCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F2F6',
    marginBottom: 16,
  },
  weekCol: { alignItems: 'center', flex: 1 },
  weekCalText: { fontSize: 9, color: '#B2BEC3', marginBottom: 3, height: 13 },
  weekBarContainer: { height: 80, justifyContent: 'flex-end', alignItems: 'center', position: 'relative', width: '100%' },
  weekBar: { width: 14, borderRadius: 4 },
  weekGoalLine: { position: 'absolute', left: 0, right: 0, height: 1.5, backgroundColor: '#00B894', opacity: 0.4 },
  weekDay: { fontSize: 10, color: '#B2BEC3', marginTop: 6, fontWeight: '600' },
  weekNum: { fontSize: 12, color: '#636E72', fontWeight: 'bold' },
  weekDayToday: { color: '#00B894' },

  goalHint: { fontSize: 12, color: '#B2BEC3', textAlign: 'center' },
});
