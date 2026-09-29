import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types/auth';
import { authService } from '../services/authService';
import { storageService } from '../services/storageService';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  guestSignIn: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  recordDailyActivity: () => Promise<{ streak: number; incremented: boolean }>;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
  updateAccountDetails: (params: {
    displayName?: string;
    email?: string;
    password?: string;
    oldPassword?: string;
    photoURL?: string;
  }) => Promise<UserProfile>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initial load from storage
    loadUser();

    // Subscribe to Firebase Auth state changes
    const unsubscribe = authService.onAuthStateChanged(async (fbUser) => {
      if (fbUser) {
        try {
          const profile = await authService.fetchUserProfile(fbUser);
          setUser(profile);
        } catch (e) {
          console.warn('Auth state profile fetch error:', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loadUser = async () => {
    try {
      const u = await authService.getCurrentUser();
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      const u = await authService.signIn(email, pass);
      setUser(u);
    } catch (err: any) {
      const msg = err.message || 'Failed to sign in.';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, pass: string, name?: string) => {
    setLoading(true);
    setError(null);
    try {
      const u = await authService.signUp(email, pass, name);
      setUser(u);
    } catch (err: any) {
      const msg = err.message || 'Failed to create account.';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const u = await authService.signInWithGoogle();
      setUser(u);
    } catch (err: any) {
      const msg = err.message || 'Failed to sign in with Google.';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const guestSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const u = await authService.signInAsGuest();
      setUser(u);
    } catch (err: any) {
      setError(err.message || 'Failed to enter guest mode.');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await authService.signOut();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await authService.resetPassword(email);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email.');
      throw err;
    }
  };

  const refreshUser = async () => {
    await loadUser();
  };

  const recordDailyActivity = async (): Promise<{ streak: number; incremented: boolean }> => {
    try {
      const res = await authService.recordStreakActivity(user?.uid);
      await loadUser();
      return res;
    } catch {
      return { streak: user?.streak || 1, incremented: false };
    }
  };

  const updateUser = async (updates: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      storageService.saveUser(updated);
      return updated;
    });
  };

  const updateAccountDetails = async (params: {
    displayName?: string;
    email?: string;
    password?: string;
    oldPassword?: string;
    photoURL?: string;
  }): Promise<UserProfile> => {
    setError(null);
    try {
      const updated = await authService.updateAccountDetails(params);
      setUser(updated);
      return updated;
    } catch (err: any) {
      setError(err.message || 'Failed to update account details.');
      throw err;
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signIn,
        signUp,
        signInWithGoogle,
        guestSignIn,
        signOut,
        resetPassword,
        refreshUser,
        recordDailyActivity,
        updateUser,
        updateAccountDetails,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

