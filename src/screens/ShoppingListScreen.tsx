import React, { useState, useCallback } from 'react';
import {
  View, Text, SectionList, StyleSheet,
  TouchableOpacity, Share
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getShoppingList } from '../database/db';
import { ShoppingIngredient } from '../types/database';

type Section = {
  title: string;
  recipeId: number;
  data: ShoppingIngredient[];
};

// Génère les dates de la semaine courante (aujourd'hui + 6 jours)
const getWeekRange = () => {
  const today = new Date();
  const end = new Date();
  end.setDate(today.getDate() + 6);
  return {
    start: today.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
};

export default function ShoppingListScreen() {
  const [sections, setSections] = useState<Section[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const loadList = async () => {
    const { start, end } = getWeekRange();
    const items = await getShoppingList(start, end);

    // Grouper par recette
    const map = new Map<number, Section>();
    for (const item of items) {
      if (!map.has(item.recipeId)) {
        map.set(item.recipeId, {
          title: item.recipeTitle,
          recipeId: item.recipeId,
          data: [],
        });
      }
      map.get(item.recipeId)!.data.push(item);
    }

    setSections(Array.from(map.values()));
  };

  useFocusEffect(useCallback(() => { loadList(); }, []));

  const toggleCheck = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleShare = async () => {
    const lines: string[] = ['🛒 Liste de courses MealCraft\n'];
    for (const section of sections) {
      lines.push(`\n📍 ${section.title}`);
      for (const item of section.data) {
        const key = `${item.recipeId}-${item.name}`;
        const done = checked.has(key) ? '✅' : '⬜';
        lines.push(`  ${done} ${item.amount > 0 ? `${item.amount} ${item.unit} ` : ''}${item.name}`);
      }
    }
    await Share.share({ message: lines.join('\n') });
  };

  const totalItems = sections.reduce((acc, s) => acc + s.data.length, 0);
  const checkedCount = checked.size;

  if (totalItems === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🛒</Text>
        <Text style={styles.emptyTitle}>Rien à acheter</Text>
        <Text style={styles.emptyText}>
          Planifie des repas pour la semaine et la liste se remplira automatiquement.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.progress}>{checkedCount} / {totalItems} articles</Text>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${(checkedCount / totalItems) * 100}%` as any }]} />
          </View>
        </View>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>Partager</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.recipeId}-${item.name}`}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const key = `${item.recipeId}-${item.name}`;
          const isChecked = checked.has(key);
          return (
            <TouchableOpacity
              style={[styles.item, isChecked && styles.itemChecked]}
              onPress={() => toggleCheck(key)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                {isChecked && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.itemContent}>
                <Text style={[styles.itemName, isChecked && styles.itemNameChecked]}>
                  {item.name}
                </Text>
                {item.amount > 0 && (
                  <Text style={styles.itemAmount}>
                    {item.amount} {item.unit}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ paddingBottom: 30 }}
        stickySectionHeadersEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFF', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F2F6',
  },
  progress: { fontSize: 13, fontWeight: '600', color: '#636E72', marginBottom: 6 },
  progressBarTrack: { width: 180, height: 6, backgroundColor: '#DFE6E9', borderRadius: 3 },
  progressBarFill: { height: 6, backgroundColor: '#00B894', borderRadius: 3 },
  shareBtn: { backgroundColor: '#0984E3', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
  shareBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

  sectionHeader: {
    backgroundColor: '#F8F9FA', paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#EAECEF',
  },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#0984E3', textTransform: 'uppercase', letterSpacing: 0.5 },

  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#F8F9FA',
  },
  itemChecked: { opacity: 0.45 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    borderColor: '#B2BEC3', marginRight: 14, justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#00B894', borderColor: '#00B894' },
  checkmark: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  itemContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: 16, color: '#2D3436', fontWeight: '500' },
  itemNameChecked: { textDecorationLine: 'line-through', color: '#B2BEC3' },
  itemAmount: { fontSize: 13, color: '#636E72', fontWeight: '600' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: '#F8F9FA' },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D3436', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#B2BEC3', textAlign: 'center', lineHeight: 22 },
});
