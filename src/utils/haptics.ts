import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Cross-platform safe Haptic Feedback utility.
 * Supports iOS, Android (native Expo Haptics) and Web (Navigator Vibration API).
 */
export const triggerHaptic = {
  /** Subtle tap feedback (tab bar items, switches, minor buttons) */
  light: async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate(10);
        }
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      // Safe fallback if unsupported
    }
  },

  /** Standard button press feedback */
  medium: async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate(25);
        }
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {
      // Safe fallback
    }
  },

  /** Pronounced feedback (quiz option select, card swipe) */
  heavy: async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate(40);
        }
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    } catch {
      // Safe fallback
    }
  },

  /** Selection changed feedback (picker, radio toggle) */
  selection: async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate(8);
        }
      } else {
        await Haptics.selectionAsync();
      }
    } catch {
      // Safe fallback
    }
  },

  /** Success notification (quiz finished with high score, medal unlocked, AI generated) */
  success: async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate([15, 60, 25]);
        }
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      // Safe fallback
    }
  },

  /** Warning notification (low time alert, streak in jeopardy) */
  warning: async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate([30, 40, 30]);
        }
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch {
      // Safe fallback
    }
  },

  /** Error feedback (incorrect answer, validation failed) */
  error: async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate([50, 40, 50]);
        }
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      // Safe fallback
    }
  },
};
