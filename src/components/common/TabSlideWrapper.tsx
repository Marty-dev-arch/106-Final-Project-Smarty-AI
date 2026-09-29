import React, { useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { tabNavState } from '../../utils/tabNavigationState';

const { width: SCREEN_W } = Dimensions.get('window');

// Tight, snappy spring — feels like a native tab bar
const SPRING = {
  damping: 24,
  stiffness: 340,
  mass: 0.75,
  overshootClamping: false,
};

interface TabSlideWrapperProps {
  children: React.ReactNode;
}

/**
 * Wraps a tab screen. On mount it reads the slide direction from
 * tabNavState and springs in from a small offset — fast and seamless
 * because the navigator has animation:"none" for tab screens.
 */
const TabSlideWrapper: React.FC<TabSlideWrapperProps> = ({ children }) => {
  const direction = tabNavState.getDirection();
  // Small offset so the slide is subtle, not a full-width swipe
  const START_X = direction === 'right' ? 55 : -55;

  const translateX = useSharedValue(START_X);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Both run together for a seamless cross-fade + slide
    translateX.value = withSpring(0, SPRING);
    opacity.value = withTiming(1, {
      duration: 160,
      easing: Easing.out(Easing.quad),
    });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.wrapper, animStyle]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    overflow: 'hidden', // clips the slide within the content zone
  },
});

export default TabSlideWrapper;
