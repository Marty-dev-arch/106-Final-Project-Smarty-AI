export type Difficulty = 'easy' | 'medium' | 'hard';

export type QuestionType = 'multiple_choice' | 'true_false' | 'enumeration';

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  correctAnswer: string | number; // index or string
  explanation: string;
  category?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  questionTypes: QuestionType[];
  questionsCount: number;
  questions: Question[];
  createdAt: string;
  sourceDocName?: string;
  sourceDocUrl?: string;   // Cloudinary URL of the uploaded file
  bestScore?: number;
  timesTaken?: number;
  timeLimitMinutes?: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeSpentSeconds: number;
  earnedXP: number;
  answers: {
    questionId: string;
    userAnswer: string | number;
    isCorrect: boolean;
    explanation: string;
  }[];
  date: string;
}

export interface MistakeItem {
  id: string;
  quizId: string;
  question: Question;
  userAnswer: string | number;
  correctAnswer: string | number;
  dateAdded: string;
  mastered: boolean;
}

export interface Medal {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  unlocked: boolean;
  unlockedDate?: string;
  progress: number;
  totalRequired: number;
  iconUri: string;
}
