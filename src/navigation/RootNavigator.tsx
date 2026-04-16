import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SearchScreen from '../screens/SearchScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import PlanningScreen from '../screens/PlanningScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ShoppingListScreen from '../screens/ShoppingListScreen';

// 1. Définition des types pour la navigation
export type RootStackParamList = {
  MainTabs: undefined;
  RecipeDetail: { recipeId: number };
  ShoppingList: undefined;
};

export type TabParamList = {
  SearchTab: undefined;
  PlanningTab: undefined;
  FavoritesTab: undefined;
  ProfileTab: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// 2. Le menu du bas (Tabs)
function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ 
      headerShown: false,
      tabBarActiveTintColor: '#00B894',
    }}>
      <Tab.Screen 
        name="SearchTab" 
        component={SearchScreen} 
        options={{ title: 'Recherche', tabBarIcon: () => <Text>🔍</Text> }} 
      />
      <Tab.Screen 
        name="PlanningTab" 
        component={PlanningScreen} 
        options={{ title: 'Planning', tabBarIcon: () => <Text>📅</Text> }} 
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesScreen}
        options={{ title: 'Favoris', tabBarIcon: () => <Text>❤️</Text> }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'Profil', tabBarIcon: () => <Text>👤</Text> }}
      />
    </Tab.Navigator>
  );
}

// 3. Le navigateur principal (Stack)
export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerTitle: 'MealCraft' }}>
      {/* On affiche les onglets en premier */}
      <Stack.Screen name="MainTabs" component={TabNavigator} options={{ title: 'MealCraft' }} />
      {/* Les détails sont hors des onglets pour cacher le menu en bas quand on lit une recette */}
      <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} options={{ title: 'Détails' }} />
      <Stack.Screen name="ShoppingList" component={ShoppingListScreen} options={{ title: 'Liste de courses' }} />
    </Stack.Navigator>
  );
}
