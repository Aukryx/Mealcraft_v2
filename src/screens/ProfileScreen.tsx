import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { getUserProfile, saveUserProfile } from '../database/db';
import { calculateGoals, calculateTDEE } from '../utils/tdee';
import { UserProfileRow } from '../types/database';

type Goal = 'loss' | 'maintain' | 'gain';
type Sex = 'male' | 'female';

const GOAL_LABELS: Record<Goal, string> = {
  loss:     'Perte de poids',
  maintain: 'Maintien',
  gain:     'Prise de masse',
};

export default function ProfileScreen() {
  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState('25');
  const [weight, setWeight] = useState('70');
  const [height, setHeight] = useState('175');
  const [goal, setGoal] = useState<Goal>('maintain');
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getUserProfile().then((profile) => {
        if (profile) {
          setSex(profile.sex);
          setAge(String(profile.age));
          setWeight(String(profile.weight_kg));
          setHeight(String(profile.height_cm));
          setGoal(profile.goal);
          setSaved(true);
        }
      });
    }, [])
  );

  const handleSave = async () => {
    const ageNum = parseInt(age);
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);

    if (!ageNum || !weightNum || !heightNum || ageNum < 10 || ageNum > 120) {
      Alert.alert('Données invalides', 'Vérifie les valeurs saisies.');
      return;
    }

    const profile: Omit<UserProfileRow, 'id'> = {
      sex, age: ageNum, weight_kg: weightNum, height_cm: heightNum, goal,
    };

    const ok = await saveUserProfile(profile);
    if (ok) {
      setSaved(true);
      const goals = calculateGoals(profile as UserProfileRow);
      Alert.alert('✅ Profil sauvegardé !', `Objectif calorique : ${goals.calories} kcal/jour`);
    }
  };

  const previewGoals = () => {
    const ageNum = parseInt(age) || 25;
    const weightNum = parseFloat(weight) || 70;
    const heightNum = parseFloat(height) || 175;
    const profile = { id: 1, sex, age: ageNum, weight_kg: weightNum, height_cm: heightNum, goal };
    return calculateGoals(profile);
  };

  const goals = previewGoals();

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.pageTitle}>Mon profil</Text>
      <Text style={styles.pageSubtitle}>Pour calculer tes besoins nutritionnels quotidiens.</Text>

      {/* SEXE */}
      <Text style={styles.label}>Sexe</Text>
      <View style={styles.toggleRow}>
        {(['male', 'female'] as Sex[]).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.toggleBtn, sex === s && styles.toggleActive]}
            onPress={() => setSex(s)}
          >
            <Text style={[styles.toggleText, sex === s && styles.toggleTextActive]}>
              {s === 'male' ? 'Homme' : 'Femme'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* INFOS PHYSIQUES */}
      <View style={styles.row}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Âge</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={age}
            onChangeText={setAge}
            maxLength={3}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Poids (kg)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={weight}
            onChangeText={setWeight}
            maxLength={5}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Taille (cm)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={height}
            onChangeText={setHeight}
            maxLength={5}
          />
        </View>
      </View>

      {/* OBJECTIF */}
      <Text style={styles.label}>Objectif</Text>
      <View style={styles.goalRow}>
        {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.goalBtn, goal === g && styles.goalActive]}
            onPress={() => setGoal(g)}
          >
            <Text style={[styles.goalText, goal === g && styles.goalTextActive]}>
              {GOAL_LABELS[g]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* APERÇU DES OBJECTIFS */}
      <View style={styles.previewCard}>
        <Text style={styles.previewTitle}>Objectifs estimés / jour</Text>
        <View style={styles.previewGrid}>
          <View style={styles.previewItem}>
            <Text style={styles.previewValue}>{goals.calories}</Text>
            <Text style={styles.previewLabel}>kcal</Text>
          </View>
          <View style={styles.previewItem}>
            <Text style={styles.previewValue}>{goals.protein_g}g</Text>
            <Text style={styles.previewLabel}>Prot.</Text>
          </View>
          <View style={styles.previewItem}>
            <Text style={styles.previewValue}>{goals.carbs_g}g</Text>
            <Text style={styles.previewLabel}>Gluc.</Text>
          </View>
          <View style={styles.previewItem}>
            <Text style={styles.previewValue}>{goals.fat_g}g</Text>
            <Text style={styles.previewLabel}>Lip.</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>{saved ? 'Mettre à jour' : 'Enregistrer'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 20 },
  pageTitle: { fontSize: 26, fontWeight: 'bold', color: '#2D3436', marginTop: 10 },
  pageSubtitle: { fontSize: 14, color: '#636E72', marginBottom: 25, marginTop: 4 },

  label: { fontSize: 13, fontWeight: '600', color: '#636E72', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },

  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#DFE6E9', alignItems: 'center' },
  toggleActive: { backgroundColor: '#00B894', borderColor: '#00B894' },
  toggleText: { fontWeight: '600', color: '#636E72' },
  toggleTextActive: { color: '#FFF' },

  row: { flexDirection: 'row', gap: 10 },
  inputGroup: { flex: 1 },
  input: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1.5, borderColor: '#DFE6E9', padding: 12, fontSize: 16, textAlign: 'center', fontWeight: 'bold' },

  goalRow: { gap: 8 },
  goalBtn: { padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#DFE6E9', alignItems: 'center', backgroundColor: '#FFF' },
  goalActive: { backgroundColor: '#0984E3', borderColor: '#0984E3' },
  goalText: { fontWeight: '600', color: '#636E72' },
  goalTextActive: { color: '#FFF' },

  previewCard: { backgroundColor: '#2D3436', borderRadius: 20, padding: 20, marginTop: 24 },
  previewTitle: { color: '#FFF', opacity: 0.7, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 15 },
  previewGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  previewItem: { alignItems: 'center' },
  previewValue: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  previewLabel: { color: '#FFF', opacity: 0.6, fontSize: 11, marginTop: 2 },

  saveBtn: { backgroundColor: '#00B894', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
