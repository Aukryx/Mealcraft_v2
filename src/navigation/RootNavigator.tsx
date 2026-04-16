import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SearchScreen from '../screens/SearchScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import PlanningScreen from '../screens/PlanningScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ShoppingListScreen from '../screens/ShoppingListScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import { isOnboardingDone } from '../database/db';

export type RootStackParamList = {
  Welcome: undefined;
  MainTabs: { initialTab?: keyof TabParamList };
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

function TabNavigator({ route }: any) {
  const initialTab = route.params?.initialTab ?? 'SearchTab';
  return (
    <Tab.Navigator
      initialRouteName={initialTab}
      screenOptions={{ headerShown: false, tabBarActiveTintColor: '#00B894' }}
    >
      <Tab.Screen name="SearchTab" component={SearchScreen} options={{ title: 'Recherche', tabBarIcon: () => <Text>🔍</Text> }} />
      <Tab.Screen name="PlanningTab" component={PlanningScreen} options={{ title: 'Planning', tabBarIcon: () => <Text>📅</Text> }} />
      <Tab.Screen name="FavoritesTab" component={FavoritesScreen} options={{ title: 'Favoris', tabBarIcon: () => <Text>❤️</Text> }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profil', tabBarIcon: () => <Text>👤</Text> }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const [initialRoute, setInitialRoute] = useState<'Welcome' | 'MainTabs' | null>(null);

  useEffect(() => {
    isOnboardingDone().then((done) => {
      setInitialRoute(done ? 'MainTabs' : 'Welcome');
    });
  }, []);

  if (!initialRoute) return null;

  return (
    <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerTitle: 'MealCraft' }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MainTabs" component={TabNavigator} options={{ title: 'MealCraft' }} />
      <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} options={{ title: 'Détails' }} />
      <Stack.Screen name="ShoppingList" component={ShoppingListScreen} options={{ title: 'Liste de courses' }} />
    </Stack.Navigator>
  );
}
