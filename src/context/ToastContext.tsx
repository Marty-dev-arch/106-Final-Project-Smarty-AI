import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';
import { triggerHaptic } from '../utils/haptics';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions | string) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [toast, setToast] = useState<ToastOptions | null>(null);
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  const hideToast = useCallback(() => {
    translateY.value = withTiming(-100, { duration: 220, easing: Easing.in(Easing.ease) });
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(setToast)(null);
    });
    scale.value = withTiming(0.9, { duration: 200 });
  }, []);

  const showToast = useCallback(
    (options: ToastOptions | string) => {
      const config: ToastOptions =
        typeof options === 'string' ? { message: options, type: 'info' } : options;

      setToast(config);

      // Trigger tactile haptics matching toast severity
      const toastType = config.type || 'info';
      if (toastType === 'success') {
        triggerHaptic.success();
      } else if (toastType === 'error') {
        triggerHaptic.error();
      } else if (toastType === 'warning') {
        triggerHaptic.warning();
      } else {
        triggerHaptic.light();
      }

      // Animate in
      translateY.value = withSpring(Math.max(insets.top + 10, 16), {
        damping: 15,
        stiffness: 260,
        mass: 0.8,
      });
      opacity.value = withTiming(1, { duration: 180 });
      scale.value = withSpring(1, { damping: 15, stiffness: 260 });

      // Auto dismiss
      const duration = config.duration || 3200;
      const timeoutId = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timeoutId);
    },
    [insets.top, hideToast]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const getToastConfig = (type: ToastType = 'info') => {
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle' as const,
          color: '#10B981',
          bg: isDark ? '#064E3B' : '#ECFDF5',
          border: isDark ? '#059669' : '#A7F3D0',
        };
      case 'error':
        return {
          icon: 'alert-circle' as const,
          color: '#EF4444',
          bg: isDark ? '#7F1D1D' : '#FEF2F2',
          border: isDark ? '#DC2626' : '#FECACA',
        };
      case 'warning':
        return {
          icon: 'warning' as const,
          color: '#F59E0B',
          bg: isDark ? '#78350F' : '#FFFBEB',
          border: isDark ? '#D97706' : '#FDE68A',
        };
      case 'info':
      default:
        return {
          icon: 'sparkles' as const,
          color: '#6366F1',
          bg: isDark ? '#312E81' : '#EEF2FF',
          border: isDark ? '#4F46E5' : '#C7D2FE',
        };
    }
  };

  const currentConfig = getToastConfig(toast?.type);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <View style={styles.toastHost} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.toastPill,
              {
                backgroundColor: isDark ? '#161F30' : '#FFFFFF',
                borderColor: currentConfig.border,
                shadowColor: currentConfig.color,
              },
              animatedStyle,
            ]}
          >
            <TouchableOpacity
              style={styles.toastContent}
              onPress={hideToast}
              activeOpacity={0.9}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: currentConfig.bg },
                ]}
              >
                <Ionicons
                  name={currentConfig.icon}
                  size={18}
                  color={currentConfig.color}
                />
              </View>

              <View style={styles.textContainer}>
                {toast.title && (
                  <Text
                    style={[
                      styles.titleText,
                      { color: isDark ? '#F8FAFC' : '#0F172A' },
                    ]}
                    numberOfLines={1}
                  >
                    {toast.title}
                  </Text>
                )}
                <Text
                  style={[
                    styles.messageText,
                    { color: isDark ? '#CBD5E1' : '#334155' },
                  ]}
                  numberOfLines={2}
                >
                  {toast.message}
                </Text>
              </View>

              <TouchableOpacity
                onPress={hideToast}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="close"
                  size={14}
                  color={isDark ? '#94A3B8' : '#64748B'}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  toastHost: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99999,
  },
  toastPill: {
    width: Math.min(SCREEN_WIDTH - 32, 400),
    borderRadius: 22,
    borderWidth: 1.2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 14,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 1,
  },
  messageText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
  },
});

export default ToastProvider;
