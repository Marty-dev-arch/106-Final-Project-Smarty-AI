/**
 * Streak Calculation and Verification Helper
 * Provides calendar-accurate date tracking for daily study streaks.
 */

export function getLocalDateString(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateString(d);
}

export interface StreakEvaluation {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate?: string;
  isActiveToday: boolean;
  canExtendToday: boolean;
  isBroken: boolean;
}

/**
 * Evaluates current streak status without modifying it.
 * Used for displaying streak badges, mascot mood, and warnings.
 */
export function evaluateStreak(
  savedStreak: number = 0,
  lastActiveDate?: string,
  savedLongestStreak: number = 0
): StreakEvaluation {
  const today = getLocalDateString();
  const yesterday = getYesterdayDateString();

  const longest = Math.max(savedLongestStreak || 0, savedStreak || 0);

  if (!lastActiveDate) {
    return {
      currentStreak: savedStreak > 0 ? savedStreak : 0,
      longestStreak: longest,
      lastActiveDate,
      isActiveToday: false,
      canExtendToday: true,
      isBroken: false,
    };
  }

  if (lastActiveDate === today) {
    return {
      currentStreak: savedStreak,
      longestStreak: longest,
      lastActiveDate,
      isActiveToday: true,
      canExtendToday: false,
      isBroken: false,
    };
  }

  if (lastActiveDate === yesterday) {
    return {
      currentStreak: savedStreak,
      longestStreak: longest,
      lastActiveDate,
      isActiveToday: false,
      canExtendToday: true,
      isBroken: false,
    };
  }

  // Missed more than 1 calendar day
  return {
    currentStreak: 0,
    longestStreak: longest,
    lastActiveDate,
    isActiveToday: false,
    canExtendToday: true,
    isBroken: true,
  };
}

/**
 * Calculates updated streak state when user finishes a quiz or learning session.
 */
export function recordDailyActivityStreak(
  currentStreak: number = 0,
  lastActiveDate?: string,
  currentLongestStreak: number = 0
): {
  newStreak: number;
  newLongestStreak: number;
  lastActiveDate: string;
  isFirstActivityToday: boolean;
  streakIncremented: boolean;
} {
  const today = getLocalDateString();
  const yesterday = getYesterdayDateString();

  if (lastActiveDate === today) {
    // Already did activity today
    const validStreak = Math.max(currentStreak, 1);
    const validLongest = Math.max(currentLongestStreak, validStreak);
    return {
      newStreak: validStreak,
      newLongestStreak: validLongest,
      lastActiveDate: today,
      isFirstActivityToday: false,
      streakIncremented: false,
    };
  }

  if (lastActiveDate === yesterday) {
    // Continued streak!
    const newStreak = (currentStreak || 0) + 1;
    const newLongestStreak = Math.max(currentLongestStreak || 0, newStreak);
    return {
      newStreak,
      newLongestStreak,
      lastActiveDate: today,
      isFirstActivityToday: true,
      streakIncremented: true,
    };
  }

  // Broken streak or fresh user -> start at 1
  const newStreak = 1;
  const newLongestStreak = Math.max(currentLongestStreak || 0, 1);
  return {
    newStreak,
    newLongestStreak,
    lastActiveDate: today,
    isFirstActivityToday: true,
    streakIncremented: true,
  };
}
