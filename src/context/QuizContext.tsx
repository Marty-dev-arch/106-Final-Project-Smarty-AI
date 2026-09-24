import React, { createContext, useContext, useState, useEffect } from 'react';
import { Quiz, Question, QuizAttempt, MistakeItem, Medal, Difficulty, QuestionType } from '../types/quiz';
import { quizService } from '../services/quizService';
import { geminiService } from '../services/geminiService';
import { useAuth } from './AuthContext';

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
  selectAnswer: (questionId: string, answer: string | number) => void;
  finishQuiz: (timeSpentSeconds?: number) => Promise<QuizAttempt | null>;
  generateQuizWithAI: (params: {
    topicOrDocumentText: string;
    count: number;
    difficulty: Difficulty;
    questionTypes: QuestionType[];
    title?: string;
    timeLimitMinutes?: number;
  }) => Promise<Quiz>;
  startMistakePractice: () => Quiz | null;
  refreshData: () => Promise<void>;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export const QuizProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { refreshUser } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<{ [questionId: string]: string | number }>({});
  const [latestAttempt, setLatestAttempt] = useState<QuizAttempt | null>(null);
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [medals, setMedals] = useState<Medal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

    return attempt;
  };

  const generateQuizWithAI = async (params: {
    topicOrDocumentText: string;
    count: number;
    difficulty: Difficulty;
    questionTypes: QuestionType[];
    title?: string;
    timeLimitMinutes?: number;
  }): Promise<Quiz> => {
    setIsLoading(true);
    try {
      const newQuiz = await geminiService.generateQuiz(params);
      await quizService.saveQuiz(newQuiz);
      await refreshData();
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
        selectAnswer,
        finishQuiz,
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
