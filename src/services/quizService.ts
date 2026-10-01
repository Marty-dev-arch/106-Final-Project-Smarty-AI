import { Quiz, QuizAttempt, MistakeItem, Medal } from '../types/quiz';
import { UserProfile } from '../types/auth';
import { storageService } from './storageService';
import { auth, db, isFirebaseInitialized } from '../config/firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { recordDailyActivityStreak } from '../utils/streakHelper';

// ─── Firestore timeout helper ─────────────────────────────────────────────────

const withTimeout = <T>(promise: Promise<T>, ms = 15000): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Firestore timeout')), ms);
    promise.then(
      (res) => { clearTimeout(timer); resolve(res); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });

function getEffectiveUid(uid?: string): string | undefined {
  return uid || auth?.currentUser?.uid || undefined;
}

// ─── User-scoped collection path helpers ─────────────────────────────────────

/**
 * Returns the Firestore sub-collection path scoped to the logged-in user.
 * e.g. users/{uid}/quizzes
 * Falls back to the top-level collection if uid is unavailable (guest mode).
 */
function userQuizzesPath(uid?: string) {
  const effUid = getEffectiveUid(uid);
  if (effUid && db) return collection(db, 'users', effUid, 'quizzes');
  if (db) return collection(db, 'quizzes'); // anonymous / guest fallback
  return null;
}

