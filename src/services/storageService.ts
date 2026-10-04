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
    const updated = [quiz, ...list.filter((q) => q.id !== quiz.id)];
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

  async deleteQuiz(id: string): Promise<void> {
    const list = await this.getQuizzes();
    const updated = list.filter((q) => q.id !== id);
    await this.saveQuizzes(updated);

    // Cascade delete mistakes associated with this quiz
    const mistakes = await this.getMistakes();
    const updatedMistakes = mistakes.filter((m) => m.quizId !== id);
    await this.saveMistakes(updatedMistakes);

    // Cascade delete attempts associated with this quiz
    const attempts = await this.getAttempts();
    const updatedAttempts = attempts.filter((a) => a.quizId !== id);
    try {
      await AsyncStorage.setItem(KEYS.ATTEMPTS, JSON.stringify(updatedAttempts));
    } catch {}
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
      const storedKey = (await AsyncStorage.getItem(KEYS.GEMINI_KEY))?.trim();
      if (storedKey && storedKey.length >= 20 && !storedKey.includes('your_')) return storedKey;

      const envKey = GEMINI_CONFIG.defaultApiKey?.trim();
      if (envKey && envKey.length >= 20 && !envKey.includes('your_')) return envKey;

      return storedKey || envKey || '';
    } catch {
      return GEMINI_CONFIG.defaultApiKey || '';
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

  async deleteAllQuizzesAndFiles(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        KEYS.QUIZZES,
        KEYS.ATTEMPTS,
        KEYS.MISTAKES,
        '@smarty_ai_uploaded_materials',
        '@smarty_ai_uploaded_files',
      ]);

      const userData = await AsyncStorage.getItem(KEYS.USER);
      if (userData) {
        const parsed = JSON.parse(userData);
        const resetUser = {
          ...parsed,
          quizzesTaken: 0,
          avgScore: 0,
        };
        await AsyncStorage.setItem(KEYS.USER, JSON.stringify(resetUser));
      }
    } catch (e) {
      console.warn('Error clearing quizzes and files from storage:', e);
    }
  },
};
