import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getPlanningForDate, removeFromPlanning } from '../database/db';

export default function PlanningScreen() {
  // 1. Génération des 7 prochains jours
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

  const weekDays = getWeekDays();
  const [selectedDate, setSelectedDate] = useState(weekDays[0].fullDate);
  const [meals, setMeals] = useState<any[]>([]);

  // 2. Chargement des données
  const loadData = async () => {
    const data = await getPlanningForDate(selectedDate);
    setMeals(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [selectedDate])
  );

  // 3. Calcul des totaux nutritionnels pondérés par les portions
  const totals = meals.reduce((acc, meal) => ({
    cal: acc.cal + (meal.calories * meal.consumed_servings),
    prot: acc.prot + (meal.protein_g * meal.consumed_servings),
    carbs: acc.carbs + (meal.carbs_g * meal.consumed_servings),
    fat: acc.fat + (meal.fat_g * meal.consumed_servings),
  }), { cal: 0, prot: 0, carbs: 0, fat: 0 });

  const handleDelete = (id: number) => {
    Alert.alert("Supprimer", "Retirer ce repas ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Oui", onPress: async () => {
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
            <Text style={[styles.dayLabel, day.fullDate === selectedDate && styles.textWhite]}>{day.label}</Text>
            <Text style={[styles.dayNumber, day.fullDate === selectedDate && styles.textWhite]}>{day.dayNumber}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* CARD RÉSUMÉ NUTRITIONNEL */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Apports du jour</Text>
        <Text style={styles.totalCal}>{Math.round(totals.cal)} kcal</Text>
        <View style={styles.macroRow}>
          <Text style={styles.macroText}>P: {Math.round(totals.prot)}g</Text>
          <Text style={styles.macroText}>G: {Math.round(totals.carbs)}g</Text>
          <Text style={styles.macroText}>L: {Math.round(totals.fat)}g</Text>
        </View>
      </View>

      {/* LISTE DES REPAS */}
      <FlatList
        data={meals}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.mealCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.slotTag}>{item.meal_slot.toUpperCase()}</Text>
              <Text style={styles.mealTitle}>{item.recipe_title}</Text>
              <Text style={styles.mealInfo}>{item.consumed_servings} portion(s) • {Math.round(item.calories * item.consumed_servings)} kcal</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Aucun repas prévu. 🍽️</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 15 },
  calendarStrip: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20, backgroundColor: '#FFF', padding: 10, borderRadius: 15 },
  dayButton: { alignItems: 'center', padding: 8, borderRadius: 10, width: 45 },
  daySelected: { backgroundColor: '#00B894' },
  dayLabel: { fontSize: 10, color: '#636E72' },
  dayNumber: { fontSize: 16, fontWeight: 'bold' },
  textWhite: { color: '#FFF' },
  summaryCard: { backgroundColor: '#00B894', padding: 20, borderRadius: 20, marginBottom: 20 },
  summaryTitle: { color: '#FFF', opacity: 0.8, fontSize: 14 },
  totalCal: { color: '#FFF', fontSize: 32, fontWeight: 'bold', marginVertical: 5 },
  macroRow: { flexDirection: 'row', gap: 15 },
  macroText: { color: '#FFF', fontWeight: '500' },
  mealCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  slotTag: { fontSize: 10, fontWeight: 'bold', color: '#0984E3' },
  mealTitle: { fontSize: 16, fontWeight: 'bold', marginVertical: 2 },
  mealInfo: { fontSize: 12, color: '#636E72' },
  deleteIcon: { fontSize: 20, marginLeft: 10 },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#B2BEC3', fontSize: 16 }
});