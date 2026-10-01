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
          // Fetch raw collection from Firestore (avoid requiring composite indexes)
          const snap: any = await withTimeout(getDocs(col), 5000);
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
      } catch (err) {
        console.warn('[quizService] Firestore getQuizzes notice:', err);
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
    // 1. Save attempt locally and to Firestore
    await storageService.saveAttempt(attempt);

    const effUid = getEffectiveUid(this.currentUid);
    if (isFirebaseInitialized && db && effUid) {
      try {
        setDoc(doc(db, 'users', effUid, 'attempts', attempt.id), attempt, { merge: true }).catch(() => {});
      } catch {}
    }

    // Update target quiz bestScore and timesTaken
    try {
      const allQuizzes = await this.getQuizzes();
      const targetQuiz = allQuizzes.find((q) => q.id === attempt.quizId);
      if (targetQuiz) {
        const updatedQuiz: Quiz = {
          ...targetQuiz,
          timesTaken: (targetQuiz.timesTaken || 0) + 1,
          bestScore: Math.max(targetQuiz.bestScore || 0, attempt.percentage),
        };
        await this.updateQuiz(updatedQuiz);
      }
    } catch (err) {
      console.warn('[quizService] Could not update quiz bestScore:', err);
    }

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

    // 3. Update User Stats & Streak (XP, Tier, Streak, Quizzes Taken)
    const user = await storageService.getUser();
    let updatedStreak = 1;
    let newAvgScore = attempt.percentage;
    let newQuizzesTaken = 1;
    let newTotalXP = 100 + attempt.earnedXP;

    if (user) {
      newQuizzesTaken = user.quizzesTaken + 1;
      newAvgScore = Math.round(
        (user.avgScore * user.quizzesTaken + attempt.percentage) / newQuizzesTaken
      );
      newTotalXP = user.totalXP + attempt.earnedXP;
      
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
      if (isFirebaseInitialized && db && effUid) {
        try {
          setDoc(doc(db, 'users', effUid), updatedUser, { merge: true } as any).catch(() => {});
        } catch {
          // Local save already done
        }
      }
    }

    // 4. Check & update medals (Achievements) dynamically based on XP, Quizzes, Streak, and Score
    const medals = await storageService.getMedals();
    const updatedMedals = medals.map((m) => {
      let progress = m.progress || 0;
      let unlocked = m.unlocked || false;

      if (m.id === 'm1' || m.title.includes('Gold Scholar')) {
        progress = Math.min(newQuizzesTaken, m.totalRequired || 5);
        unlocked = newQuizzesTaken >= (m.totalRequired || 5) && newAvgScore >= 85;
      } else if (m.id === 'm2' || m.id === 'pacesetter' || m.title.includes('Pacesetter') || m.title.includes('Speed')) {
        const req = m.totalRequired || 500;
        progress = Math.min(newTotalXP, req);
        unlocked = newTotalXP >= req;
      } else if (m.id === 'm3' || m.id === 'master_mind' || m.title.includes('Curious') || m.title.includes('Mind')) {
        const req = m.totalRequired || 5;
        progress = Math.min(newQuizzesTaken, req);
        unlocked = newQuizzesTaken >= req;
      } else if (m.id === 'm4' || m.id === 'iron_will' || m.title.includes('Iron Will') || m.title.includes('Consistency')) {
        const req = m.totalRequired || 3;
        progress = Math.min(updatedStreak, req);
        unlocked = updatedStreak >= req;
      } else if (m.id === 'm5' || m.id === 'grand_medal' || m.title.includes('Grand')) {
        const req = m.totalRequired || 1000;
        progress = Math.min(newTotalXP, req);
        unlocked = newTotalXP >= req;
      }

      return {
        ...m,
        progress,
        unlocked,
      };
    });
    await storageService.saveMedals(updatedMedals);

    // Sync medals to Firestore for cross-device retrieval
    if (isFirebaseInitialized && db && effUid) {
      try {
        setDoc(doc(db, 'users', effUid, 'data', 'medals'), { list: updatedMedals }, { merge: true }).catch(() => {});
      } catch {}
    }

    return { updatedStreak, newAvgScore };
  },

  async getMistakes(): Promise<MistakeItem[]> {
    return await storageService.getMistakes();
  },

  async clearMistake(id: string): Promise<void> {
    await storageService.removeMistake(id);
  },

  async getMedals(): Promise<Medal[]> {
    const localMedals = await storageService.getMedals();
    const effUid = getEffectiveUid(this.currentUid);
    if (isFirebaseInitialized && db && effUid) {
      try {
        const snap: any = await withTimeout(getDoc(doc(db, 'users', effUid, 'data', 'medals')), 3000);
        if (snap && snap.exists() && Array.isArray(snap.data()?.list)) {
          const remoteMedals: Medal[] = snap.data().list;
          await storageService.saveMedals(remoteMedals);
          return remoteMedals;
        }
      } catch {
        // Fallback to local storage
      }
    }
    return localMedals;
  },
};
