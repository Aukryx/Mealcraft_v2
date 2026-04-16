import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getAllFavorites } from '../database/db';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // On recharge la liste à chaque fois que l'écran devient actif
  useFocusEffect(
    useCallback(() => {
      getAllFavorites().then(setFavorites);
    }, [])
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.favCard}
            onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
          >
            <Image source={{ uri: item.image_url }} style={styles.cardImage} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.viewMore}>Voir la recette →</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune recette favorite pour le moment. ❤️</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 15 },
  favCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 15, 
    flexDirection: 'row', 
    marginBottom: 15, 
    overflow: 'hidden',
    elevation: 2 
  },
  cardImage: { width: 100, height: 100 },
  cardInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3436' },
  viewMore: { fontSize: 12, color: '#00B894', marginTop: 5, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#B2BEC3', fontSize: 16, textAlign: 'center' }
});