function userQuizDocPath(uid: string | undefined, quizId: string) {
  if (!db) return null;
  const effUid = getEffectiveUid(uid);
  if (effUid) return doc(db, 'users', effUid, 'quizzes', quizId);
  return doc(db, 'quizzes', quizId);
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const quizService = {
  /** Current user UID — set externally by QuizContext so service knows the user. */
  currentUid: undefined as string | undefined,

  /**
   * Fetch all quizzes for the current user.
   * Tries Firestore first (with fast 3s fallback), merges with AsyncStorage.
   */
  async getQuizzes(): Promise<Quiz[]> {
    const localQuizzes = await storageService.getQuizzes();
    if (isFirebaseInitialized && db) {
      try {
        const col = userQuizzesPath(this.currentUid);
        if (col) {
          const snap: any = await withTimeout(getDocs(query(col, orderBy('createdAt', 'desc'))), 3000);
          if (snap && !snap.empty) {
            const remoteMap = new Map<string, Quiz>();
            snap.forEach((d: any) => remoteMap.set(d.id, { id: d.id, ...d.data() } as Quiz));

            // Merge local-only quizzes so offline creates are preserved
            for (const lq of localQuizzes) {
              if (!remoteMap.has(lq.id)) {
                remoteMap.set(lq.id, lq);
              }
            }

            return Array.from(remoteMap.values()).sort(
              (a, b) =>
                new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
          }
        }
      } catch {
        // Fall back cleanly to local storage
      }
    }
    return localQuizzes;
  },

  /**
   * Save a quiz to local storage immediately and sync to Firestore in background.
   */
  async saveQuiz(quiz: Quiz): Promise<void> {
    // 1. Always write locally first for instantaneous UX
    await storageService.addQuiz(quiz);

    // 2. Sync to Firestore in background without blocking the UI
    if (isFirebaseInitialized && db) {
      try {
        const docRef = userQuizDocPath(this.currentUid, quiz.id);
        if (docRef) {
          setDoc(docRef, quiz, { merge: true })
            .then(() => console.log('[quizService] Quiz saved to Firestore:', quiz.id))
            .catch((e) => console.warn('[quizService] Firestore sync notice:', e));
        }
      } catch (err) {
        console.warn('[quizService] Firestore save error:', err);
      }
    }
  },

  /**
   * Update an existing quiz in local storage and Firestore.
   */
  async updateQuiz(quiz: Quiz): Promise<void> {
    await storageService.updateQuiz(quiz);
    if (isFirebaseInitialized && db) {
      try {
        const docRef = userQuizDocPath(this.currentUid, quiz.id);
        if (docRef) {
          setDoc(docRef, { ...quiz, updatedAt: new Date().toISOString() }, { merge: true })
            .catch((e) => console.warn('[quizService] Firestore update notice:', e));
        }
      } catch (err) {
        console.warn('[quizService] Firestore update error:', err);
      }
    }
  },

  async recordQuizAttempt(
    attempt: QuizAttempt
  ): Promise<{ updatedStreak: number; newAvgScore: number }> {
    // 1. Save attempt
    await storageService.saveAttempt(attempt);

    // 2. Identify mistakes and add to MistakeBank
    const mistakes: MistakeItem[] = attempt.answers
      .filter((a) => !a.isCorrect)
      .map((a) => ({
        id: 'mis_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        quizId: attempt.quizId,
        question: {
          id: a.questionId,
          type: 'multiple_choice' as const,
          prompt: `Question regarding ${attempt.quizTitle}`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 0,
          explanation: a.explanation,
        },
        userAnswer: a.userAnswer,
        correctAnswer: 0,
        dateAdded: 'Today',
        mastered: false,
      }));

    if (mistakes.length > 0) {
      await storageService.addMistakes(mistakes);
    }

    // 3. Update User Stats & Streak
    const user = await storageService.getUser();
    let updatedStreak = 1;
    let newAvgScore = attempt.percentage;
    let newQuizzesTaken = 1;

    if (user) {
      newQuizzesTaken = user.quizzesTaken + 1;
      newAvgScore = Math.round(
        (user.avgScore * user.quizzesTaken + attempt.percentage) / newQuizzesTaken
      );
      const newTotalXP = user.totalXP + attempt.earnedXP;
      
      const streakResult = recordDailyActivityStreak(
        user.streak,
        user.lastActiveDate,
        user.longestStreak || user.streak
      );
      updatedStreak = streakResult.newStreak;

      let tier = user.tier;
      if (newTotalXP > 3000) tier = 'Diamond Grandmaster';
      else if (newTotalXP > 2000) tier = 'Gold Scholar';
      else if (newTotalXP > 1000) tier = 'Silver Adept';

      const updatedUser: UserProfile = {
        ...user,
        quizzesTaken: newQuizzesTaken,
        avgScore: newAvgScore,
        totalXP: newTotalXP,
        streak: updatedStreak,
        lastActiveDate: streakResult.lastActiveDate,
        longestStreak: streakResult.newLongestStreak,
        tier,
      };
      await storageService.saveUser(updatedUser);

      // Sync user profile to Firestore in background
      const effUid = getEffectiveUid(this.currentUid);
      if (isFirebaseInitialized && db && effUid) {
        try {
          setDoc(doc(db, 'users', effUid), updatedUser, { merge: true } as any).catch(() => {});
        } catch {
          // Local save already done
        }
      }
    }

    // 4. Check & update medals
    const medals = await storageService.getMedals();
    const updatedMedals = medals.map((m) => {
      if (m.id === 'm1' && newAvgScore >= 85 && newQuizzesTaken >= 20)
        return { ...m, unlocked: true, progress: Math.min(newQuizzesTaken, 20) };
      if (m.id === 'm3')
        return { ...m, progress: Math.min(m.progress + 1, m.totalRequired), unlocked: m.progress + 1 >= m.totalRequired };
      if (m.id === 'm4')
        return { ...m, progress: Math.min(updatedStreak, m.totalRequired), unlocked: updatedStreak >= m.totalRequired };
      return m;
    });
    await storageService.saveMedals(updatedMedals);

    return { updatedStreak, newAvgScore };
  },

  async getMistakes(): Promise<MistakeItem[]> {
    return await storageService.getMistakes();
  },

  async clearMistake(id: string): Promise<void> {
    await storageService.removeMistake(id);
  },

  async getMedals(): Promise<Medal[]> {
    return await storageService.getMedals();
  },
};
