import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SEARCH_COST } from '../utils/creditManager';

interface Props {
  visible: boolean;
  onClose: () => void;
  onWatchAd: () => void;
  onGoPremium: () => void;
  balance: number;
  cost?: number;
}

export default function CreditModal({ visible, onClose, onWatchAd, onGoPremium, balance, cost = SEARCH_COST }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.emoji}>⚡</Text>
          <Text style={styles.title}>Zests insuffisants</Text>
          <Text style={styles.body}>
            Cette action coûte {cost} Zest{cost > 1 ? 's' : ''}.{'\n'}
            Ton solde actuel : <Text style={styles.balance}>{balance} Zest{balance !== 1 ? 's' : ''}</Text>.
          </Text>

          <TouchableOpacity style={styles.adBtn} onPress={onWatchAd}>
            <Text style={styles.adBtnText}>Regarder une pub  +10 Zests</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.premiumBtn} onPress={onGoPremium}>
            <Text style={styles.premiumBtnText}>Passer Premium</Text>
            <Text style={styles.premiumSub}>500 Zests/jour, sans pubs</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancel}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  emoji: { fontSize: 40, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2D3436', marginBottom: 10 },
  body: { fontSize: 15, color: '#636E72', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  balance: { fontWeight: 'bold', color: '#2D3436' },
  adBtn: {
    backgroundColor: '#0984E3',
    width: '100%',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  adBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  premiumBtn: {
    backgroundColor: '#6C5CE7',
    width: '100%',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  premiumBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  premiumSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 3 },
  cancel: { color: '#B2BEC3', fontSize: 15, fontWeight: '600' },
});
