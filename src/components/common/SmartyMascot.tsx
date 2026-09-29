import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ImageStyle,
  Platform,
} from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';

export type MascotMood = 'idle' | 'thinking' | 'celebrating' | 'encouraging' | 'excited';

interface SmartyMascotProps {
  size?: number;
  mood?: MascotMood;
  interactive?: boolean;
  showSpeech?: boolean;
  customSpeech?: string;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  onPress?: () => void;
}

const PLAYFUL_QUOTES = [
  "You're a genius in the making! 🧠✨",
  'Consistency is your superpower! 🔥',
  "Let's conquer today's study drill! 🚀",
  'Curiosity leads to mastery! 💡',
  'Keep that streak burning! 🏆',
  'I believe in your potential! 🌟',
];

export const SmartyMascot: React.FC<SmartyMascotProps> = ({
  size = 90,
  mood = 'idle',
  interactive = true,
  showSpeech = false,
  customSpeech,
  style,
  imageStyle,
  onPress,
}) => {
  // Blinking Shared Value (0 = open, 1 = closed)
  const blinkVal = useSharedValue(0);

  // Bobbing / Floating Shared Values
  const floatY = useSharedValue(0);
  const tiltDeg = useSharedValue(0);
  const scale = useSharedValue(1);

  // Reaction spark / speech quote
  const [speechBubbleText, setSpeechBubbleText] = useState<string | null>(customSpeech || null);
  const speechOpacity = useSharedValue(customSpeech || showSpeech ? 1 : 0);
  const speechScale = useSharedValue(customSpeech || showSpeech ? 1 : 0.8);

  // Thinking pulse
  const thinkPulse = useSharedValue(0);

  // Celebrating bounce
  const celebrateJump = useSharedValue(0);

  // 1. Idle Bobbing & Floating
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, []);

  // 2. Natural Blinking Loop
  useEffect(() => {
    let timeoutId: any;
    let active = true;

    const triggerBlinkLoop = () => {
      const nextDelay = Math.floor(Math.random() * 2200) + 2400;
      timeoutId = setTimeout(() => {
        if (!active) return;
        blinkVal.value = withSequence(
          withTiming(1, { duration: 90, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 110, easing: Easing.inOut(Easing.ease) })
        );

        // 25% chance of quick double-blink
        if (Math.random() < 0.25) {
          setTimeout(() => {
            if (!active) return;
            blinkVal.value = withSequence(
              withTiming(1, { duration: 80 }),
              withTiming(0, { duration: 90 })
            );
            triggerBlinkLoop();
          }, 140);
        } else {
          triggerBlinkLoop();
        }
      }, nextDelay);
    };

    triggerBlinkLoop();
    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, []);

  // 3. Mood-Specific Animation Behaviors
  useEffect(() => {
    if (mood === 'thinking') {
      // Gentle thoughtful tilt & thinking ripples
      tiltDeg.value = withRepeat(
        withSequence(
          withTiming(5, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
          withTiming(-4, { duration: 1200, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      );
      thinkPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.out(Easing.ease) }),
          withTiming(0.2, { duration: 900, easing: Easing.in(Easing.ease) })
        ),
        -1,
        true
      );
    } else if (mood === 'celebrating') {
      // Joyful celebratory jumping
      celebrateJump.value = withRepeat(
        withSequence(
          withTiming(-12, { duration: 320, easing: Easing.out(Easing.quad) }),
          withSpring(0, { damping: 10, stiffness: 280 })
        ),
        -1,
        false
      );
      tiltDeg.value = withRepeat(
        withSequence(
          withTiming(6, { duration: 300 }),
          withTiming(-6, { duration: 300 })
        ),
        -1,
        true
      );
    } else if (mood === 'excited') {
      // Energetic hopping
      scale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 250 }),
          withTiming(0.96, { duration: 250 })
        ),
        -1,
        true
      );
    } else if (mood === 'encouraging') {
      // Gentle sympathetic swaying
      tiltDeg.value = withRepeat(
        withSequence(
          withTiming(3, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(-3, { duration: 1800, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
    } else {
      // Idle
      tiltDeg.value = withTiming(0, { duration: 400 });
      scale.value = withTiming(1, { duration: 400 });
      thinkPulse.value = withTiming(0);
      celebrateJump.value = withTiming(0);
    }
  }, [mood]);

  // Handle Mascot Tap
  const handleMascotTap = () => {
    // Playful bounce
    scale.value = withSequence(
      withSpring(1.22, { damping: 8, stiffness: 350 }),
      withSpring(1, { damping: 12, stiffness: 260 })
    );
    tiltDeg.value = withSequence(
      withTiming(12, { duration: 100 }),
      withTiming(-12, { duration: 120 }),
      withSpring(0, { damping: 12, stiffness: 260 })
    );

    // Pick random quote
    const randomQuote = PLAYFUL_QUOTES[Math.floor(Math.random() * PLAYFUL_QUOTES.length)];
    setSpeechBubbleText(randomQuote);
    speechOpacity.value = withSequence(
      withTiming(1, { duration: 180 }),
      withTiming(1, { duration: 2600 }),
      withTiming(0, { duration: 300 })
    );
    speechScale.value = withSequence(
      withSpring(1, { damping: 12, stiffness: 300 }),
      withTiming(1, { duration: 2600 }),
      withTiming(0.8, { duration: 300 })
    );

    if (onPress) onPress();
  };

  const mascotWidth = size;
  const mascotHeight = size * (734 / 807);

  // Animated Body Style
  const animatedBodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatY.value + celebrateJump.value },
      { rotate: `${tiltDeg.value}deg` },
      { scale: scale.value },
    ],
  }));

  // Eyelid style
  const leftEyelidStyle = useAnimatedStyle(() => ({
    opacity: blinkVal.value,
    transform: [
      {
        scaleY: interpolate(blinkVal.value, [0, 1], [0.1, 1]),
      },
    ],
  }));

  // Thinking aura style
  const thinkingAuraStyle = useAnimatedStyle(() => ({
    opacity: thinkPulse.value,
    transform: [{ scale: interpolate(thinkPulse.value, [0, 1], [0.85, 1.25]) }],
  }));

  // Speech bubble style
  const animatedSpeechStyle = useAnimatedStyle(() => ({
    opacity: speechOpacity.value,
    transform: [{ scale: speechScale.value }],
  }));

  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* Speech Quote Popover */}
      {speechBubbleText && (
        <Animated.View style={[styles.speechBubbleContainer, animatedSpeechStyle]}>
          <Text style={styles.speechBubbleText}>{speechBubbleText}</Text>
          <View style={styles.speechBubbleTriangle} />
        </Animated.View>
      )}

      {/* Main Mascot Container */}
      <TouchableOpacity
        activeOpacity={interactive ? 0.9 : 1}
        onPress={interactive ? handleMascotTap : undefined}
        disabled={!interactive}
        style={{ width: mascotWidth, height: mascotHeight, position: 'relative' }}
      >
        {/* Thinking Aura / Sparkles */}
        {mood === 'thinking' && (
          <Animated.View style={[styles.thinkingAura, thinkingAuraStyle]}>
            <Svg width={size * 0.7} height={size * 0.4} viewBox="0 0 50 30" fill="none">
              <Circle cx="25" cy="15" r="8" stroke="#8B5CF6" strokeWidth="2" strokeDasharray="3 3" />
              <Path d="M12 8 Q25 2 38 8" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" />
              <Circle cx="8" cy="18" r="2.5" fill="#EC4899" />
              <Circle cx="42" cy="18" r="2.5" fill="#3B82F6" />
            </Svg>
          </Animated.View>
        )}

        {/* Celebrating Crown / Confetti Stars */}
        {mood === 'celebrating' && (
          <View style={styles.celebratingCrown}>
            <Text style={{ fontSize: size * 0.28 }}>👑</Text>
          </View>
        )}

        {/* Encouraging Heart Aura */}
        {mood === 'encouraging' && (
          <View style={styles.encouragingHeart}>
            <Text style={{ fontSize: size * 0.24 }}>💖</Text>
          </View>
        )}

        <Animated.View style={[{ width: '100%', height: '100%' }, animatedBodyStyle]}>
          <Image
            source={require('../../../assets/illustrations/smarty_companion_mascot.png')}
            style={[{ width: '100%', height: '100%' }, imageStyle]}
            resizeMode="contain"
          />

          {/* Left Eye Blink Overlay */}
          <Animated.View
            style={[
              styles.eyelidOverlay,
              {
                left: '36.5%',
                top: '44.5%',
                width: '15.5%',
                height: '16.5%',
              },
              leftEyelidStyle,
            ]}
          >
            <View style={styles.eyelidSkin}>
              <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
                <Path
                  d="M4 14C7 8 17 8 20 14"
                  stroke="#362127"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                />
              </Svg>
            </View>
          </Animated.View>

          {/* Right Eye Blink Overlay */}
          <Animated.View
            style={[
              styles.eyelidOverlay,
              {
                left: '67.5%',
                top: '44.5%',
                width: '16%',
                height: '16.5%',
              },
              leftEyelidStyle,
            ]}
          >
            <View style={styles.eyelidSkin}>
              <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
                <Path
                  d="M4 14C7 8 17 8 20 14"
                  stroke="#362127"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                />
              </Svg>
            </View>
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  eyelidOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  eyelidSkin: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F2C5CC',
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  thinkingAura: {
    position: 'absolute',
    top: -16,
    alignSelf: 'center',
    zIndex: 8,
    alignItems: 'center',
  },
  celebratingCrown: {
    position: 'absolute',
    top: -14,
    alignSelf: 'center',
    zIndex: 10,
    shadowColor: '#F59E0B',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  encouragingHeart: {
    position: 'absolute',
    top: -10,
    right: -4,
    zIndex: 10,
  },
  speechBubbleContainer: {
    position: 'absolute',
    top: -46,
    backgroundColor: '#1E1B4B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#4F46E5',
    zIndex: 20,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
    maxWidth: 200,
    alignItems: 'center',
  },
  speechBubbleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  speechBubbleTriangle: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#1E1B4B',
  },
});

export default SmartyMascot;
