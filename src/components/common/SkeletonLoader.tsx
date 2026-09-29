import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';

// ─── Base Skeleton Item ──────────────────────────────────────────────────────

interface SkeletonItemProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonItem: React.FC<SkeletonItemProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}) => {
  const { isDark } = useTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 850, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 850, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = isDark
      ? interpolateColor(opacity.value, [0.4, 0.85], ['#1E293B', '#334155'])
      : interpolateColor(opacity.value, [0.4, 0.85], ['#E2E8F0', '#F1F5F9']);

    return {
      backgroundColor,
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

// ─── Circle & Text Helpers ───────────────────────────────────────────────────

export const SkeletonCircle: React.FC<{ size?: number; style?: StyleProp<ViewStyle> }> = ({
  size = 44,
  style,
}) => <SkeletonItem width={size} height={size} borderRadius={size / 2} style={style} />;

export const SkeletonText: React.FC<{
  width?: number | string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}> = ({ width = '100%', height = 14, style }) => (
  <SkeletonItem width={width} height={height} borderRadius={6} style={style} />
);

// ─── Tab-Specific Full Skeletons ─────────────────────────────────────────────

/** Dashboard Loading Skeleton */
export const DashboardSkeleton: React.FC = () => {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.skeletonContainer}>
      {/* Greeting Header */}
      <View style={{ marginBottom: 16 }}>
        <SkeletonText width={180} height={24} style={{ marginBottom: 6 }} />
        <SkeletonText width={240} height={14} />
      </View>

      {/* Mascot Card */}
      <View
        style={[
          styles.skeletonCard,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <SkeletonCircle size={64} style={{ marginRight: 14 }} />
          <View style={{ flex: 1 }}>
            <SkeletonText width={80} height={12} style={{ marginBottom: 8 }} />
            <SkeletonText width="90%" height={14} style={{ marginBottom: 6 }} />
            <SkeletonText width="65%" height={14} />
          </View>
        </View>
      </View>

      {/* Upload Banner */}
      <View
        style={[
          styles.skeletonCard,
          {
            backgroundColor: isDark ? '#1E293B' : '#EDE9FE',
            borderColor: 'transparent',
            height: 76,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <SkeletonCircle size={40} style={{ marginRight: 12 }} />
            <View>
              <SkeletonText width={140} height={16} style={{ marginBottom: 6 }} />
              <SkeletonText width={180} height={12} />
            </View>
          </View>
          <SkeletonCircle size={24} />
        </View>
      </View>

      {/* 3 Metric Cards */}
      <View style={styles.metricsRow}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.metricCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <SkeletonCircle size={32} style={{ marginBottom: 8 }} />
            <SkeletonText width={40} height={20} style={{ marginBottom: 4 }} />
            <SkeletonText width={55} height={11} />
          </View>
        ))}
      </View>

      {/* Study Decks Section */}
      <View style={{ marginTop: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
          <SkeletonText width={130} height={18} />
          <SkeletonText width={60} height={14} />
        </View>
        {[1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.deckCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <SkeletonCircle size={40} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <SkeletonText width="70%" height={16} style={{ marginBottom: 6 }} />
                <SkeletonText width="40%" height={12} />
              </View>
            </View>
            <SkeletonItem height={6} borderRadius={3} style={{ marginBottom: 10 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <SkeletonText width={70} height={12} />
              <SkeletonText width={50} height={12} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

/** MyQuizzes Loading Skeleton */
export const MyQuizzesSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={styles.skeletonContainer}>
      {/* Search Input Bar */}
      <View
        style={[
          styles.skeletonCard,
          { backgroundColor: colors.card, borderColor: colors.cardBorder, height: 48, marginBottom: 14 },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <SkeletonCircle size={20} style={{ marginRight: 10 }} />
          <SkeletonText width={140} height={14} />
        </View>
      </View>

      {/* Category Filter Chips */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
        <SkeletonItem width={60} height={32} borderRadius={16} />
        <SkeletonItem width={80} height={32} borderRadius={16} />
        <SkeletonItem width={75} height={32} borderRadius={16} />
        <SkeletonItem width={70} height={32} borderRadius={16} />
      </View>

      {/* Quiz Cards */}
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.deckCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <SkeletonCircle size={44} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <SkeletonText width="75%" height={16} style={{ marginBottom: 6 }} />
              <SkeletonText width="45%" height={12} />
            </View>
          </View>
          <SkeletonItem height={6} borderRadius={3} style={{ marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <SkeletonText width={80} height={12} />
            <SkeletonItem width={70} height={28} borderRadius={14} />
          </View>
        </View>
      ))}
    </View>
  );
};

/** Achievements Loading Skeleton */
export const AchievementsSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={styles.skeletonContainer}>
      {/* Hero Trophy Card */}
      <View
        style={[
          styles.skeletonCard,
          { backgroundColor: colors.card, borderColor: colors.cardBorder, marginBottom: 16 },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <SkeletonCircle size={54} style={{ marginRight: 14 }} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
              <SkeletonText width={80} height={12} />
              <SkeletonText width={40} height={12} />
            </View>
            <SkeletonText width="60%" height={18} style={{ marginBottom: 6 }} />
            <SkeletonText width="40%" height={12} />
          </View>
        </View>
      </View>

      {/* Capsule Switch Tabs */}
      <SkeletonItem height={42} borderRadius={14} style={{ marginBottom: 16 }} />

      {/* Progress Card */}
      <View
        style={[
          styles.skeletonCard,
          { backgroundColor: colors.card, borderColor: colors.cardBorder, marginBottom: 20 },
        ]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <SkeletonText width={150} height={14} />
          <SkeletonText width={60} height={14} />
        </View>
        <SkeletonItem height={6} borderRadius={3} />
      </View>

      {/* 3-Column Medals Grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={{ width: '30%', alignItems: 'center', marginBottom: 14 }}>
            <SkeletonCircle size={64} style={{ marginBottom: 8 }} />
            <SkeletonText width="80%" height={12} style={{ marginBottom: 4 }} />
            <SkeletonText width="50%" height={10} />
          </View>
        ))}
      </View>
    </View>
  );
};

/** Performance Loading Skeleton */
export const PerformanceSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={styles.skeletonContainer}>
      {/* Period Selector Tabs */}
      <SkeletonItem height={40} borderRadius={20} style={{ marginBottom: 20 }} />

      {/* Overall Score Card */}
      <View
        style={[
          styles.skeletonCard,
          { backgroundColor: colors.card, borderColor: colors.cardBorder, marginBottom: 24 },
        ]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <SkeletonText width={100} height={14} />
          <SkeletonText width={120} height={14} />
        </View>
        <SkeletonText width={110} height={42} style={{ marginBottom: 8 }} />
        <SkeletonText width="85%" height={13} style={{ marginBottom: 14 }} />

        {/* Trend Area Chart Placeholder */}
        <SkeletonItem height={75} borderRadius={12} style={{ marginBottom: 16 }} />

        {/* 3 Metrics Divider Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: 10 }}>
          <View style={{ alignItems: 'center' }}>
            <SkeletonText width={40} height={18} style={{ marginBottom: 4 }} />
            <SkeletonText width={50} height={11} />
          </View>
          <View style={{ alignItems: 'center' }}>
            <SkeletonText width={40} height={18} style={{ marginBottom: 4 }} />
            <SkeletonText width={55} height={11} />
          </View>
          <View style={{ alignItems: 'center' }}>
            <SkeletonText width={40} height={18} style={{ marginBottom: 4 }} />
            <SkeletonText width={45} height={11} />
          </View>
        </View>
      </View>

      {/* Subject Mastery Skeletons */}
      <View style={{ marginBottom: 14 }}>
        <SkeletonText width={140} height={18} style={{ marginBottom: 4 }} />
        <SkeletonText width={200} height={12} style={{ marginBottom: 14 }} />
      </View>

      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.deckCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder, marginBottom: 12 },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <SkeletonCircle size={40} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <SkeletonText width="65%" height={15} style={{ marginBottom: 4 }} />
              <SkeletonText width="35%" height={12} />
            </View>
            <SkeletonText width={35} height={16} />
          </View>
          <SkeletonItem height={6} borderRadius={3} />
        </View>
      ))}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  skeletonContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  skeletonCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  deckCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
});

export default SkeletonItem;
