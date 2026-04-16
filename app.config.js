import 'dotenv/config'; // Charge le fichier .env

export default {
  expo: {
    name: "mealcraft_v2",
    slug: "mealcraft_v2",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/android-icon-foreground.png"
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-sqlite",
      "@react-native-community/datetimepicker"
    ],
    extra: {
      spoonacularApiKey: process.env.SPOONACULAR_API_KEY,
    }
  }
};