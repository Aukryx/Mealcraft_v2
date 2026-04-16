import React, { useEffect, useState } from 'react';
import { 
  View, Text, ScrollView, Image, StyleSheet, ActivityIndicator, 
  TouchableOpacity, Alert, Modal, Platform 
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RootStackParamList } from '../navigation/RootNavigator';
import { getRecipeInformation } from '../api/recipes';
import { RecipeDetail } from '../types/api';
import { addToPlanning, isFavorite, toggleFavorite } from '../database/db';

export default function RecipeDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'RecipeDetail'>>();
  const { recipeId } = route.params;
  
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);

  // States pour le Planning & Modal
  const [servings, setServings] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [mealSlot, setMealSlot] = useState<'lunch' | 'dinner'>('lunch');

  useEffect(() => {
    Promise.all([
      getRecipeInformation(recipeId),
      isFavorite(recipeId)
    ]).then(([recipeData, favStatus]) => {
      setRecipe(recipeData);
      setIsFav(favStatus);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [recipeId]);

  const handleToggleFavorite = async () => {
    const newState = await toggleFavorite(recipeId);
    setIsFav(newState);
  };

  const confirmAddToPlanning = async () => {
    if (!recipe) return;
    // Formatage de la date en YYYY-MM-DD local
    const dateString = selectedDate.toISOString().split('T')[0];
    
    const success = await addToPlanning(recipe, dateString, mealSlot, servings);
    if (success) {
      setShowModal(false);
      Alert.alert("🎉 Planifié !", `La recette a été ajoutée pour le ${selectedDate.toLocaleDateString('fr-FR')}.`);
    }
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#00B894" /></View>
  );

  if (!recipe) return (
    <View style={styles.center}><Text>Recette introuvable.</Text></View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Image & Favoris */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: recipe.image }} style={styles.image} />
        <TouchableOpacity style={styles.favCircle} onPress={handleToggleFavorite}>
          <Text style={{ fontSize: 24 }}>{isFav ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>{recipe.title}</Text>
        <Text style={styles.subtitle}>⏱️ {recipe.readyInMinutes} min  •  🍴 {recipe.servings} portions</Text>

        {/* Grille Nutritionnelle */}
        <View style={styles.nutritionGrid}>
          {recipe.nutrition?.nutrients.slice(0, 4).map((n, i) => (
            <View key={i} style={styles.nutritionItem}>
              <Text style={styles.nutriValue}>{Math.round(n.amount)}{n.unit}</Text>
              <Text style={styles.nutriLabel}>{n.name}</Text>
            </View>
          ))}
        </View>

        {/* Instructions */}
        <Text style={styles.sectionTitle}>Instructions</Text>
        <Text style={styles.instructions}>
          {(recipe.instructions ?? "Aucune instruction disponible.")
            .replace(/<[^>]*>?/gm, '')}
        </Text>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.mainPlanBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.mainPlanBtnText}>Ajouter au Planning 📅</Text>
        </TouchableOpacity>
      </View>

      {/* --- MODAL DE PLANIFICATION --- */}
      <Modal visible={showModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Planifier mon repas</Text>

            {/* 1. Sélecteur de portions */}
            <Text style={styles.modalLabel}>Combien de portions ?</Text>
            <View style={styles.servingsRow}>
              <TouchableOpacity onPress={() => setServings(Math.max(1, servings - 1))} style={styles.stepBtn}>
                <Text style={styles.stepBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.servingsVal}>{servings}</Text>
              <TouchableOpacity onPress={() => setServings(servings + 1)} style={styles.stepBtn}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* 2. Sélecteur de Date */}
            <Text style={styles.modalLabel}>Pour quel jour ?</Text>
            <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateText}>{selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_event: unknown, date?: Date) => {
                  setShowDatePicker(false);
                  if (date) setSelectedDate(date);
                }}
              />
            )}

            {/* 3. Choix Midi / Soir */}
            <View style={styles.slotRow}>
              <TouchableOpacity 
                style={[styles.slotBtn, mealSlot === 'lunch' && styles.slotActive]} 
                onPress={() => setMealSlot('lunch')}
              >
                <Text style={[styles.slotBtnText, mealSlot === 'lunch' && styles.textWhite]}>☀️ Midi</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.slotBtn, mealSlot === 'dinner' && styles.slotActive]} 
                onPress={() => setMealSlot('dinner')}
              >
                <Text style={[styles.slotBtnText, mealSlot === 'dinner' && styles.textWhite]}>🌙 Soir</Text>
              </TouchableOpacity>
            </View>

            {/* Actions finales */}
            <View style={styles.footerActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmAddToPlanning}>
                <Text style={styles.confirmText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 260 },
  favCircle: {
    position: 'absolute', bottom: -25, right: 25, backgroundColor: 'white',
    width: 55, height: 55, borderRadius: 30, justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5,
  },
  content: { padding: 20, paddingTop: 30 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2D3436' },
  subtitle: { fontSize: 14, color: '#636E72', marginVertical: 10 },
  nutritionGrid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F8F9FA', padding: 15, borderRadius: 15, marginVertical: 15 },
  nutritionItem: { alignItems: 'center' },
  nutriValue: { fontWeight: 'bold', fontSize: 15 },
  nutriLabel: { fontSize: 11, color: '#636E72' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  instructions: { fontSize: 15, lineHeight: 24, color: '#444' },
  divider: { height: 1, backgroundColor: '#F1F2F6', marginVertical: 25 },
  mainPlanBtn: { backgroundColor: '#00B894', padding: 18, borderRadius: 15, alignItems: 'center' },
  mainPlanBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // Styles Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#636E72', marginBottom: 10 },
  servingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FA', padding: 10, borderRadius: 15, marginBottom: 20 },
  stepBtn: { width: 40, height: 40, backgroundColor: '#FFF', borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  stepBtnText: { fontSize: 20, fontWeight: 'bold' },
  servingsVal: { fontSize: 24, fontWeight: 'bold', marginHorizontal: 30 },
  datePickerBtn: { padding: 15, backgroundColor: '#F8F9FA', borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  dateText: { fontSize: 16, color: '#00B894', fontWeight: 'bold' },
  slotRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  slotBtn: { flex: 0.48, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#DFE6E9', alignItems: 'center' },
  slotActive: { backgroundColor: '#0984E3', borderColor: '#0984E3' },
  slotBtnText: { fontWeight: 'bold', color: '#2D3436' },
  textWhite: { color: '#FFF' },
  footerActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  cancelBtn: { flex: 0.4, padding: 15, alignItems: 'center' },
  cancelText: { color: '#FF7675', fontWeight: 'bold' },
  confirmBtn: { flex: 0.55, backgroundColor: '#00B894', padding: 15, borderRadius: 12, alignItems: 'center' },
  confirmText: { color: '#FFF', fontWeight: 'bold' },
});