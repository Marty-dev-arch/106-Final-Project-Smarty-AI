import React, { createContext, useContext, useState, useEffect } from 'react';
import { Quiz, Question, QuizAttempt, MistakeItem, Medal, Difficulty, QuestionType } from '../types/quiz';
import { quizService } from '../services/quizService';
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
  startMistakePractice: () => Quiz | null;
  refreshData: () => Promise<void>;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export const QuizProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { refreshUser, user } = useAuth();
  const { sendNotification } = useNotifications();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<{ [questionId: string]: string | number }>({});
  const [latestAttempt, setLatestAttempt] = useState<QuizAttempt | null>(null);
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [medals, setMedals] = useState<Medal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Keep quizService UID in sync with auth so Firestore writes are user-scoped
  React.useEffect(() => {
    quizService.currentUid = user?.uid;
  }, [user?.uid]);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [qList, mList, medList] = await Promise.all([
        quizService.getQuizzes(),
        quizService.getMistakes(),
        quizService.getMedals(),
      ]);
      setQuizzes(qList);
      setMistakes(mList);
      setMedals(medList);
    } catch (e) {
      console.warn('Error refreshing quiz data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
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

    // Save and update user progress
    await quizService.recordQuizAttempt(attempt);
    await refreshUser();
    await refreshData();

    // Send realtime notification
    sendNotification({
      title: 'Quiz Completed! 🎯',
      message: `You scored ${percentage}% on "${activeQuiz.title}" (+${earnedXP} XP)`,
      type: 'quiz_completed',
      actionScreen: 'Performance',
    }).catch(() => {});

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
      await refreshData();

      // Send realtime notification
      sendNotification({
        title: 'New Quiz Ready! 🤖',
        message: `"${newQuiz.title}" generated with ${newQuiz.questions.length} questions.`,
        type: 'system',
        actionScreen: 'MyQuizzes',
      }).catch(() => {});

      return newQuiz;
    } finally {
      setIsLoading(false);
    }
  };

  const startMistakePractice = (): Quiz | null => {
    if (mistakes.length === 0) return null;

    const practiceQuestions: Question[] = mistakes.map((m, idx) => ({
      ...m.question,
      id: `prac_${idx}_${m.question.id}`,
    }));

    const practiceQuiz: Quiz = {
      id: 'quiz_practice_' + Date.now(),
      title: 'Mistake Bank: Focused Practice',
      description: 'Reviewing previously missed questions for retention and mastery.',
      category: 'Diagnostic Review',
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

  return (
    <QuizContext.Provider
      value={{
        quizzes,
        activeQuiz,
        currentQuestionIndex,
        userAnswers,
        latestAttempt,
        mistakes,
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
        refreshData,
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
