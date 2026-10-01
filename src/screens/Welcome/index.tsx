import React, { useEffect } from "react";
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
  Easing,
} from "react-native-reanimated";

import { RootStackParamList } from "../../types/navigation";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { triggerHaptic } from "../../utils/haptics";
import BlinkingMascot from "../../components/common/BlinkingMascot";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

  // Clean Entrance animations
  const heroScale = useSharedValue(0.9);
  const heroOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);
  const contentOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(24);
  const buttonsOpacity = useSharedValue(0);

  useEffect(() => {
    heroScale.value = withSpring(1, { damping: 16, stiffness: 200 });
    heroOpacity.value = withTiming(1, { duration: 450 });

    contentTranslateY.value = withSpring(0, { damping: 16, stiffness: 180 });
    contentOpacity.value = withTiming(1, { duration: 550, easing: Easing.out(Easing.quad) });

    buttonsTranslateY.value = withSpring(0, { damping: 15, stiffness: 160 });
    buttonsOpacity.value = withTiming(1, { duration: 650 });
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
      {/* Clean Subtle Deep Navy/Indigo Backdrop */}
      <LinearGradient
        colors={["#0F0C24", "#0A0818", "#070512"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + 32, 60),
            paddingBottom: Math.max(insets.bottom + 24, 36),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero Mascot Block ─────────────────────────────────────────── */}
        <Animated.View style={[styles.heroBlock, heroAnimStyle]}>
          <View style={styles.mascotContainer}>
            <BlinkingMascot size={88} />
          </View>
        </Animated.View>

        {/* ─── Hero Typography Block ───────────────────────────────────────── */}
        <Animated.View style={[styles.textBlock, contentAnimStyle]}>
          <Text style={styles.brandTitle}>Smarty AI</Text>
          <Text style={styles.heroTagline}>
            Turn any document, slide deck, or lecture notes into interactive quizzes you'll actually master.
          </Text>

          {/* ─── Clean Feature Highlights (Industry Standard) ───────────────── */}
          <View style={styles.featuresRow}>
            <View style={styles.featurePill}>
              <View style={[styles.featureIconWrap, { backgroundColor: "rgba(99, 102, 241, 0.15)" }]}>
                <Ionicons name="document-text-outline" size={16} color="#818CF8" />
              </View>
              <Text style={styles.featureText}>Notes to Quiz</Text>
            </View>

            <View style={styles.featurePill}>
              <View style={[styles.featureIconWrap, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
                <Ionicons name="flame" size={16} color="#FBBF24" />
              </View>
              <Text style={styles.featureText}>Streak Sync</Text>
            </View>

            <View style={styles.featurePill}>
              <View style={[styles.featureIconWrap, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                <Ionicons name="trending-up" size={16} color="#34D399" />
              </View>
              <Text style={styles.featureText}>Mastery Score</Text>
            </View>
          </View>
        </Animated.View>

        {/* ─── Bottom Actions Section ───────────────────────────────────────── */}
        <Animated.View style={[styles.actionsSection, buttonsAnimStyle]}>
          {/* Primary CTA Button: Get Started Free */}
          <TouchableOpacity
            onPress={() => {
              triggerHaptic.selection();
              navigation.navigate("SignUp");
            }}
            activeOpacity={0.88}
            style={styles.primaryBtn}
          >
            <LinearGradient
              colors={["#6366F1", "#4F46E5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryGradient}
            >
              <Text style={styles.primaryBtnText}>Get Started Free</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={styles.arrowIcon} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Secondary CTA: Sign In */}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => {
              triggerHaptic.selection();
              navigation.navigate("SignIn");
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>I already have an account</Text>
          </TouchableOpacity>

          {/* Terms Footer */}
          <Text style={styles.termsNote}>
            By continuing, you agree to Smarty's{" "}
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
    backgroundColor: "#0A0818",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },

  // Hero Mascot
  heroBlock: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 24,
  },
  mascotContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#16132D",
    borderWidth: 1.5,
    borderColor: "#2E2954",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },

  // Typography Block
  textBlock: {
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 8,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.6,
    textAlign: "center",
    marginBottom: 10,
  },
  heroTagline: {
    fontSize: 15,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "400",
    maxWidth: 320,
    marginBottom: 24,
  },

  // Clean Feature Pills Row
  featuresRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    width: "100%",
  },
  featurePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16132D",
    borderWidth: 1,
    borderColor: "#26214A",
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
  },
  featureIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#E2E8F0",
  },

  // Actions Section
  actionsSection: {
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    marginTop: 36,
  },
  primaryBtn: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#6366F1",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  primaryGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  arrowIcon: {
    marginLeft: 8,
  },
  secondaryBtn: {
    width: "100%",
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#26214A",
    backgroundColor: "#16132D",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#E2E8F0",
    letterSpacing: -0.2,
  },
  termsNote: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 17,
  },
  termsLink: {
    color: "#818CF8",
    fontWeight: "600",
  },
});