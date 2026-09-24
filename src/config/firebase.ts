import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  // @ts-ignore
  getReactNativePersistence,
  Auth,
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Standard Firebase config - replace with your Firebase project credentials or pass via environment
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDummyKey_SmartyAI_Default',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'smarty-ai-app.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'smarty-ai-app',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'smarty-ai-app.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:123456789012:web:abcdef123456',
};

export const hasRealFirebaseConfig = Boolean(
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY &&
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY !== 'AIzaSyDummyKey_SmartyAI_Default' &&
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID !== 'smarty-ai-app'
);

let app: any = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let isFirebaseInitialized = false;

if (hasRealFirebaseConfig) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
      try {
        auth = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
      } catch {
        auth = getAuth(app);
      }
      db = getFirestore(app);
      isFirebaseInitialized = true;
    } else {
      app = getApp();
      auth = getAuth(app);
      db = getFirestore(app);
      isFirebaseInitialized = true;
    }
  } catch (error) {
    console.warn('Firebase initialized in fallback mode:', error);
  }
}

export { app, auth, db, isFirebaseInitialized };
