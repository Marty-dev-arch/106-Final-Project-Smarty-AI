import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutChangeEvent,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import { RootStackParamList } from '../../types/navigation';
import { useResponsive } from '../../hooks/useResponsive';
import { tabNavState } from '../../utils/tabNavigationState';
import { useTheme } from '../../context/ThemeContext';
import { triggerHaptic } from '../../utils/haptics';

export type TabKey = 'Home' | 'Quizzes' | 'Create' | 'Awards' | 'Performance';

interface BottomNavProps {
  activeTab: TabKey;
}

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const HomeIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 10.5L12 3.2L21 10.5V20.5C21 21.05 20.55 21.5 20 21.5H15V13.8H9V21.5H4C3.45 21.5 3 21.05 3 20.5V10.5Z"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const QuizzesIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="4.5" width="16" height="16.5" rx="3.5" stroke={color} strokeWidth={2.2} />
    <Path
      d="M9 4.5V2.5C9 1.95 9.45 1.5 10 1.5H14C14.55 1.5 15 1.95 15 2.5V4.5"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M8.5 13L11.2 15.8L15.8 10" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CreateSparklesIcon: React.FC<{ color?: string; size?: number }> = ({ color = '#FFFFFF', size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2L13.8 8.2L20 10L13.8 11.8L12 18L10.2 11.8L4 10L10.2 8.2L12 2Z"
      fill={color}
      stroke={color}
      strokeWidth={1}
      strokeLinejoin="round"
    />
    <Path
      d="M19 16L19.9 19.1L23 20L19.9 20.9L19 24L18.1 20.9L15 20L18.1 19.1L19 16Z"
      fill={color}
    />
  </Svg>
);

const AwardsIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 3H19V11L12 14.5L5 11V3Z" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9.5 3V11.5M14.5 3V11.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path
      d="M12 14.5L13.2 16.8L15.8 17L13.8 18.7L14.4 21.2L12 19.8L9.6 21.2L10.2 18.7L8.2 17L10.8 16.8Z"
      fill={color}
      stroke={color}
      strokeWidth={0.8}
      strokeLinejoin="round"
    />
  </Svg>
);

const PerformanceIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3.5 16.5L8.5 11L13 15L20.5 6.5" stroke={color} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 6.5H20.5V11" stroke={color} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Constants & Physics ─────────────────────────────────────────────────────

const BALL_SIZE = 48;
const NOTCH_WIDTH = 74;
const NOTCH_HEIGHT = 18;

const TAB_CONFIG: {
  key: TabKey;
  label: string;
  renderIcon: (color: string, size?: number) => React.ReactNode;
}[] = [
  { key: 'Home', label: 'Home', renderIcon: (c, s) => <HomeIcon color={c} size={s} /> },
  { key: 'Quizzes', label: 'Quizzes', renderIcon: (c, s) => <QuizzesIcon color={c} size={s} /> },
  { key: 'Create', label: 'Create', renderIcon: (c, s) => <CreateSparklesIcon color={c} size={s} /> },
  { key: 'Awards', label: 'Awards', renderIcon: (c, s) => <AwardsIcon color={c} size={s} /> },
  { key: 'Performance', label: 'Stats', renderIcon: (c, s) => <PerformanceIcon color={c} size={s} /> },
];

const TAB_INDEX_MAP: Record<TabKey, number> = {
  Home: 0,
  Quizzes: 1,
  Create: 2,
  Awards: 3,
  Performance: 4,
};

