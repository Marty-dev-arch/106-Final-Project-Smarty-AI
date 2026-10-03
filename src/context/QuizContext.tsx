import React, { createContext, useContext, useState, useEffect } from 'react';
import { Quiz, Question, QuizAttempt, MistakeItem, Medal, Difficulty, QuestionType } from '../types/quiz';
import { quizService } from '../services/quizService';
import { storageService } from '../services/storageService';
import { geminiService } from '../services/geminiService';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import { SlideBlock } from '../utils/documentExtractor';

interface QuizContextType {
  quizzes: Quiz[];
  activeQuiz: Quiz | null;
  currentQuestionIndex: number;
  userAnswers: { [questionId: string]: string | number };
  latestAttempt: QuizAttempt | null;
  mistakes: MistakeItem[];
  attempts: QuizAttempt[];
  medals: Medal[];
  isLoading: boolean;
  startQuiz: (quiz: Quiz) => void;
  nextQuestion: () => boolean; // returns true if has more, false if finished
  prevQuestion: () => void;
  setCurrentQuestionIndex: (index: number) => void;
  selectAnswer: (questionId: string, answer: string | number) => void;
  finishQuiz: (timeSpentSeconds?: number) => Promise<QuizAttempt | null>;
  updateActiveQuiz: (updatedQuiz: Quiz) => Promise<void>;
  updateCurrentQuestion: (updatedQuestion: Question) => Promise<void>;
  addNewQuestionToQuiz: (newQuestion?: Partial<Question>) => Promise<void>;
  deleteQuestionFromQuiz: (questionIndex: number) => Promise<void>;
  generateQuizWithAI: (params: {
    topicOrDocumentText: string;
    slides?: SlideBlock[];
    count: number;
    difficulty: Difficulty;
    questionTypes: QuestionType[];
    title?: string;
    timeLimitMinutes?: number;
    sourceDocName?: string;
    sourceDocUrl?: string;
  }) => Promise<Quiz>;
  startMistakePractice: (topicFilter?: string) => Quiz | null;
  clearMistake: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
  deleteAllQuizzesAndFiles: () => Promise<void>;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export const QuizProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { refreshUser, updateUser, user } = useAuth();
  const { sendNotification } = useNotifications();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<{ [questionId: string]: string | number }>({});
  const [latestAttempt, setLatestAttempt] = useState<QuizAttempt | null>(null);
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [medals, setMedals] = useState<Medal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Keep quizService UID in sync with auth and re-fetch user's quizzes from Firestore when logged in
  useEffect(() => {
    quizService.currentUid = user?.uid;
    setQuizzes([]);
    setMistakes([]);
    setAttempts([]);
    setMedals([]);
    setActiveQuiz(null);
    refreshData();
  }, [user?.uid]);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [qList, mList, aList, medList] = await Promise.all([
        quizService.getQuizzes(),
        quizService.getMistakes(),
        quizService.getAttempts(),
        quizService.getMedals(),
      ]);
      setQuizzes(qList);
      setMistakes(mList);
      setAttempts(aList);
      setMedals(medList);

