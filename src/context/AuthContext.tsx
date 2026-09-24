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
  guestSignIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
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
      setError(err.message || 'Failed to sign in.');
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
      setError(err.message || 'Failed to sign up.');
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
      const guest = await authService.signInAsGuest();
      setUser(guest);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    await loadUser();
  };

  const updateUser = async (updates: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      storageService.saveUser(updated);
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signIn,
        signUp,
        guestSignIn,
        signOut,
        refreshUser,
        updateUser,
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
