import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#4F46E5', // Indigo
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#3B82F6', // Blue
];

interface ParticleProps {
  index: number;
  total: number;
}

const ConfettiParticle: React.FC<ParticleProps> = ({ index, total }) => {
  const startX = SCREEN_WIDTH / 2 + (Math.random() * 80 - 40);
  const startY = SCREEN_HEIGHT * 0.25;

  const targetX = (Math.random() - 0.5) * SCREEN_WIDTH * 1.1 + SCREEN_WIDTH / 2;
  const targetY = SCREEN_HEIGHT * 0.9 + Math.random() * 100;
  const duration = 2400 + Math.random() * 1200;
  const delay = Math.random() * 300;

  const posX = useSharedValue(startX);
  const posY = useSharedValue(startY);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(Math.random() * 0.6 + 0.7);

  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const isCircle = index % 3 === 0;
  const width = isCircle ? 8 : 10 + Math.random() * 6;
  const height = isCircle ? 8 : 6 + Math.random() * 6;
  const borderRadius = isCircle ? 4 : 2;

  useEffect(() => {
    posX.value = withDelay(
      delay,
      withTiming(targetX, { duration, easing: Easing.out(Easing.quad) })
    );
    posY.value = withDelay(
      delay,
      withTiming(targetY, { duration, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    );
    rotate.value = withDelay(
      delay,
      withTiming(Math.random() * 1080 - 540, { duration, easing: Easing.linear })
    );
    opacity.value = withDelay(
      delay + duration * 0.65,
      withTiming(0, { duration: duration * 0.35 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: posX.value,
    top: posY.value,
    width,
    height,
    borderRadius,
    backgroundColor: color,
    opacity: opacity.value,
    transform: [
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));

  return <Animated.View style={animatedStyle} />;
};

export const ConfettiCannon: React.FC<{ count?: number; active?: boolean }> = ({
  count = 45,
  active = true,
}) => {
  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => (
        <ConfettiParticle key={i} index={i} total={count} />
      ))}
    </View>
  );
};

export default ConfettiCannon;
