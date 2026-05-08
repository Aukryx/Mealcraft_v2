import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getQuests, claimQuest } from '../utils/questManager';
import { QuestRow } from '../types/database';

const TYPE_LABEL: Record<QuestRow['type'], string> = {
  daily: 'Quotidien',
  weekly: 'Hebdomadaire',
};

type Props = {
  onClaim: (newBalance: number) => void;
};

export default function QuestList({ onClaim }: Props) {
  const [quests, setQuests] = useState<QuestRow[]>([]);

  const reload = useCallback(() => {
    getQuests().then(setQuests);
  }, []);

  useFocusEffect(reload);

  const handleClaim = async (quest: QuestRow) => {
    const newBalance = await claimQuest(quest.id);
    if (newBalance < 0) return;
    Alert.alert('⚡ Zests gagnés !', `+${quest.reward_zests} Zests  •  Nouveau solde : ${newBalance}`);
    onClaim(newBalance);
    reload();
  };

  if (quests.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Quêtes</Text>
      {quests.map((quest) => {
        const progress = Math.min(quest.current_count / quest.target_count, 1);
        const isClaimed = !!quest.claimed_at;
        const isCompleted = !!quest.completed_at && !isClaimed;

        return (
          <View key={quest.id} style={[styles.card, isClaimed && styles.cardClaimed]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardLeft}>
                <Text style={styles.typeTag}>{TYPE_LABEL[quest.type]}</Text>
                <Text style={[styles.label, isClaimed && styles.labelClaimed]} numberOfLines={2}>
                  {quest.label}
                </Text>
              </View>
              <Text style={styles.reward}>+{quest.reward_zests} ⚡</Text>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.progressText}>
                {quest.current_count} / {quest.target_count}
              </Text>
              {isClaimed ? (
                <Text style={styles.claimedTag}>Réclamé ✓</Text>
              ) : isCompleted ? (
                <TouchableOpacity style={styles.claimBtn} onPress={() => handleClaim(quest)}>
                  <Text style={styles.claimBtnText}>Réclamer</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 24 },
  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: '#636E72',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  card: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#E0E0E0',
  },
  cardClaimed: { opacity: 0.5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardLeft: { flex: 1, marginRight: 8 },
  typeTag: {
    fontSize: 10, fontWeight: 'bold', color: '#0984E3',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#2D3436', lineHeight: 20 },
  labelClaimed: { color: '#B2BEC3' },
  reward: { fontSize: 14, fontWeight: 'bold', color: '#F39C12' },
  progressTrack: { height: 6, backgroundColor: '#F1F2F6', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: 6, backgroundColor: '#00B894', borderRadius: 3 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressText: { fontSize: 12, color: '#636E72', fontWeight: '600' },
  claimBtn: {
    backgroundColor: '#F39C12', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  claimBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  claimedTag: { fontSize: 12, color: '#00B894', fontWeight: 'bold' },
});
