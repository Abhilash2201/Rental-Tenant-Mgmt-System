/**
 * @file firebase.js
 * @description Firebase configuration for React Native/Expo mobile app.
 *
 * Install: npx expo install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/storage
 *
 * Environment variables needed (.env):
 *   EXPO_PUBLIC_FIREBASE_PROJECT_ID
 *   EXPO_PUBLIC_FIREBASE_API_KEY
 *   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
 *   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
 *   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 *   EXPO_PUBLIC_FIREBASE_APP_ID
 */

import { initializeApp } from "@react-native-firebase/app";
import auth from "@react-native-firebase/auth";
import storage from "@react-native-firebase/storage";

// Firebase configuration object
const firebaseConfig = {
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (already initialized in @react-native-firebase/app)
// The initialization happens automatically when the app starts

// Export modules for use in the app
export { auth, storage };
