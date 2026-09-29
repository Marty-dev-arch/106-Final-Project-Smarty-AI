import { Quiz, Medal, MistakeItem } from '../types/quiz';
import { UserProfile } from '../types/auth';

export const initialUser: UserProfile = {
  uid: 'user_' + Date.now(),
  email: '',
  displayName: 'Learner',
  isGuest: false,
  streak: 0,
  quizzesTaken: 0,
  avgScore: 0,
  totalXP: 0,
  tier: 'Novice Scholar',
  createdAt: new Date().toISOString(),
};

export const sampleQuizzes: Quiz[] = [];

export const sampleMedals: Medal[] = [
  {
    id: 'm1',
    title: 'Gold Scholar',
    subtitle: 'High Academic Performance',
    description: 'Maintain an average score above 85% across 20+ completed quizzes.',
    category: 'Excellence',
    unlocked: false,
    progress: 0,
    totalRequired: 20,
    iconUri: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/UjqMgCp8GJ/999ca9h1_expires_30_days.png',
  },
  {
    id: 'm2',
    title: 'Speed Demon',
    subtitle: 'Lightning Answers',
    description: 'Complete a 10-question quiz in under 2 minutes with 90%+ accuracy.',
    category: 'Speed',
    unlocked: false,
    progress: 0,
    totalRequired: 10,
    iconUri: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/UjqMgCp8GJ/t9rvvowe_expires_30_days.png',
  },
  {
    id: 'm3',
    title: 'Curious Mind',
    subtitle: 'Doc Converter',
    description: 'Generate 10 quizzes from customized documents and study materials.',
    category: 'Creation',
    unlocked: false,
    progress: 0,
    totalRequired: 10,
    iconUri: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/UjqMgCp8GJ/w6es531i_expires_30_days.png',
  },
  {
    id: 'm4',
    title: 'Consistency Titan',
    subtitle: '14-Day Streak',
    description: 'Complete at least one quiz every day for 14 consecutive days.',
    category: 'Dedication',
    unlocked: false,
    progress: 0,
    totalRequired: 14,
    iconUri: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/UjqMgCp8GJ/cnph2qnt_expires_30_days.png',
  },
];

export const sampleMistakes: MistakeItem[] = [];