      // Auto-heal user stats in Firestore and state if 0 quizzes exist but stats are non-zero
      if (qList.length === 0 && ((user?.quizzesTaken ?? 0) > 0 || (user?.avgScore ?? 0) > 0)) {
        await updateUser({ quizzesTaken: 0, avgScore: 0 });
      }
    } catch (e) {
      console.warn('Error refreshing quiz data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    const initialIndex =
      typeof quiz.savedProgressIndex === "number" &&
        quiz.savedProgressIndex < (quiz.questions?.length || 1)
        ? quiz.savedProgressIndex
        : 0;
    const initialAnswers = quiz.savedUserAnswers || {};
    setCurrentQuestionIndex(initialIndex);
    setUserAnswers(initialAnswers);
  };

  const selectAnswer = (questionId: string, answer: string | number) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const nextQuestion = (): boolean => {
    if (!activeQuiz) return false;
    if (currentQuestionIndex < activeQuiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      return true;
    }
    return false;
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const finishQuiz = async (timeSpentSeconds?: number): Promise<QuizAttempt | null> => {
    if (!activeQuiz) return null;

    let correctCount = 0;
    const answerDetails = activeQuiz.questions.map((q) => {
      const uAns = userAnswers[q.id];
      const isCorrect = uAns !== undefined && uAns === q.correctAnswer;
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        userAnswer: uAns !== undefined ? uAns : -1,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const totalQuestions = activeQuiz.questions.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    const earnedXP = correctCount * 50 + 50;

    const attempt: QuizAttempt = {
      id: 'att_' + Date.now(),
      quizId: activeQuiz.id,
      quizTitle: activeQuiz.title,
      score: correctCount,
      totalQuestions,
      percentage,
      timeSpentSeconds: timeSpentSeconds !== undefined ? timeSpentSeconds : 45,
      earnedXP,
      answers: answerDetails,
      date: new Date().toLocaleDateString(),
    };

    setLatestAttempt(attempt);

    // Clear saved progress on completion
    if (activeQuiz.savedProgressIndex !== undefined || activeQuiz.savedUserAnswers) {
      const cleared = { ...activeQuiz, savedProgressIndex: undefined, savedUserAnswers: undefined };
      await quizService.updateQuiz(cleared).catch(() => { });
    }

    // Save and update user progress (passing activeQuiz for real question preservation)
    await quizService.recordQuizAttempt(attempt, activeQuiz);
    await refreshUser();
    await refreshData();

    // Send realtime notification
    sendNotification({
      title: 'Quiz Completed! 🎯',
      message: `You scored ${percentage}% on "${activeQuiz.title}" (+${earnedXP} XP)`,
      type: 'quiz_completed',
      actionScreen: 'Performance',
    }).catch(() => { });

    return attempt;
  };

  const generateQuizWithAI = async (params: {
    topicOrDocumentText: string;
    slides?: SlideBlock[];
    count: number;
    difficulty: Difficulty;
    questionTypes: QuestionType[];
    title?: string;
    timeLimitMinutes?: number;
    sourceDocName?: string;
    sourceDocUrl?: string;
  }): Promise<Quiz> => {
    setIsLoading(true);
    try {
      const newQuiz = await geminiService.generateQuiz(params);
      await quizService.saveQuiz(newQuiz);
      setQuizzes((prev) => [newQuiz, ...prev.filter((q) => q.id !== newQuiz.id)]);
      await refreshData();

      // Send realtime notification
      sendNotification({
        title: 'New Quiz Ready! 🤖',
        message: `"${newQuiz.title}" generated with ${newQuiz.questions.length} questions.`,
        type: 'system',
        actionScreen: 'MyQuizzes',
      }).catch(() => { });

      return newQuiz;
    } finally {
      setIsLoading(false);
    }
  };

  const startMistakePractice = (topicFilter?: string): Quiz | null => {
    if (mistakes.length === 0) return null;

    let filtered = mistakes.filter((m) => !m.mastered);
    if (topicFilter && topicFilter !== 'All' && !topicFilter.startsWith('All (')) {
      const filterLower = topicFilter.toLowerCase().trim();
      filtered = filtered.filter((m) => {
        const titleMatch = m.quizTitle?.toLowerCase().includes(filterLower);
        const catMatch = m.category?.toLowerCase().includes(filterLower);
        const qCatMatch = m.question?.category?.toLowerCase().includes(filterLower);
        return titleMatch || catMatch || qCatMatch;
      });
    }

    if (filtered.length === 0) filtered = mistakes;

    // Shuffle questions when practicing overall wrong answers or topic
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);

    const practiceQuestions: Question[] = shuffled.map((m, idx) => ({
      ...m.question,
      id: `prac_${idx}_${m.question.id || Date.now()}`,
    }));

    const titleText =
      topicFilter && topicFilter !== 'All' && !topicFilter.startsWith('All (')
        ? `Mistake Review: ${topicFilter}`
        : 'Mistake Bank: Overall Review';

    const practiceQuiz: Quiz = {
      id: 'quiz_practice_' + Date.now(),
      title: titleText,
      description: 'Reviewing previously missed questions for retention and mastery.',
      category: topicFilter || 'Mistake Review',
      difficulty: 'medium',
      questionTypes: ['multiple_choice'],
      questionsCount: practiceQuestions.length,
      questions: practiceQuestions,
      createdAt: new Date().toISOString(),
    };

    startQuiz(practiceQuiz);
    return practiceQuiz;
  };

  const updateActiveQuiz = async (updatedQuiz: Quiz) => {
    setActiveQuiz(updatedQuiz);
    setQuizzes((prev) => prev.map((q) => (q.id === updatedQuiz.id ? updatedQuiz : q)));
    await quizService.updateQuiz(updatedQuiz);
  };

  const updateCurrentQuestion = async (updatedQuestion: Question) => {
    if (!activeQuiz) return;
    const questions = [...activeQuiz.questions];
    questions[currentQuestionIndex] = updatedQuestion;
    const updatedQuiz: Quiz = {
      ...activeQuiz,
      questions,
      questionsCount: questions.length,
    };
    await updateActiveQuiz(updatedQuiz);
  };

  const addNewQuestionToQuiz = async (newQuestion?: Partial<Question>) => {
    if (!activeQuiz) return;
    const qCount = activeQuiz.questions.length + 1;
    const blankQuestion: Question = {
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      type: 'multiple_choice',
      prompt: newQuestion?.prompt || `New Question ${qCount}`,
      options: newQuestion?.options || ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: newQuestion?.correctAnswer !== undefined ? newQuestion.correctAnswer : 0,
      explanation: newQuestion?.explanation || '',
      ...newQuestion,
    };
    const updatedQuestions = [...activeQuiz.questions, blankQuestion];
    const updatedQuiz: Quiz = {
      ...activeQuiz,
      questions: updatedQuestions,
      questionsCount: updatedQuestions.length,
    };
    await updateActiveQuiz(updatedQuiz);
    setCurrentQuestionIndex(updatedQuestions.length - 1);
  };

  const deleteQuestionFromQuiz = async (questionIndex: number) => {
    if (!activeQuiz || activeQuiz.questions.length <= 1) return;
    const updatedQuestions = activeQuiz.questions.filter((_, i) => i !== questionIndex);
    const updatedQuiz: Quiz = {
      ...activeQuiz,
      questions: updatedQuestions,
      questionsCount: updatedQuestions.length,
    };
    await updateActiveQuiz(updatedQuiz);
    if (currentQuestionIndex >= updatedQuestions.length) {
      setCurrentQuestionIndex(Math.max(0, updatedQuestions.length - 1));
    }
  };

  const deleteAllQuizzesAndFiles = async () => {
    setIsLoading(true);
    try {
      await quizService.deleteAllQuizzesAndFiles();
      setQuizzes([]);
      setActiveQuiz(null);
      setMistakes([]);
      setAttempts([]);
      setUserAnswers({});
      setCurrentQuestionIndex(0);

      // Reset User profile quiz stats locally, in Firestore, and reactively in AuthContext
      await updateUser({ quizzesTaken: 0, avgScore: 0 });
      await refreshUser();
    } catch (e) {
      console.warn('Error deleting all quizzes and files:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMistake = async (id: string) => {
    setMistakes((prev) => prev.filter((m) => m.id !== id));
    await quizService.clearMistake(id);
  };

  return (
    <QuizContext.Provider
      value={{
        quizzes,
        activeQuiz,
        currentQuestionIndex,
        userAnswers,
        latestAttempt,
        mistakes,
        attempts,
        medals,
        isLoading,
        startQuiz,
        nextQuestion,
        prevQuestion,
        setCurrentQuestionIndex,
        selectAnswer,
        finishQuiz,
        updateActiveQuiz,
        updateCurrentQuestion,
        addNewQuestionToQuiz,
        deleteQuestionFromQuiz,
        generateQuizWithAI,
        startMistakePractice,
        clearMistake,
        refreshData,
        deleteAllQuizzesAndFiles,
      }}
    >
      {children}
    </QuizContext.Provider>
  );
};

export const useQuiz = () => {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
};
