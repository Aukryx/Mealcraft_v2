import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { setOnboardingDone } from '../database/db';

export default function WelcomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleChoice = async (goToProfile: boolean) => {
    await setOnboardingDone();
    navigation.replace('MainTabs', { initialTab: goToProfile ? 'ProfileTab' : 'SearchTab' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.emoji}>🍽️</Text>
        <Text style={styles.title}>MealCraft</Text>
        <Text style={styles.subtitle}>
          Trouve des recettes avec ce que tu as, planifie ta semaine et suis tes apports nutritionnels.
        </Text>
      </View>

      <View style={styles.bottom}>
        <Text style={styles.question}>Comment veux-tu utiliser l'app ?</Text>

        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={() => handleChoice(false)}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryTitle}>Juste des recettes</Text>
          <Text style={styles.btnSubtitle}>Je cherche des idées de repas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={() => handleChoice(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.btnSecondaryTitle}>Suivre ma nutrition</Text>
          <Text style={styles.btnSubtitleDark}>Je veux configurer mes objectifs</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>Tu pourras changer ça à tout moment depuis l'onglet Profil.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#00B894', justifyContent: 'space-between' },

  top: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, paddingTop: 60 },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#FFF', marginBottom: 12 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 24 },

  bottom: {
    backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30,
    padding: 30, paddingBottom: 40,
  },
  question: { fontSize: 18, fontWeight: 'bold', color: '#2D3436', marginBottom: 20, textAlign: 'center' },

  btn: { borderRadius: 16, padding: 18, marginBottom: 14 },
  btnPrimary: { backgroundColor: '#00B894' },
  btnPrimaryTitle: { fontSize: 17, fontWeight: 'bold', color: '#FFF', marginBottom: 2 },
  btnSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  btnSecondary: { backgroundColor: '#F8F9FA', borderWidth: 1.5, borderColor: '#DFE6E9' },
  btnSecondaryTitle: { fontSize: 17, fontWeight: 'bold', color: '#2D3436', marginBottom: 2 },
  btnSubtitleDark: { fontSize: 13, color: '#636E72' },

  hint: { fontSize: 12, color: '#B2BEC3', textAlign: 'center', marginTop: 6 },
});
