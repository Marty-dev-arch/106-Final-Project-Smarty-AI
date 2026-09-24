import { Quiz, QuizAttempt, Medal } from './quiz';

export type RootStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUp: undefined;
  MainOnboard1: undefined;
  MainOnboard2: undefined;
  MainOnboard3: undefined;
  MainOnboard4: undefined;
  Dashboard: undefined;
  UploadQuiz: undefined;
  QuizTaking: { quizId?: string; isMistakePractice?: boolean } | undefined;
  QuizSummary: { attemptId?: string } | undefined;
  Results: { attemptId?: string } | undefined;
  QuizHistoryDiagnostics: undefined;
  MistakeBank: undefined;
  MyQuizzes: undefined;
  Achievements: undefined;
  MedalDetails: { medalId?: string; medal?: Medal } | undefined;
  Performance: undefined;
  ProfileSetiing: undefined;
};
