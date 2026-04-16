import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SearchScreen from '../screens/SearchScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import PlanningScreen from '../screens/PlanningScreen';

const Tab = createBottomTabNavigator();

export type RootStackParamList = {
  SearchMain: undefined;
  RecipeDetail: { recipeId: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function SearchStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="SearchMain" component={SearchScreen} options={{ title: 'Recherche' }} />
      <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} options={{ title: 'Détails' }} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Recherche" component={SearchStack} />
      <Tab.Screen name="Planning" component={PlanningScreen} options={{ headerShown: true }} />
    </Tab.Navigator>
  );
}