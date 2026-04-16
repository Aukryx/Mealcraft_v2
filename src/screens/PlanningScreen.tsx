import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { getPlanningForDate, removeFromPlanning, getUserProfile } from '../database/db';
import { PlanningRow } from '../types/database';
import { calculateGoals, NutritionGoals } from '../utils/tdee';

export default function PlanningScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // 1. Génération des 7 prochains jours pour le sélecteur
  const getWeekDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      days.push({
        label: date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''),
        fullDate: date.toISOString().split('T')[0],
        dayNumber: date.getDate()
      });
    }
    return days;
  };

  const weekDays = useMemo(() => getWeekDays(), []);
  const [selectedDate, setSelectedDate] = useState(weekDays[0].fullDate);
  const [meals, setMeals] = useState<PlanningRow[]>([]);
  const [goals, setGoals] = useState<NutritionGoals | null>(null);

  // 2. Chargement des données depuis SQLite
  const loadData = async () => {
    const [data, profile] = await Promise.all([
      getPlanningForDate(selectedDate),
      getUserProfile(),
    ]);
    setMeals(data);
    setGoals(profile ? calculateGoals(profile) : null);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [selectedDate])
  );

  // 3. Calcul des totaux nutritionnels (pondérés par les portions consommées)
  const totals = meals.reduce((acc, meal) => ({
    cal: acc.cal + (meal.calories * meal.consumed_servings),
    prot: acc.prot + (meal.protein_g * meal.consumed_servings),
    carbs: acc.carbs + (meal.carbs_g * meal.consumed_servings),
    fat: acc.fat + (meal.fat_g * meal.consumed_servings),
  }), { cal: 0, prot: 0, carbs: 0, fat: 0 });

  const handleDelete = (id: number) => {
    Alert.alert("Supprimer", "Voulez-vous retirer ce repas de votre planning ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
          await removeFromPlanning(id);
          loadData();
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      {/* SÉLECTEUR DE JOURS HORIZONTAL */}
      <View style={styles.calendarStrip}>
        {weekDays.map((day) => (
          <TouchableOpacity 
            key={day.fullDate} 
            style={[styles.dayButton, day.fullDate === selectedDate && styles.daySelected]}
            onPress={() => setSelectedDate(day.fullDate)}
          >
            <Text style={[styles.dayLabel, day.fullDate === selectedDate && styles.textWhite]}>
              {day.label.toUpperCase()}
            </Text>
            <Text style={[styles.dayNumber, day.fullDate === selectedDate && styles.textWhite]}>
              {day.dayNumber}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* RÉSUMÉ NUTRITIONNEL DU JOUR */}
      <View style={styles.summaryCard}>
        <View style={styles.calRow}>
          <View>
            <Text style={styles.summaryTitle}>TOTAL DU JOUR</Text>
            <Text style={styles.totalCal}>{Math.round(totals.cal)} kcal</Text>
          </View>
          {goals && (
            <Text style={styles.calGoal}>/ {goals.calories} kcal</Text>
          )}
        </View>

        {goals && (
          <View style={styles.progressBarTrack}>
            <View style={[
              styles.progressBarFill,
              { width: `${Math.min((totals.cal / goals.calories) * 100, 100)}%` as any,
                backgroundColor: totals.cal > goals.calories ? '#FF7675' : '#55EFC4' }
            ]} />
          </View>
        )}

        <View style={styles.macroGrid}>
          {[
            { label: 'Prot.', val: totals.prot, goal: goals?.protein_g, color: '#74B9FF' },
            { label: 'Gluc.', val: totals.carbs, goal: goals?.carbs_g, color: '#FFEAA7' },
            { label: 'Lip.', val: totals.fat, goal: goals?.fat_g, color: '#FD79A8' },
          ].map(({ label, val, goal: macroGoal, color }) => (
            <View key={label} style={styles.macroItem}>
              <Text style={styles.macroVal}>{Math.round(val)}g</Text>
              {macroGoal && <Text style={styles.macroGoal}>/ {macroGoal}g</Text>}
              <View style={styles.miniBarTrack}>
                <View style={[
                  styles.miniBarFill,
                  { width: `${Math.min((val / (macroGoal ?? 1)) * 100, 100)}%` as any,
                    backgroundColor: color }
                ]} />
              </View>
              <Text style={styles.macroLab}>{label}</Text>
            </View>
          ))}
        </View>

        {!goals && (
          <Text style={styles.noProfileHint}>Configure ton profil pour voir tes objectifs</Text>
        )}
      </View>

      {/* BOUTON LISTE DE COURSES */}
      <TouchableOpacity
        style={styles.shoppingBtn}
        onPress={() => navigation.navigate('ShoppingList')}
      >
        <Text style={styles.shoppingBtnText}>🛒  Liste de courses de la semaine</Text>
      </TouchableOpacity>

      {/* LISTE DES REPAS PLANIFIÉS */}
      <FlatList
        data={meals}
        keyExtractor={(item) => item.id!.toString()}
        renderItem={({ item }) => (
          <View style={styles.mealCard}>
            {/* Zone cliquable : Navigation vers le détail */}
            <TouchableOpacity 
              style={styles.clickableArea}
              onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.recipe_id })}
              activeOpacity={0.6}
            >
              <View style={styles.slotBadge}>
                <Text style={styles.slotText}>{item.meal_slot === 'lunch' ? 'MIDI' : 'SOIR'}</Text>
              </View>
              <Text style={styles.mealTitle} numberOfLines={1}>{item.recipe_title}</Text>
              <Text style={styles.mealSub}>
                {item.consumed_servings} portion(s) • Voir la recette →
              </Text>
            </TouchableOpacity>

            {/* Zone d'action : Suppression */}
            <TouchableOpacity 
              style={styles.deleteBtn} 
              onPress={() => handleDelete(item.id!)}
            >
              <Text style={{ fontSize: 20 }}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyText}>Aucun repas prévu pour ce jour.</Text>
            <TouchableOpacity 
              style={styles.addBtn}
              onPress={() => navigation.navigate('MainTabs', { initialTab: 'SearchTab' })}
            >
              <Text style={styles.addBtnText}>Ajouter une recette</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 15 },
  
  // Calendrier
  calendarStrip: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 20, 
    backgroundColor: '#FFF', 
    padding: 10, 
    borderRadius: 15,
    elevation: 2
  },
  dayButton: { alignItems: 'center', padding: 8, borderRadius: 12, width: 45 },
  daySelected: { backgroundColor: '#00B894' },
  dayLabel: { fontSize: 10, color: '#636E72', fontWeight: '600' },
  dayNumber: { fontSize: 16, fontWeight: 'bold', color: '#2D3436' },
  textWhite: { color: '#FFF' },

  // Résumé
  summaryCard: {
    backgroundColor: '#2D3436',
    padding: 20,
    borderRadius: 20,
    marginBottom: 25,
    elevation: 4
  },
  calRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 },
  summaryTitle: { color: '#FFF', opacity: 0.6, fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalCal: { color: '#FFF', fontSize: 28, fontWeight: 'bold' },
  calGoal: { color: '#FFF', opacity: 0.5, fontSize: 13, marginBottom: 4 },
  progressBarTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, marginBottom: 18 },
  progressBarFill: { height: 6, borderRadius: 3 },
  macroGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  macroItem: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', padding: 10, borderRadius: 12 },
  macroVal: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  macroGoal: { color: '#FFF', opacity: 0.45, fontSize: 10, marginBottom: 6 },
  miniBarTrack: { width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, marginBottom: 6 },
  miniBarFill: { height: 4, borderRadius: 2 },
  macroLab: { color: '#FFF', fontSize: 10, opacity: 0.7 },
  noProfileHint: { color: '#FFF', opacity: 0.5, fontSize: 12, textAlign: 'center', marginTop: 12 },

  shoppingBtn: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#00B894',
  },
  shoppingBtnText: { color: '#00B894', fontWeight: 'bold', fontSize: 15 },

  // Cartes repas
  mealCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    marginBottom: 12, 
    flexDirection: 'row', 
    overflow: 'hidden',
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F2F6'
  },
  clickableArea: { flex: 1, padding: 15 },
  slotBadge: { 
    backgroundColor: '#E1F5FE', 
    alignSelf: 'flex-start', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 6,
    marginBottom: 5
  },
  slotText: { color: '#0288D1', fontSize: 10, fontWeight: 'bold' },
  mealTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3436' },
  mealSub: { fontSize: 12, color: '#00B894', marginTop: 4, fontWeight: '600' },
  deleteBtn: { 
    paddingHorizontal: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderLeftWidth: 1, 
    borderLeftColor: '#F1F2F6',
    backgroundColor: '#FAFAFA'
  },

  // Empty State
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 50, marginBottom: 10 },
  emptyText: { color: '#B2BEC3', fontSize: 16, marginBottom: 20 },
  addBtn: { backgroundColor: '#00B894', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  addBtnText: { color: '#FFF', fontWeight: 'bold' }
});