// ─── Floating Curved Bottom Navigation ───────────────────────────────────────

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { insets } = useResponsive();
  const { colors, isDark } = useTheme();

  const activeIndex = TAB_INDEX_MAP[activeTab] ?? 0;
  const [navWidth, setNavWidth] = useState(0);

  // Animated shared values
  const animatedIndex = useSharedValue(activeIndex);
  const ballScaleX = useSharedValue(1);
  const ballScaleY = useSharedValue(1);
  const ballTranslateY = useSharedValue(0);
  const iconRotate = useSharedValue(0);

  const tabWidth = navWidth > 0 ? navWidth / 5 : 68;

  useEffect(() => {
    // Spring translation to target tab index
    animatedIndex.value = withSpring(activeIndex, {
      damping: 16,
      stiffness: 220,
      mass: 0.75,
    });

    // Organic squish and bounce during movement
    ballScaleX.value = withSequence(
      withTiming(1.18, { duration: 120, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 12, stiffness: 260 })
    );
    ballScaleY.value = withSequence(
      withTiming(0.85, { duration: 120, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 12, stiffness: 260 })
    );
    ballTranslateY.value = withSequence(
      withTiming(-6, { duration: 120, easing: Easing.out(Easing.quad) }),
      withSpring(0, { damping: 14, stiffness: 240 })
    );
    iconRotate.value = withSequence(
      withTiming(activeIndex > animatedIndex.value ? 12 : -12, { duration: 100 }),
      withSpring(0, { damping: 14, stiffness: 280 })
    );
  }, [activeIndex]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== navWidth) {
      setNavWidth(width);
    }
  };

  const handleTabPress = (tab: TabKey) => {
    if (tab === activeTab) return;
    triggerHaptic.selection();
    tabNavState.setTab(tab);
    switch (tab) {
      case 'Home':        navigation.replace('Dashboard'); break;
      case 'Quizzes':     navigation.replace('MyQuizzes'); break;
      case 'Create':      navigation.replace('UploadQuiz'); break;
      case 'Awards':      navigation.replace('Achievements'); break;
      case 'Performance': navigation.replace('Performance'); break;
    }
  };

  // Animated style for the floating curved notch cut
  const notchAnimStyle = useAnimatedStyle(() => {
    const targetX = animatedIndex.value * tabWidth + tabWidth / 2 - NOTCH_WIDTH / 2;
    return {
      transform: [{ translateX: targetX }],
    };
  });

  // Animated style for the elevated floating active ball
  const ballAnimStyle = useAnimatedStyle(() => {
    const targetX = animatedIndex.value * tabWidth + (tabWidth - BALL_SIZE) / 2;
    return {
      transform: [
        { translateX: targetX },
        { translateY: ballTranslateY.value },
        { scaleX: ballScaleX.value },
        { scaleY: ballScaleY.value },
      ],
    };
  });

  // Active icon rotation style
  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${iconRotate.value}deg` }],
  }));

  const activeTabItem = TAB_CONFIG[activeIndex];

  return (
    <View
      style={[
        styles.outerContainer,
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.floatingBar,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            shadowColor: isDark ? '#000000' : '#4F46E5',
            shadowOpacity: isDark ? 0.45 : 0.12,
          },
        ]}
        onLayout={handleLayout}
      >
        {/* ─── Elevated Sliding Active Ball (Floating Sphere) ─── */}
        {navWidth > 0 && (
          <Animated.View style={[styles.activeBallContainer, ballAnimStyle]}>
            <LinearGradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              colors={
                activeTab === 'Create'
                  ? ['#EC4899', '#D946EF', '#8B5CF6']
                  : ['#38BDF8', '#3B82F6', '#6366F1']
              }
              style={styles.activeBallGradient}
            >
              {/* Inner Highlight for 3D sphere look */}
              <View style={styles.sphereHighlight} />
              <Animated.View style={iconAnimStyle}>
                {activeTabItem.renderIcon('#FFFFFF', 24)}
              </Animated.View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* ─── 5 Tab Columns ─── */}
        <View style={styles.tabRow}>
          {TAB_CONFIG.map((tab, idx) => {
            const isActive = activeIndex === idx;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabButton}
                onPress={() => handleTabPress(tab.key)}
                activeOpacity={0.7}
              >
                {/* Inactive Icon (Faded when active since active ball floats above) */}
                <View
                  style={[
                    styles.iconSlot,
                    { opacity: isActive ? 0 : 1 },
                  ]}
                >
                  {tab.renderIcon(colors.textSecondary, 22)}
                </View>

                {/* Tab Label */}
                <Text
                  style={[
                    styles.tabLabelText,
                    { color: isActive ? (isDark ? '#818CF8' : '#4F46E5') : colors.textMuted },
                    isActive && styles.tabLabelActiveText,
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outerContainer: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    backgroundColor: 'transparent',
  },
  floatingBar: {
    width: '100%',
    maxWidth: 420,
    height: 62,
    borderRadius: 30,
    borderWidth: 1,
    position: 'relative',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 10,
    justifyContent: 'center',
  },
  notchWrapper: {
    position: 'absolute',
    top: -1,
    left: 0,
    width: NOTCH_WIDTH,
    height: NOTCH_HEIGHT + 2,
    zIndex: 2,
  },
  activeBallContainer: {
    position: 'absolute',
    top: -18,
    left: 0,
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    zIndex: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.42,
    shadowRadius: 10,
    elevation: 12,
  },
  activeBallGradient: {
    width: '100%',
    height: '100%',
    borderRadius: BALL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  sphereHighlight: {
    position: 'absolute',
    top: 3,
    left: 8,
    width: 14,
    height: 7,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    transform: [{ rotate: '-25deg' }],
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: '100%',
    zIndex: 4,
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 7,
  },
  iconSlot: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  tabLabelText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  tabLabelActiveText: {
    fontWeight: '800',
    transform: [{ translateY: -1 }],
  },
});

export default BottomNav;
