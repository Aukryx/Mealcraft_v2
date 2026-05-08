import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { getUserProfile, saveUserProfile, resetDatabase } from '../database/db';
import { calculateGoals } from '../utils/tdee';
import { UserProfileRow } from '../types/database';
import { useLanguage } from '../context/LanguageContext';
import {
  getZestBalance,
  watchRewardedAd,
  DAILY_FREE_QUOTA,
  FREE_BALANCE_CAP,
  PREMIUM_DAILY_CAP,
} from '../utils/creditManager';
import { getLevelInfo, LevelInfo } from '../utils/xpManager';
import QuestList from '../components/QuestList';

type Goal = 'loss' | 'maintain' | 'gain';
type Sex = 'male' | 'female';
type Activity = 'sedentary' | 'light' | 'moderate' | 'active';

const GOAL_LABELS: Record<Goal, string> = {
  loss:     'Perte de poids',
  maintain: 'Maintien',
  gain:     'Prise de masse',
};

const ACTIVITY_LABELS: Record<Activity, string> = {
  sedentary: 'Sédentaire',
  light:     'Légèrement actif',
  moderate:  'Modérément actif',
  active:    'Très actif',
};

export default function ProfileScreen() {
  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState('25');
  const [weight, setWeight] = useState('70');
  const [height, setHeight] = useState('175');
  const [goal, setGoal] = useState<Goal>('maintain');
  const [activity, setActivity] = useState<Activity>('moderate');
  const [saved, setSaved] = useState(false);
  const [zestBalance, setZestBalance] = useState(DAILY_FREE_QUOTA);
  const [isPremium, setIsPremium] = useState(false);
  const [levelInfo, setLevelInfo] = useState<LevelInfo>(getLevelInfo(0));
  const [streakDays, setStreakDays] = useState(0);
  const { language, setLanguage } = useLanguage();

  useFocusEffect(
    useCallback(() => {
      getUserProfile().then((profile) => {
        if (profile) {
          setSex(profile.sex);
          setAge(String(profile.age));
          setWeight(String(profile.weight_kg));
          setHeight(String(profile.height_cm));
          setGoal(profile.goal);
          setActivity(profile.activity ?? 'moderate');
          setSaved(true);
          setLevelInfo(getLevelInfo(profile.xp ?? 0));
          setStreakDays(profile.streak_days ?? 0);
        }
      });
      getZestBalance().then(({ balance, isPremium: premium }) => {
        setZestBalance(balance);
        setIsPremium(premium);
      });
    }, [])
  );

  const handleWatchAd = async () => {
    const newBalance = await watchRewardedAd();
    setZestBalance(newBalance);
    Alert.alert('⚡ +10 Zests !', `Nouveau solde : ${newBalance} Zests.`);
  };

  const handleSave = async () => {
    const ageNum = parseInt(age);
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);

    if (!ageNum || !weightNum || !heightNum || ageNum < 10 || ageNum > 120) {
      Alert.alert('Données invalides', 'Vérifie les valeurs saisies.');
      return;
    }

    const profile: Omit<UserProfileRow, 'id'> = {
      sex, age: ageNum, weight_kg: weightNum, height_cm: heightNum, goal, activity,
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
    const profile = { id: 1, sex, age: ageNum, weight_kg: weightNum, height_cm: heightNum, goal, activity };
    return calculateGoals(profile);
  };

  const goals = previewGoals();

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.pageTitle}>Mon profil</Text>
      <Text style={styles.pageSubtitle}>Pour calculer tes besoins nutritionnels quotidiens.</Text>

      {/* ZESTS */}
      <View style={styles.zestCard}>
        <View style={styles.zestCardLeft}>
          <Text style={styles.zestCardTitle}>
            ⚡ Zests  {isPremium && <Text style={styles.premiumBadge}> PRO </Text>}
          </Text>
          <Text style={styles.zestCardSub}>
            {zestBalance} / {isPremium ? PREMIUM_DAILY_CAP : FREE_BALANCE_CAP} max
          </Text>
          <View style={styles.zestBar}>
            <View style={[
              styles.zestBarFill,
              {
                width: `${Math.min(100, (zestBalance / (isPremium ? PREMIUM_DAILY_CAP : FREE_BALANCE_CAP)) * 100)}%` as any,
                backgroundColor: isPremium ? '#6C5CE7' : '#0984E3',
              }
            ]} />
          </View>
        </View>
        {!isPremium && (
          <TouchableOpacity style={styles.adBtn} onPress={handleWatchAd}>
            <Text style={styles.adBtnText}>+10</Text>
            <Text style={styles.adBtnSub}>pub</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* NIVEAU & STREAK */}
      <View style={styles.levelCard}>
        <View style={styles.levelBadgeBox}>
          <Text style={styles.levelNum}>Niv.{levelInfo.level}</Text>
        </View>
        <View style={styles.levelMid}>
          <Text style={styles.levelTitle}>{levelInfo.title}</Text>
          <Text style={styles.levelXPText}>
            {levelInfo.nextLevelXP
              ? `${levelInfo.xp} / ${levelInfo.nextLevelXP} XP`
              : `${levelInfo.xp} XP — Niveau max !`}
          </Text>
          <View style={styles.xpBarTrack}>
            <View style={[styles.xpBarFill, { width: `${Math.round(levelInfo.progress * 100)}%` as any }]} />
          </View>
        </View>
        <View style={styles.streakBox}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakNum}>{streakDays}</Text>
          <Text style={styles.streakLabel}>jour{streakDays > 1 ? 's' : ''}</Text>
        </View>
      </View>

      <QuestList onClaim={(newBalance) => setZestBalance(newBalance)} />

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

      {/* ACTIVITÉ */}
      <Text style={styles.label}>Niveau d'activité</Text>
      <View style={styles.goalRow}>
        {(Object.keys(ACTIVITY_LABELS) as Activity[]).map((a) => (
          <TouchableOpacity
            key={a}
            style={[styles.goalBtn, activity === a && styles.goalActive]}
            onPress={() => setActivity(a)}
          >
            <Text style={[styles.goalText, activity === a && styles.goalTextActive]}>
              {ACTIVITY_LABELS[a]}
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

      {/* LANGUE */}
      <Text style={styles.label}>Langue des recettes</Text>
      <View style={styles.toggleRow}>
        {(['fr', 'en'] as const).map((lang) => (
          <TouchableOpacity
            key={lang}
            style={[styles.toggleBtn, language === lang && styles.toggleActive]}
            onPress={() => setLanguage(lang)}
          >
            <Text style={[styles.toggleText, language === lang && styles.toggleTextActive]}>
              {lang === 'fr' ? '🇫🇷  Français' : '🇬🇧  English'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.langHint}>
        {language === 'fr'
          ? 'Les titres et instructions sont traduits automatiquement.'
          : 'Recipes are displayed in their original language.'}
      </Text>

      {/* DEV ONLY */}
      <TouchableOpacity
        style={styles.devResetBtn}
        onPress={() =>
          Alert.alert('Reset DB', 'Supprimer toutes les données ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: () => resetDatabase() },
          ])
        }
      >
        <Text style={styles.devResetText}>DEV — Reset base de données</Text>
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

  saveBtn: { backgroundColor: '#00B894', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 24, marginBottom: 8 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  langHint: { fontSize: 12, color: '#B2BEC3', marginTop: 8, marginBottom: 16 },
  devResetBtn: { borderWidth: 1, borderColor: '#FF7675', borderStyle: 'dashed', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 40 },
  devResetText: { color: '#FF7675', fontSize: 13, fontWeight: '600' },

  zestCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#E0E0E0' },
  zestCardLeft: { flex: 1 },
  zestCardTitle: { fontSize: 15, fontWeight: 'bold', color: '#2D3436', marginBottom: 4 },
  zestCardSub: { fontSize: 13, color: '#636E72', marginBottom: 10 },
  premiumBadge: { fontSize: 10, backgroundColor: '#6C5CE7', color: '#FFF', borderRadius: 4, paddingHorizontal: 4 },
  zestBar: { height: 6, backgroundColor: '#F1F2F6', borderRadius: 3, overflow: 'hidden' },
  zestBarFill: { height: '100%' as any, borderRadius: 3 },
  adBtn: { backgroundColor: '#0984E3', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', marginLeft: 12 },
  adBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  adBtnSub: { color: 'rgba(255,255,255,0.8)', fontSize: 10 },

  levelCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E0E0E0', gap: 12 },
  levelBadgeBox: { backgroundColor: '#6C5CE7', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', minWidth: 52 },
  levelNum: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  levelMid: { flex: 1 },
  levelTitle: { fontSize: 14, fontWeight: 'bold', color: '#2D3436', marginBottom: 2 },
  levelXPText: { fontSize: 11, color: '#636E72', marginBottom: 6 },
  xpBarTrack: { height: 6, backgroundColor: '#F1F2F6', borderRadius: 3, overflow: 'hidden' },
  xpBarFill: { height: 6, backgroundColor: '#6C5CE7', borderRadius: 3 },
  streakBox: { alignItems: 'center', minWidth: 44 },
  streakEmoji: { fontSize: 20 },
  streakNum: { fontSize: 16, fontWeight: 'bold', color: '#2D3436' },
  streakLabel: { fontSize: 10, color: '#636E72' },
});
