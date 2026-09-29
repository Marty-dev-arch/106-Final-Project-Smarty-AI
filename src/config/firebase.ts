import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  // @ts-ignore
  getReactNativePersistence,
  Auth,
} from 'firebase/auth';
import { initializeFirestore, getFirestore, setLogLevel, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Suppress verbose Firestore offline connection logs
try {
  setLogLevel('error');
} catch {}

// Standard Firebase config - loaded from environment variables or project defaults
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAGiKeauTys0bZpcYJcaEdod1sJF_peDV8',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'martyai-cf143.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'martyai-cf143',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'martyai-cf143.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '631755937977',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:631755937977:web:6d11847e44422614222368',
};

export const hasRealFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'AIzaSyDummyKey_SmartyAI_Default' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'smarty-ai-app'
);

let app: any = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let isFirebaseInitialized = false;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      auth = getAuth(app);
    }
  }

  const databaseId = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_ID || 'default';

  try {
    db = initializeFirestore(app, { experimentalForceLongPolling: true }, databaseId);
  } catch {
    db = getFirestore(app, databaseId);
  }
  isFirebaseInitialized = true;
} catch (error) {
  console.warn('Firebase initialization notice:', error);
}

export { app, auth, db, isFirebaseInitialized };

