import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from "react-native-reanimated";
import { RootStackParamList } from "../../types/navigation";
import { useAuth } from "../../context/AuthContext";
import THEME from "../../config/theme";

const { width: SCREEN_W } = Dimensions.get("window");

// ─── Slide data ───────────────────────────────────────────────────────────────
const SLIDES = [
  {
    key: "1",
    illustration: require("../../../assets/illustrations/onboard_1.png"),
    title: "Welcome to Smarty AI",
    subtitle:
      "Your intelligent study companion. Let AI create personalized quizzes just for you.",
  },
  {
    key: "2",
    illustration: require("../../../assets/illustrations/onboard_3.png"),
    title: "AI-Powered Quiz Generation",
    subtitle:
      "Google Gemini AI analyzes your documents and creates intelligent questions — multiple choice, true/false, and fill in the blanks.",
  },
];

// ─── Animated Dot ─────────────────────────────────────────────────────────────
const AnimatedDot: React.FC<{ index: number; activeIndex: number }> = ({
  index,
  activeIndex,
}) => {
  const isActive = index === activeIndex;
  const widthAnim = useSharedValue(isActive ? 24 : 6);

  React.useEffect(() => {
    widthAnim.value = withSpring(isActive ? 24 : 6, {
      damping: 14,
      stiffness: 260,
    });
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    width: widthAnim.value,
    backgroundColor: isActive ? THEME.colors.primary : "#E5E7EB",
  }));

  return <Animated.View style={[styles.dot, animStyle]} />;
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MainOnboard1() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);

  React.useEffect(() => {
    if (user && user.email) {
      navigation.reset({
        index: 0,
        routes: [{ name: "Dashboard" }],
      });
    }
  }, [user]);

  // translateX drives the entire slides row
  const translateX = useSharedValue(0);
  // content fade/slide for text
  const contentOpacity = useSharedValue(1);
  const contentSlide = useSharedValue(0);

  const goTo = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= SLIDES.length) return;

    // Slide the whole strip
    translateX.value = withSpring(-nextIndex * SCREEN_W, {
      damping: 18,
      stiffness: 220,
      mass: 0.9,
      overshootClamping: false,
    });

    // Fade out text, swap index, fade back in
    contentOpacity.value = withTiming(0, { duration: 120 }, () => {
      runOnJS(setActiveIndex)(nextIndex);
      contentOpacity.value = withTiming(1, { duration: 280 });
    });
    contentSlide.value = withTiming(-16, { duration: 120 }, () => {
      contentSlide.value = 16;
      contentSlide.value = withSpring(0, { damping: 14, stiffness: 220 });
    });
  };

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      goTo(activeIndex + 1);
    } else {
      navigation.navigate("Welcome");
    }
  };

  const handleBack = () => {
    if (activeIndex > 0) {
      goTo(activeIndex - 1);
    }
  };

  // Animated strip style
  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Content fade style
  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentSlide.value }],
  }));

  const isLast = activeIndex === SLIDES.length - 1;
  const slide = SLIDES[activeIndex];

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.brandRow}>
          <Image
            source={require("../../../assets/illustrations/smarty_logo.png")}
            resizeMode="contain"
            style={styles.logoImage}
          />
          <Text style={styles.brandTitle}>Smarty AI</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate("Welcome")}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.skipBtn}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* ── Sliding illustration strip ── */}
      <View style={styles.illustrationViewport}>
        <Animated.View style={[styles.illustrationStrip, stripStyle]}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={styles.illustrationSlide}>
              <View style={styles.illustrationWrapper}>
                <Image
                  source={s.illustration}
                  resizeMode="contain"
                  style={styles.illustration}
                />
              </View>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* ── Bottom content ── */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 28) }]}>
        {/* Animated text block */}
        <Animated.View style={[styles.textBlock, contentAnimStyle]}>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
        </Animated.View>

        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <AnimatedDot key={i} index={i} activeIndex={activeIndex} />
          ))}
        </View>

        {/* Navigation row */}
        <View style={styles.navRow}>
          {/* Back button (hidden on first slide) */}
          <TouchableOpacity
            style={[styles.backBtn, activeIndex === 0 && styles.invisible]}
            onPress={handleBack}
            activeOpacity={0.7}
            disabled={activeIndex === 0}
          >
            <Ionicons name="arrow-back" size={16} color="#4B5563" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          {/* Next / Get Started button */}
          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.88}
            style={styles.nextBtnShadow}
          >
            <LinearGradient
              colors={["#6D44F2", THEME.colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextBtn}
            >
              <Text style={styles.nextText}>
                {isLast ? "Get Started 🚀" : "Next"}
              </Text>
              {!isLast && (
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color="#fff"
                  style={{ marginLeft: 6 }}
                />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // ── Header ──────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    zIndex: 10,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
    letterSpacing: -0.2,
  },
  skipBtn: {
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "600",
    color: THEME.colors.primary,
    lineHeight: 18,
  },

  // ── Illustration strip ───────────────────────
  illustrationViewport: {
    flex: 1,
    overflow: "hidden",
  },
  illustrationStrip: {
    flexDirection: "row",
    width: SCREEN_W * SLIDES.length,
    flex: 1,
  },
  illustrationSlide: {
    width: SCREEN_W,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  illustrationWrapper: {
    width: Math.min(SCREEN_W - 48, 280),
    height: 250,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  illustration: {
    width: 320,
    height: 280,
    transform: [{ scale: 1.1 }],
  },

  // ── Bottom ───────────────────────────────────
  bottom: {
    paddingHorizontal: 28,
    paddingTop: 8,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  textBlock: {
    alignItems: "center",
    width: "100%",
    minHeight: 90,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 8,
  },

  // ── Dots ─────────────────────────────────────
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    marginBottom: 24,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },

  // ── Nav row ──────────────────────────────────
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  backText: {
    color: "#4B5563",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 6,
  },
  invisible: {
    opacity: 0,
    pointerEvents: "none",
  },
  nextBtnShadow: {
    borderRadius: 25,
    shadowColor: THEME.colors.primary,
    shadowOpacity: 0.38,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 8,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 32,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
  },
  nextText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});