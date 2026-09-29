import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  background: string;
  card: string;
  cardBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  border: string;
  surface: string;
  inputBg: string;
  isDark: boolean;
}

export const lightTheme: ThemeColors = {
  background: '#F8FAFC',
  card: '#FFFFFF',
  cardBorder: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  primary: '#6D44F2',
  primaryLight: '#EEF2FF',
  border: '#F1F5F9',
  surface: '#FFFFFF',
  inputBg: '#F8FAFC',
  isDark: false,
};

export const darkTheme: ThemeColors = {
  background: '#0B0F19',
  card: '#161F30',
  cardBorder: '#1E293B',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  primary: '#8B5CF6',
  primaryLight: '#1E1B4B',
  border: '#1E293B',
  surface: '#111827',
  inputBg: '#0F172A',
  isDark: true,
};

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_STORAGE_KEY = '@smarty_ai_theme_mode';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'dark' || stored === 'light' || stored === 'system') {
          setThemeModeState(stored as ThemeMode);
        }
      } catch (e) {
        console.warn('Error loading theme preference:', e);
      }
    })();
  }, []);

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  const colors = isDark ? darkTheme : lightTheme;

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Error saving theme preference:', e);
    }
  };

  const toggleTheme = async () => {
    const next = isDark ? 'light' : 'dark';
    await setThemeMode(next);
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        isDark,
        colors,
        setThemeMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
