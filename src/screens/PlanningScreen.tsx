import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getPlanningForDate, removeFromPlanning } from '../database/db';
import { PlanningRow } from '../types/database';

export default function PlanningScreen() {
  // 1. Génération de la semaine (7 jours à partir d'aujourd'hui)
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
  const [meals, setMeals] = useState<PlanningRow[]>([]);

  const loadPlanning = async () => {
    const data = await getPlanningForDate(selectedDate);
    setMeals(data);
  };

  // Recharger quand la date change ou quand l'écran revient au premier plan
  useFocusEffect(
    useCallback(() => {
      loadPlanning();
    }, [selectedDate])
  );

  const handleDelete = (id: number) => {
    Alert.alert("Supprimer", "Retirer ce repas du planning ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
          await removeFromPlanning(id);
          loadPlanning();
      }}
    ]);
  };

  // 2. Calcul des totaux pondérés (Calories + Toutes les Macros)
  const totals = meals.reduce((acc, meal) => ({
    cal: acc.cal + (meal.calories * meal.consumed_servings),
    prot: acc.prot + (meal.protein_g * meal.consumed_servings),
    carbs: acc.carbs + (meal.carbs_g * meal.consumed_servings),
    fat: acc.fat + (meal.fat_g * meal.consumed_servings),
  }), { cal: 0, prot: 0, carbs: 0, fat: 0 });

  return (
    <View style={styles.container}>
      {/* SÉLECTEUR DE JOURS HORIZONTAL */}
      <View style={styles.calendarStrip}>
        {weekDays.map((day) => {
          const isSelected = day.fullDate === selectedDate;
          return (
            <TouchableOpacity 
              key={day.fullDate} 
              style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
              onPress={() => setSelectedDate(day.fullDate)}
            >
              <Text style={[styles.dayLabel, isSelected && styles.textSelected]}>{day.label}</Text>
              <Text style={[styles.dayNumber, isSelected && styles.textSelected]}>{day.dayNumber}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* CARTE DE RÉSUMÉ NUTRITIONNEL */}
      <View style={styles.header}>
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.totalCal}>{Math.round(totals.cal)}</Text>
            <Text style={styles.totalCalUnit}>Calories (kcal)</Text>
          </View>
          
          <View style={styles.macroRow}>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{Math.round(totals.prot)}g</Text>
              <Text style={styles.macroLabel}>Prot.</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{Math.round(totals.carbs)}g</Text>
              <Text style={styles.macroLabel}>Gluc.</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{Math.round(totals.fat)}g</Text>
              <Text style={styles.macroLabel}>Lip.</Text>
            </View>
          </View>
        </View>
      </View>

      {/* LISTE DES REPAS DU JOUR SÉLECTIONNÉ */}
      <FlatList
        data={meals}
        keyExtractor={(item) => item.id!.toString()}
        renderItem={({ item }) => (
          <View style={styles.mealItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.slotTag}>{item.meal_slot === 'lunch' ? 'MIDI' : 'SOIR'}</Text>
              <Text style={styles.mealTitle} numberOfLines={1}>{item.recipe_title}</Text>
              <Text style={styles.mealInfo}>{item.consumed_servings} portion(s) • {Math.round(item.calories * item.consumed_servings)} kcal</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id!)} style={styles.deleteButton}>
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Rien de prévu pour ce jour. 🍽️</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 20 },
  
  // Styles du Calendrier
  calendarStrip: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 20,
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dayButton: { alignItems: 'center', padding: 10, borderRadius: 10, width: 45 },
  dayButtonSelected: { backgroundColor: '#00B894' },
  dayLabel: { fontSize: 10, color: '#636E72', textTransform: 'uppercase' },
  dayNumber: { fontSize: 16, fontWeight: 'bold', color: '#2D3436' },
  textSelected: { color: '#FFF' },

  // Styles du Résumé
  header: { marginBottom: 20 },
  summaryCard: { backgroundColor: '#00B894', padding: 20, borderRadius: 20, elevation: 4 },
  totalCal: { color: '#FFF', fontSize: 40, fontWeight: 'bold' },
  totalCalUnit: { color: '#FFF', fontSize: 14, opacity: 0.8, marginTop: -5 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  macroItem: { alignItems: 'center' },
  macroValue: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  macroLabel: { color: '#FFF', fontSize: 12, opacity: 0.7 },

  // Styles de la Liste
  mealItem: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  slotTag: { fontSize: 10, fontWeight: 'bold', color: '#0984E3', marginBottom: 2 },
  mealTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3436' },
  mealInfo: { fontSize: 12, color: '#636E72', marginTop: 2 },
  deleteButton: { padding: 10 },
  deleteIcon: { fontSize: 20 },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#B2BEC3', fontSize: 16 }
});