export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isGuest: boolean;
  streak: number;
  lastActiveDate?: string;
  longestStreak?: number;
  streakFreezes?: number;
  quizzesTaken: number;
  avgScore: number;
  totalXP: number;
  tier: string;
  defaultDifficulty?: 'Easy' | 'Medium' | 'Hard';
  mistakeSync?: boolean;
  streakReminder?: boolean;
  hapticFeedback?: boolean;
  createdAt: string;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}
