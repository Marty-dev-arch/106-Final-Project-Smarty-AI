import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  signInAnonymously,
  updateProfile,
  updateEmail as fbUpdateEmail,
  updatePassword as fbUpdatePassword,
  sendPasswordResetEmail,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
  reauthenticateWithCredential,
  onAuthStateChanged as fbOnAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, db, isFirebaseInitialized } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from '../types/auth';
import { storageService } from './storageService';
import { initialUser } from '../utils/mockData';

import { getLocalDateString, evaluateStreak, recordDailyActivityStreak } from '../utils/streakHelper';

/**
 * Format Firebase Auth error codes into clean, user-friendly error messages.
 */
function parseAuthError(err: any): string {
  if (!err) return 'An unexpected authentication error occurred.';
  const code = err.code || '';
  
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'The current/old password entered is incorrect. Please try again.';
    case 'auth/email-already-in-use':
      return 'This email address is already registered. Please use a different email.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'New password should be at least 6 characters long.';
    case 'auth/requires-recent-login':
      return 'For security, please log out and sign in again before changing your password or email.';
    case 'auth/user-not-found':
      return 'User account not found.';
    case 'auth/too-many-requests':
      return 'Access to this account has been temporarily disabled due to multiple failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid':
      return 'Invalid Firebase API Key. Please check your .env configuration.';
    default:
      if (err.message && typeof err.message === 'string') {
        return err.message.replace(/^Firebase:\s*/, '').replace(/\s*\(auth\/.*\)\.?$/, '');
      }
      return 'Authentication failed. Please try again.';
  }
}

