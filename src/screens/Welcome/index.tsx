import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";

import { RootStackParamList } from "../../types/navigation";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { triggerHaptic } from "../../utils/haptics";
import BlinkingMascot from "../../components/common/BlinkingMascot";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Ambient Glow Mesh Orb ───────────────────────────────────────────────────
const AmbientGlowOrb: React.FC<{
  size: number;
  colors: [string, string, ...string[]];
  initialPosition: { top?: number; left?: number; right?: number; bottom?: number };
  duration?: number;
}> = ({ size, colors, initialPosition, duration = 4000 }) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-18, { duration, easing: Easing.inOut(Easing.quad) }),
        withTiming(16, { duration: duration * 1.15, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: duration * 0.9, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    translateX.value = withRepeat(
      withSequence(
        withTiming(14, { duration: duration * 1.2, easing: Easing.inOut(Easing.quad) }),
        withTiming(-12, { duration: duration * 0.95, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: duration * 1.1, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.14, { duration: duration * 1.4, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.94, { duration: duration * 1.3, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: duration * 1.2, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: 0.45,
          overflow: "hidden",
          ...initialPosition,
        },
        animStyle,
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
};

export default function Welcome() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Auto redirect if already signed in
  useEffect(() => {
    if (user && user.email) {
      navigation.reset({
        index: 0,
        routes: [{ name: "Dashboard" }],
      });
    }
  }, [user]);

  // Entrance animations
  const heroScale = useSharedValue(0.85);
  const heroOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(28);
  const contentOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(32);
  const buttonsOpacity = useSharedValue(0);

  useEffect(() => {
    heroScale.value = withSpring(1, { damping: 14, stiffness: 180 });
    heroOpacity.value = withTiming(1, { duration: 500 });

    contentTranslateY.value = withSpring(0, { damping: 15, stiffness: 160 });
    contentOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) });

    buttonsTranslateY.value = withSpring(0, { damping: 14, stiffness: 150 });
    buttonsOpacity.value = withTiming(1, { duration: 700 });
  }, []);

  const heroAnimStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ scale: heroScale.value }],
  }));

  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const buttonsAnimStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }],
  }));

  return (
    <View style={styles.root}>
      {/* Full-bleed Deep Space Cosmic Indigo Gradient Background */}
      <LinearGradient
        colors={["#0A061C", "#120B38", "#1E1154", "#2E1575"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating Ambient Mesh Glowing Orbs */}
      <AmbientGlowOrb
        size={SCREEN_WIDTH * 0.9}
        colors={["#7C3AED", "#4338CA", "#1E1B4B"]}
        initialPosition={{ top: -80, right: -80 }}
        duration={4400}
      />
      <AmbientGlowOrb
        size={SCREEN_WIDTH * 0.75}
        colors={["#6366F1", "#3B82F6", "#1E1B4B"]}
        initialPosition={{ top: SCREEN_HEIGHT * 0.3, left: -90 }}
        duration={5200}
      />
      <AmbientGlowOrb
        size={SCREEN_WIDTH * 0.7}
        colors={["#EC4899", "#8B5CF6", "#0F0A2A"]}
        initialPosition={{ bottom: -60, right: -50 }}
        duration={3800}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + 24, 52),
            paddingBottom: Math.max(insets.bottom + 20, 32),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero Mascot with Frosted Glass Halo ─────────────────────────── */}
        <Animated.View style={[styles.heroCenterBlock, heroAnimStyle]}>
          <View style={styles.mascotHaloContainer}>
            {/* Outer Pulsing Aura */}
            <LinearGradient
              colors={["#9333EA", "#6366F1", "#38BDF8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.mascotOuterAura}
            />

            {/* Frosted Glass Plate */}
            <View style={styles.mascotGlassPlate}>
              <BlinkingMascot size={82} style={styles.mascotIcon} />
            </View>

            {/* Sparkle Badges */}
            <View style={[styles.orbitalBadge, { top: -4, right: -4 }]}>
              <Text style={{ fontSize: 16 }}>⚡</Text>
            </View>
            <View style={[styles.orbitalBadge, { bottom: 2, left: -6 }]}>
              <Text style={{ fontSize: 14 }}>🎯</Text>
            </View>
          </View>
        </Animated.View>

        {/* ─── Hero Typography Block ───────────────────────────────────────── */}
        <Animated.View style={[styles.textBlock, contentAnimStyle]}>
          <Text style={styles.brandTitle}>Smarty AI</Text>
          <Text style={styles.heroTagline}>
            Turn any document, slide deck or notes into interactive quizzes you'll actually master.
          </Text>

          {/* ─── 3 Glassmorphic Feature Highlights ─────────────────────────── */}
          <View style={styles.featureCardsGrid}>
            <View style={styles.glassFeatureChip}>
              <View style={[styles.chipIconBubble, { backgroundColor: "rgba(124, 58, 237, 0.25)" }]}>
                <Ionicons name="document-text" size={16} color="#C4B5FD" />
              </View>
              <Text style={styles.chipText}>PDF & Slides to Quiz</Text>
            </View>

            <View style={styles.glassFeatureChip}>
              <View style={[styles.chipIconBubble, { backgroundColor: "rgba(245, 158, 11, 0.25)" }]}>
                <Ionicons name="flame" size={16} color="#FDE68A" />
              </View>
              <Text style={styles.chipText}>Daily Streak Sync</Text>
            </View>

            <View style={styles.glassFeatureChip}>
              <View style={[styles.chipIconBubble, { backgroundColor: "rgba(16, 185, 129, 0.25)" }]}>
                <Ionicons name="ribbon" size={16} color="#A7F3D0" />
              </View>
              <Text style={styles.chipText}>Smart Mastery</Text>
            </View>
          </View>
        </Animated.View>

        {/* ─── Bottom Actions Section ───────────────────────────────────────── */}
        <Animated.View style={[styles.actionsSection, buttonsAnimStyle]}>
          {/* Primary CTA Button: Create Free Account */}
          <TouchableOpacity
            onPress={() => {
              triggerHaptic.selection();
              navigation.navigate("SignUp");
            }}
            activeOpacity={0.88}
            style={styles.primaryBtnShadowWrap}
          >
            <LinearGradient
              colors={["#7C3AED", "#6366F1", "#4F46E5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>Get Started Free</Text>
              <View style={styles.primaryBtnArrowCircle}>
                <Ionicons name="arrow-forward" size={18} color="#6366F1" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Secondary CTA: Sign In */}
          <TouchableOpacity
            style={styles.secondaryGlassBtn}
            onPress={() => {
              triggerHaptic.selection();
              navigation.navigate("SignIn");
            }}
            activeOpacity={0.82}
          >
            <Text style={styles.secondaryBtnText}>I already have an account</Text>
          </TouchableOpacity>

          {/* Terms Footer */}
          <Text style={styles.termsNote}>
            By continuing, you agree to Smarty AI's{" "}
            <Text style={styles.termsLink}>Terms & Privacy Policy</Text>
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A061C",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },

  // Top Island Badge
  topBadgeWrapper: {
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
  },
  topBadgeGlow: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 22,
    backgroundColor: "#7C3AED",
    opacity: 0.3,
    transform: [{ scale: 1.05 }],
  },
  topBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.09)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 7,
    shadowColor: "#7C3AED",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  liveGreenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#10B981",
    marginRight: 8,
  },
  topBadgeText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#E0E7FF",
    letterSpacing: 0.3,
  },

  // Hero Mascot
  heroCenterBlock: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  mascotHaloContainer: {
    width: 136,
    height: 136,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  mascotOuterAura: {
    position: "absolute",
    width: 136,
    height: 136,
    borderRadius: 68,
    opacity: 0.4,
  },
  mascotGlassPlate: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.22)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#8B5CF6",
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
  },
  mascotIcon: {
    marginTop: 0,
  },
  orbitalBadge: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  // Typography Block
  textBlock: {
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 8,
  },
  brandTitle: {
    fontSize: 38,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.8,
    textAlign: "center",
    marginBottom: 8,
  },
  heroTagline: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.68)",
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "400",
    maxWidth: 340,
    marginBottom: 20,
  },

  // Feature Cards Grid
  featureCardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    width: "100%",
  },
  glassFeatureChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 7,
  },
  chipIconBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E2E8F0",
  },

  // Actions Section
  actionsSection: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    marginTop: 24,
  },
  primaryBtnShadowWrap: {
    width: "100%",
    borderRadius: 28,
    shadowColor: "#7C3AED",
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 14,
    marginBottom: 12,
  },
  primaryBtn: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  primaryBtnText: {
    fontSize: 16.5,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
    flex: 1,
    textAlign: "center",
    marginLeft: 32,
  },
  primaryBtnArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryGlassBtn: {
    width: "100%",
    height: 54,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.16)",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  secondaryBtnText: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.9)",
    letterSpacing: -0.2,
  },
  guestDemoBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  guestDemoText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FCD34D",
    textDecorationLine: "underline",
  },
  termsNote: {
    fontSize: 11.5,
    color: "rgba(255, 255, 255, 0.35)",
    textAlign: "center",
    lineHeight: 16,
    marginTop: 4,
  },
  termsLink: {
    color: "rgba(196, 181, 253, 0.8)",
    fontWeight: "600",
  },
});