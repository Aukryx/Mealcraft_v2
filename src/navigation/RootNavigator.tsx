import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SearchScreen from '../screens/SearchScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen'; // On va le créer après

export type RootStackParamList = {
  Search: undefined;
  RecipeDetail: { recipeId: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerTitle: 'MealCraft' }}>
      <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Recherche' }} />
      <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} options={{ title: 'Détails' }} />
    </Stack.Navigator>
  );
}