import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface XPCounterRollupProps {
  targetXP: number;
  durationMs?: number;
}

export const XPCounterRollup: React.FC<XPCounterRollupProps> = ({
  targetXP = 250,
  durationMs = 1500,
}) => {
  const [displayedXP, setDisplayedXP] = useState(0);
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.15, { damping: 10, stiffness: 260 }),
      withSpring(1, { damping: 12, stiffness: 260 })
    );
    opacity.value = withTiming(1, { duration: 250 });

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const easedProgress = 1 - Math.pow(1 - progress, 3); // cubic ease out
      const current = Math.round(easedProgress * targetXP);

      setDisplayedXP(current);

      if (progress >= 1) {
        clearInterval(interval);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [targetXP, durationMs]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        colors={['#4F46E5', '#6366F1', '#EC4899']}
        style={styles.gradientPill}
      >
        <Ionicons name="sparkles" size={16} color="#FDE047" style={{ marginRight: 6 }} />
        <Text style={styles.xpText}>+{displayedXP} XP</Text>
        <Text style={styles.earnedTag}>EARNED</Text>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
  },
  gradientPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#6366F1',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
  },
  xpText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
    marginRight: 8,
  },
  earnedTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FDE047',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    letterSpacing: 0.5,
  },
});

export default XPCounterRollup;