export const authService = {
  /**
   * Fetch full user profile from Firestore, with fallback to Firebase Auth metadata.
   * Accurately verifies streak against calendar dates.
   */
  async fetchUserProfile(fbUser: FirebaseUser): Promise<UserProfile> {
    let firestoreData: any = null;
    if (db) {
      try {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          firestoreData = docSnap.data();
        }
      } catch (e) {
        console.warn('Could not fetch Firestore user doc:', e);
      }
    }

    const photoURL = firestoreData?.photoURL || fbUser.photoURL || undefined;
    const displayName =
      firestoreData?.displayName ||
      fbUser.displayName ||
      (fbUser.email ? fbUser.email.split('@')[0] : 'Learner');

    const rawStreak = firestoreData?.streak ?? 1;
    const rawLastActiveDate = firestoreData?.lastActiveDate;
    const rawLongestStreak = firestoreData?.longestStreak ?? rawStreak;

    // Evaluate streak validity
    const evaluation = evaluateStreak(rawStreak, rawLastActiveDate, rawLongestStreak);

    const profile: UserProfile = {
      uid: fbUser.uid,
      email: fbUser.email || firestoreData?.email || '',
      displayName,
      photoURL,
      isGuest: fbUser.isAnonymous,
      streak: evaluation.currentStreak,
      lastActiveDate: evaluation.lastActiveDate,
      longestStreak: evaluation.longestStreak,
      quizzesTaken: firestoreData?.quizzesTaken ?? 0,
      avgScore: firestoreData?.avgScore ?? 0,
      totalXP: firestoreData?.totalXP ?? 100,
      tier: firestoreData?.tier || 'Bronze Scholar',
      createdAt:
        firestoreData?.createdAt ||
        fbUser.metadata.creationTime ||
        new Date().toISOString(),
    };

    // If streak changed due to break, sync updated streak back to Firestore
    if (db && evaluation.isBroken && firestoreData) {
      try {
        setDoc(
          doc(db, 'users', fbUser.uid),
          { streak: 0, longestStreak: evaluation.longestStreak },
          { merge: true }
        ).catch(() => {});
      } catch {}
    }

    await storageService.saveUser(profile);
    return profile;
  },

  /**
   * Sign in with Google using Firebase Auth.
   */
  async signInWithGoogle(): Promise<UserProfile> {
    if (isFirebaseInitialized && auth) {
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const userCredential = await signInWithPopup(auth, provider);
        const fbUser = userCredential.user;
        return await this.fetchUserProfile(fbUser);
      } catch (err: any) {
        if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
          throw new Error('Google Sign-In was cancelled.');
        }
        throw new Error(parseAuthError(err));
      }
    }

    // Local offline fallback mode
    const todayStr = getLocalDateString();
    const user: UserProfile = {
      uid: 'google_' + Date.now(),
      email: 'scholar@gmail.com',
      displayName: 'Google Scholar',
      isGuest: false,
      streak: 1,
      lastActiveDate: todayStr,
      longestStreak: 1,
      quizzesTaken: 0,
      avgScore: 0,
      totalXP: 100,
      tier: 'Bronze Initiate',
      createdAt: new Date().toISOString(),
    };
    await storageService.saveUser(user);
    return user;
  },

  /**
   * Sign in with Email and Password using Firebase Auth.
   */
  async signIn(email: string, pass: string): Promise<UserProfile> {
    if (isFirebaseInitialized && auth) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const fbUser = userCredential.user;
        return await this.fetchUserProfile(fbUser);
      } catch (err: any) {
        throw new Error(parseAuthError(err));
      }
    }

    // Local offline fallback mode
    const user: UserProfile = {
      ...initialUser,
      email,
      displayName: email.split('@')[0] || 'Learner',
      isGuest: false,
    };
    await storageService.saveUser(user);
    return user;
  },

  /**
   * Register a new user with Email and Password in Firebase Auth.
   */
  async signUp(email: string, pass: string, displayName?: string): Promise<UserProfile> {
    if (isFirebaseInitialized && auth) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const fbUser = userCredential.user;
        
        if (displayName) {
          await updateProfile(fbUser, { displayName });
        }

        const todayStr = getLocalDateString();
        const initialProfile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email || email,
          displayName: displayName || email.split('@')[0],
          isGuest: false,
          streak: 1,
          lastActiveDate: todayStr,
          longestStreak: 1,
          quizzesTaken: 0,
          avgScore: 0,
          totalXP: 100,
          tier: 'Bronze Initiate',
          createdAt: new Date().toISOString(),
        };

        if (db) {
          try {
            await setDoc(doc(db, 'users', fbUser.uid), {
              ...initialProfile,
              createdAt: new Date().toISOString(),
            });
          } catch (e) {
            console.warn('Firestore user init warning:', e);
          }
        }
        
        await storageService.saveUser(initialProfile);
        return initialProfile;
      } catch (err: any) {
        throw new Error(parseAuthError(err));
      }
    }

    // Local offline fallback registration
    const todayStr = getLocalDateString();
    const user: UserProfile = {
      uid: 'user_' + Date.now(),
      email,
      displayName: displayName || email.split('@')[0],
      isGuest: false,
      streak: 1,
      lastActiveDate: todayStr,
      longestStreak: 1,
      quizzesTaken: 0,
      avgScore: 0,
      totalXP: 100,
      tier: 'Bronze Initiate',
      createdAt: new Date().toISOString(),
    };
    await storageService.saveUser(user);
    return user;
  },

  /**
   * Sign in anonymously as guest.
   */
  async signInAsGuest(): Promise<UserProfile> {
    const todayStr = getLocalDateString();
    if (isFirebaseInitialized && auth) {
      try {
        const cred = await signInAnonymously(auth);
        const profile: UserProfile = {
          uid: cred.user.uid,
          email: 'guest@smartyai.app',
          displayName: 'Guest Scholar',
          isGuest: true,
          streak: 1,
          lastActiveDate: todayStr,
          longestStreak: 1,
          quizzesTaken: 0,
          avgScore: 0,
          totalXP: 50,
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
      lastActiveDate: todayStr,
      longestStreak: 1,
      quizzesTaken: 0,
      avgScore: 0,
      totalXP: 50,
      tier: 'Explorer',
      createdAt: new Date().toISOString(),
    };
    await storageService.saveUser(guest);
    return guest;
  },

  /**
   * Record a daily study streak for the current or specified user in Firebase Firestore and local storage.
   */
  async recordStreakActivity(uid?: string): Promise<{ streak: number; incremented: boolean }> {
    const user = await storageService.getUser();
    if (!user) return { streak: 1, incremented: false };

    const result = recordDailyActivityStreak(
      user.streak,
      user.lastActiveDate,
      user.longestStreak || user.streak
    );

    const updatedUser: UserProfile = {
      ...user,
      streak: result.newStreak,
      lastActiveDate: result.lastActiveDate,
      longestStreak: result.newLongestStreak,
    };

    await storageService.saveUser(updatedUser);

    const targetUid = uid || user.uid || auth?.currentUser?.uid;
    if (isFirebaseInitialized && db && targetUid) {
      try {
        await setDoc(
          doc(db, 'users', targetUid),
          {
            streak: result.newStreak,
            lastActiveDate: result.lastActiveDate,
            longestStreak: result.newLongestStreak,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Could not sync streak to Firestore:', e);
      }
    }

    return {
      streak: result.newStreak,
      incremented: result.streakIncremented,
    };
  },

  /**
   * Sign out current user.
   */
  async signOut(): Promise<void> {
    if (isFirebaseInitialized && auth) {
      try {
        await fbSignOut(auth);
      } catch (e) {
        console.warn('Sign out error:', e);
      }
    }
    await storageService.clearUser();
  },

  /**
   * Attach listener for Firebase Auth State Changes.
   */
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    if (isFirebaseInitialized && auth) {
      return fbOnAuthStateChanged(auth, callback);
    }
    return () => {};
  },

  /**
   * Update user account details (name, email, password, photo) across
   * Firebase Auth, Firestore database, and local storage.
   */
  async updateAccountDetails(params: {
    displayName?: string;
    email?: string;
    password?: string;
    oldPassword?: string;
    photoURL?: string;
  }): Promise<UserProfile> {
    const currentUser = await storageService.getUser();
    const fbUser = auth?.currentUser;

    let updatedName = (params.displayName !== undefined ? params.displayName.trim() : currentUser?.displayName) || 'Learner';
    let updatedEmail = (params.email !== undefined ? params.email.trim() : currentUser?.email) || '';
    let updatedPhoto = params.photoURL ?? currentUser?.photoURL;

    if (isFirebaseInitialized && fbUser) {
      try {
        // 1. Update Display Name / Photo in Firebase Auth
        if (params.displayName !== undefined || params.photoURL !== undefined) {
          await updateProfile(fbUser, {
            displayName: updatedName,
            photoURL: updatedPhoto || null,
          });
        }

        // 2. If password or email change is requested, re-authenticate if oldPassword was provided
        if (params.oldPassword && (params.password || params.email) && fbUser.email) {
          const credential = EmailAuthProvider.credential(fbUser.email, params.oldPassword.trim());
          await reauthenticateWithCredential(fbUser, credential);
        }

        // 3. Update Email in Firebase Auth if changed
        if (params.email && params.email.trim().toLowerCase() !== (fbUser.email || '').toLowerCase()) {
          await fbUpdateEmail(fbUser, params.email.trim());
          updatedEmail = params.email.trim();
        }

        // 4. Update Password in Firebase Auth if provided
        if (params.password && params.password.trim().length >= 6) {
          await fbUpdatePassword(fbUser, params.password.trim());
        }

        // 4. Update Firestore user document
        if (db) {
          const userDocRef = doc(db, 'users', fbUser.uid);
          await setDoc(
            userDocRef,
            {
              displayName: updatedName,
              email: updatedEmail,
              photoURL: updatedPhoto || null,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      } catch (err: any) {
        throw new Error(parseAuthError(err));
      }
    }

    const updatedProfile: UserProfile = {
      ...(currentUser || {
        uid: fbUser?.uid || 'local_' + Date.now(),
        email: updatedEmail,
        displayName: updatedName,
        isGuest: false,
        streak: 1,
        quizzesTaken: 0,
        avgScore: 0,
        totalXP: 100,
        tier: 'Scholar',
        createdAt: new Date().toISOString(),
      }),
      displayName: updatedName,
      email: updatedEmail,
      photoURL: updatedPhoto,
    };

    await storageService.saveUser(updatedProfile);
    return updatedProfile;
  },

  /**
   * Send password reset email via Firebase Auth.
   */
  async resetPassword(email: string): Promise<void> {
    if (!email || !email.trim()) {
      throw new Error('Please enter your registered email address.');
    }
    if (isFirebaseInitialized && auth) {
      try {
        await sendPasswordResetEmail(auth, email.trim());
      } catch (err: any) {
        throw new Error(parseAuthError(err));
      }
    }
  },

  /**
   * Get current stored user profile.
   */
  async getCurrentUser(): Promise<UserProfile | null> {
    return await storageService.getUser();
  },
};

