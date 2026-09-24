import { Quiz, QuizAttempt, MistakeItem, Medal } from '../types/quiz';
import { storageService } from './storageService';
import { db, isFirebaseInitialized } from '../config/firebase';
import { collection, addDoc, getDocs, doc, setDoc } from 'firebase/firestore';

export const quizService = {
  async getQuizzes(): Promise<Quiz[]> {
    if (isFirebaseInitialized && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'quizzes'));
        if (!querySnapshot.empty) {
          const list: Quiz[] = [];
          querySnapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Quiz));
          return list;
        }
      } catch (e) {
        console.warn('Firestore getQuizzes fallback:', e);
      }
    }
    return await storageService.getQuizzes();
  },

  async saveQuiz(quiz: Quiz): Promise<void> {
    if (isFirebaseInitialized && db) {
      try {
        await setDoc(doc(db, 'quizzes', quiz.id), quiz);
      } catch (e) {
        console.warn('Firestore saveQuiz fallback:', e);
      }
    }
    await storageService.addQuiz(quiz);
  },

  async recordQuizAttempt(attempt: QuizAttempt): Promise<{ updatedStreak: number; newAvgScore: number }> {
    // 1. Save attempt
    await storageService.saveAttempt(attempt);

    // 2. Identify mistakes and add to MistakeBank
    const mistakes: MistakeItem[] = attempt.answers
      .filter((a) => !a.isCorrect)
      .map((a) => {
        return {
          id: 'mis_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          quizId: attempt.quizId,
          question: {
            id: a.questionId,
            type: 'multiple_choice',
            prompt: `Question regarding ${attempt.quizTitle}`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: 0,
            explanation: a.explanation,
          },
          userAnswer: a.userAnswer,
          correctAnswer: 0,
          dateAdded: 'Today',
          mastered: false,
        };
      });

    if (mistakes.length > 0) {
      await storageService.addMistakes(mistakes);
    }

    // 3. Update User Stats & Streak
    const user = await storageService.getUser();
    const newQuizzesTaken = user.quizzesTaken + 1;
    const newAvgScore = Math.round((user.avgScore * user.quizzesTaken + attempt.percentage) / newQuizzesTaken);
    const newTotalXP = user.totalXP + attempt.earnedXP;
    const updatedStreak = user.streak + 1;

    let tier = user.tier;
    if (newTotalXP > 3000) tier = 'Diamond Grandmaster';
    else if (newTotalXP > 2000) tier = 'Gold Scholar';
    else if (newTotalXP > 1000) tier = 'Silver Adept';

    const updatedUser = {
      ...user,
      quizzesTaken: newQuizzesTaken,
      avgScore: newAvgScore,
      totalXP: newTotalXP,
      streak: updatedStreak,
      tier,
    };
    await storageService.saveUser(updatedUser);

    // 4. Check & update medals
    const medals = await storageService.getMedals();
    const updatedMedals = medals.map((m) => {
      if (m.id === 'm1' && newAvgScore >= 85 && newQuizzesTaken >= 20) {
        return { ...m, unlocked: true, progress: Math.min(newQuizzesTaken, 20) };
      }
      if (m.id === 'm3') {
        return { ...m, progress: Math.min(m.progress + 1, m.totalRequired), unlocked: m.progress + 1 >= m.totalRequired };
      }
      if (m.id === 'm4') {
        return { ...m, progress: Math.min(updatedStreak, m.totalRequired), unlocked: updatedStreak >= m.totalRequired };
      }
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
