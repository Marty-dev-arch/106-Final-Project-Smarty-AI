import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types/auth';
import { Quiz, QuizAttempt, MistakeItem, Medal } from '../types/quiz';
import { initialUser, sampleQuizzes, sampleMedals, sampleMistakes } from '../utils/mockData';
import { GEMINI_CONFIG } from '../config/gemini';

const KEYS = {
  USER: '@smarty_ai_user',
  QUIZZES: '@smarty_ai_quizzes',
  ATTEMPTS: '@smarty_ai_attempts',
  MISTAKES: '@smarty_ai_mistakes',
  MEDALS: '@smarty_ai_medals',
  GEMINI_KEY: GEMINI_CONFIG.storageKey,
};

export const storageService = {
  // User Profile
  async getUser(): Promise<UserProfile | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.USER);
      if (data) return JSON.parse(data);
      return null;
    } catch {
      return null;
    }
  },

  async saveUser(user: UserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
    } catch (e) {
      console.warn('Error saving user to storage:', e);
    }
  },

  async clearUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.USER);
    } catch (e) {
      console.warn('Error clearing user from storage:', e);
    }
  },

  // Quizzes
  async getQuizzes(): Promise<Quiz[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.QUIZZES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveQuizzes(quizzes: Quiz[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.QUIZZES, JSON.stringify(quizzes));
    } catch (e) {
      console.warn('Error saving quizzes:', e);
    }
  },

  async addQuiz(quiz: Quiz): Promise<void> {
    const list = await this.getQuizzes();
    const updated = [quiz, ...list];
    await this.saveQuizzes(updated);
  },

  async updateQuiz(quiz: Quiz): Promise<void> {
    const list = await this.getQuizzes();
    const index = list.findIndex((q) => q.id === quiz.id);
    let updated: Quiz[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = quiz;
    } else {
      updated = [quiz, ...list];
    }
    await this.saveQuizzes(updated);
  },

  // Attempts
  async getAttempts(): Promise<QuizAttempt[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.ATTEMPTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveAttempt(attempt: QuizAttempt): Promise<void> {
    try {
      const attempts = await this.getAttempts();
      await AsyncStorage.setItem(KEYS.ATTEMPTS, JSON.stringify([attempt, ...attempts]));
    } catch (e) {
      console.warn('Error saving attempt:', e);
    }
  },

  // Mistakes
  async getMistakes(): Promise<MistakeItem[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.MISTAKES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveMistakes(mistakes: MistakeItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.MISTAKES, JSON.stringify(mistakes));
    } catch (e) {
      console.warn('Error saving mistakes:', e);
    }
  },

  async addMistakes(newMistakes: MistakeItem[]): Promise<void> {
    const existing = await this.getMistakes();
    const combined = [...newMistakes, ...existing];
    await this.saveMistakes(combined);
  },

  async removeMistake(id: string): Promise<void> {
    const existing = await this.getMistakes();
    const filtered = existing.filter((m) => m.id !== id);
    await this.saveMistakes(filtered);
  },

  // Medals
  async getMedals(): Promise<Medal[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.MEDALS);
      if (data) return JSON.parse(data);
      return sampleMedals;
    } catch {
      return sampleMedals;
    }
  },

  async saveMedals(medals: Medal[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.MEDALS, JSON.stringify(medals));
    } catch (e) {
      console.warn('Error saving medals:', e);
    }
  },

  // Gemini API Key
  async getGeminiApiKey(): Promise<string> {
    try {
      const key = await AsyncStorage.getItem(KEYS.GEMINI_KEY);
      return key || GEMINI_CONFIG.defaultApiKey;
    } catch {
      return GEMINI_CONFIG.defaultApiKey;
    }
  },

  async saveGeminiApiKey(key: string): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.GEMINI_KEY, key.trim());
    } catch (e) {
      console.warn('Error saving Gemini API key:', e);
    }
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(KEYS));
    } catch (e) {
      console.warn('Error clearing storage:', e);
    }
  },
};
