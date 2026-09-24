import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  signInAnonymously,
  updateProfile,
} from 'firebase/auth';
import { auth, isFirebaseInitialized } from '../config/firebase';
import { UserProfile } from '../types/auth';
import { storageService } from './storageService';
import { initialUser } from '../utils/mockData';

export const authService = {
  async signIn(email: string, pass: string): Promise<UserProfile> {
    if (isFirebaseInitialized && auth) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const fbUser = userCredential.user;
        const profile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email || email,
          displayName: fbUser.displayName || email.split('@')[0],
          isGuest: false,
          streak: 6,
          quizzesTaken: 24,
          avgScore: 87,
          totalXP: 2450,
          tier: 'Gold Scholar',
          createdAt: new Date().toISOString(),
        };
        await storageService.saveUser(profile);
        return profile;
      } catch (err: any) {
        // If Firebase error occurs, check if it's invalid credentials or config issue
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
          throw new Error('Invalid email or password.');
        }
        console.warn('Firebase signIn fallback:', err.message);
      }
    }

    // Local / offline fallback sign-in
    const user: UserProfile = {
      ...initialUser,
      email,
      displayName: email.split('@')[0] || 'Learner',
      isGuest: false,
    };
    await storageService.saveUser(user);
    return user;
  },

  async signUp(email: string, pass: string, displayName?: string): Promise<UserProfile> {
    if (isFirebaseInitialized && auth) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const fbUser = userCredential.user;
        if (displayName) {
          await updateProfile(fbUser, { displayName });
        }
        const profile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email || email,
          displayName: displayName || email.split('@')[0],
          isGuest: false,
          streak: 1,
          quizzesTaken: 0,
          avgScore: 0,
          totalXP: 100,
          tier: 'Bronze Initiate',
          createdAt: new Date().toISOString(),
        };
        await storageService.saveUser(profile);
        return profile;
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          throw new Error('This email is already registered.');
        }
        console.warn('Firebase signUp fallback:', err.message);
      }
    }

    // Local / offline fallback sign-up
    const user: UserProfile = {
      uid: 'user_' + Date.now(),
      email,
      displayName: displayName || email.split('@')[0],
      isGuest: false,
      streak: 1,
      quizzesTaken: 0,
      avgScore: 0,
      totalXP: 100,
      tier: 'Bronze Initiate',
      createdAt: new Date().toISOString(),
    };
    await storageService.saveUser(user);
    return user;
  },

  async signInAsGuest(): Promise<UserProfile> {
    if (isFirebaseInitialized && auth) {
      try {
        const cred = await signInAnonymously(auth);
        const profile: UserProfile = {
          uid: cred.user.uid,
          email: 'guest@smartyai.app',
          displayName: 'Guest Scholar',
          isGuest: true,
          streak: 1,
          quizzesTaken: 4,
          avgScore: 78,
          totalXP: 450,
          tier: 'Explorer',
          createdAt: new Date().toISOString(),
        };
        await storageService.saveUser(profile);
        return profile;
      } catch (err) {
        console.warn('Anonymous sign-in fallback:', err);
      }
    }

    const guest: UserProfile = {
      uid: 'guest_' + Date.now(),
      email: 'guest@smartyai.app',
      displayName: 'Guest Scholar',
      isGuest: true,
      streak: 1,
      quizzesTaken: 4,
      avgScore: 78,
      totalXP: 450,
      tier: 'Explorer',
      createdAt: new Date().toISOString(),
    };
    await storageService.saveUser(guest);
    return guest;
  },

  async signOut(): Promise<void> {
    if (isFirebaseInitialized && auth) {
      try {
        await fbSignOut(auth);
      } catch (e) {
        console.warn('Sign out error:', e);
      }
    }
  },

  async getCurrentUser(): Promise<UserProfile | null> {
    return await storageService.getUser();
  },
};
