import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import SmartyMascot from './SmartyMascot';

interface BrainSpinnerProps {
  size?: number;
  color?: string;
  message?: string;
  fullScreen?: boolean;
  progress?: number;
}

const BrainSvgIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Left Brain Hemisphere */}
    <Path
      d="M12 5C10.5 3.5 8 3.5 6.5 5C5 6.5 5 9 6 10.5C4.5 11.5 4 14 5 15.5C6 17 8 17.5 9.5 17C10.5 18.5 12 18.5 12 18.5"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8.5 8C7 8 6 9.5 7.5 11"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
    <Path
      d="M9 13.5C7.5 14 7 15.5 8.5 16"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
    {/* Right Brain Hemisphere */}
    <Path
      d="M12 5C13.5 3.5 16 3.5 17.5 5C19 6.5 19 9 18 10.5C19.5 11.5 20 14 19 15.5C18 17 16 17.5 14.5 17C13.5 18.5 12 18.5 12 18.5"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M15.5 8C17 8 18 9.5 16.5 11"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
    <Path
      d="M15 13.5C16.5 14 17 15.5 15.5 16"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
    {/* Center Division Line */}
    <Path
      d="M12 5V18.5"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeDasharray="2 2"
    />
  </Svg>
);

export default function BrainSpinner({
  size = 64,
  color = '#6D44F2',
  message,
  fullScreen = false,
  progress: externalProgress,
}: BrainSpinnerProps) {
  const rotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  const [autoProgress, setAutoProgress] = useState(0);
  const [statusStep, setStatusStep] = useState('Initializing synthesis...');

  const activeProgress = typeof externalProgress === 'number' ? externalProgress : autoProgress;

  useEffect(() => {
    // Continuous 360-degree rotation for ring
    rotation.value = withRepeat(
      withTiming(360, { duration: 1600, easing: Easing.linear }),
      -1,
      false
    );

    // Breathing pulse for brain
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 700, easing: Easing.ease }),
        withTiming(0.92, { duration: 700, easing: Easing.ease })
      ),
      -1,
      true
    );

    // Auto progress increment if fullScreen and no external progress passed
    if (typeof externalProgress !== 'number') {
      let current = 5;
      const interval = setInterval(() => {
        current += Math.floor(Math.random() * 12) + 6;
        if (current > 98) current = 98;
        setAutoProgress(current);

        if (current < 25) {
          setStatusStep('Analyzing document structure & text...');
        } else if (current < 55) {
          setStatusStep('Extracting key concepts & definitions...');
        } else if (current < 85) {
          setStatusStep('Synthesizing questions & explanations...');
        } else {
          setStatusStep('Finalizing quiz package...');
        }
      }, 150);

      return () => clearInterval(interval);
    }
  }, [externalProgress]);

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const animatedBrainStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const content = (
    <View style={styles.spinnerWrapper}>
      {fullScreen && (
        <View style={{ marginBottom: 12 }}>
          <SmartyMascot size={76} mood="thinking" interactive={false} />
        </View>
      )}

      <View style={{ width: size + 28, height: size + 28, alignItems: 'center', justifyContent: 'center' }}>
        {/* Outer Rotating Glowing Ring */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.ringContainer,
            animatedRingStyle,
          ]}
        >
          <Svg width={size + 28} height={size + 28} viewBox="0 0 100 100">
            <Defs>
              <SvgGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={color} stopOpacity="1" />
                <Stop offset="50%" stopColor="#A78BFA" stopOpacity="0.8" />
                <Stop offset="100%" stopColor={color} stopOpacity="0.1" />
              </SvgGradient>
            </Defs>
            <Circle
              cx="50"
              cy="50"
              r="42"
              stroke="url(#ringGrad)"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="180 80"
            />
          </Svg>
        </Animated.View>

        {/* Inner Pulsing Brain */}
        <Animated.View style={[styles.brainCenter, animatedBrainStyle]}>
          <BrainSvgIcon size={size * 0.58} color={color} />
        </Animated.View>
      </View>

      {message && <Text style={[styles.messageText, { color }]}>{message}</Text>}

      {/* Live Visual Progress Bar Section */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeaderRow}>
          <Text style={styles.statusStepText}>{statusStep}</Text>
          <Text style={styles.percentText}>{activeProgress}%</Text>
        </View>

        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${activeProgress}%` }]} />
        </View>
      </View>
    </View>
  );

  if (fullScreen) {
    return <View style={styles.fullScreenOverlay}>{content}</View>;
  }

  return content;
}

const styles = StyleSheet.create({
  spinnerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brainCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6D44F2',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  messageText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  progressContainer: {
    width: '100%',
    marginTop: 18,
    paddingHorizontal: 8,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusStepText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    flex: 1,
    marginRight: 8,
  },
  percentText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6D44F2',
  },
  progressBarTrack: {
    height: 8,
    width: '100%',
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6D44F2',
    borderRadius: 4,
  },
  fullScreenOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
});
