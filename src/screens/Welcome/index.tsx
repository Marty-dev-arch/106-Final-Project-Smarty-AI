import React, { useEffect } from "react";
import {
  View,
  Text,
  Image,
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
import { triggerHaptic } from "../../utils/haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function Welcome() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
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
  const heroScale = useSharedValue(0.92);
  const heroOpacity = useSharedValue(0);
  const heroTranslateY = useSharedValue(20);
  const buttonsTranslateY = useSharedValue(24);
  const buttonsOpacity = useSharedValue(0);

  useEffect(() => {
    heroScale.value = withSpring(1, { damping: 16, stiffness: 200 });
    heroOpacity.value = withTiming(1, { duration: 450 });
    heroTranslateY.value = withSpring(0, { damping: 16, stiffness: 180 });

    buttonsTranslateY.value = withSpring(0, { damping: 15, stiffness: 160 });
    buttonsOpacity.value = withTiming(1, { duration: 600 });
  }, []);

  const heroAnimStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ scale: heroScale.value }, { translateY: heroTranslateY.value }],
  }));

  const buttonsAnimStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }],
  }));

  return (
    <View style={styles.root}>
      {/* Background Subtle Gradient */}
      <LinearGradient
        colors={["#F8FAFC", "#EEF2FF", "#F1F5F9"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + 20, 48),
            paddingBottom: Math.max(insets.bottom + 20, 32),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Purple Hero Container ────────────────────────────────────────── */}
        <Animated.View style={[styles.heroCard, heroAnimStyle]}>
          <LinearGradient
            colors={["#6366F1", "#4F46E5", "#3730A3"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            {/* Star Logo in White Rounded Square */}
            <View style={styles.mascotSquare}>
              <Image
                source={require('../../../assets/illustrations/smarty_logo.png')}
                style={{ width: 72, height: 72 }}
                resizeMode="contain"
              />
            </View>

            {/* Smarty AI Title */}
            <Text style={styles.brandTitle}>Smarty AI</Text>

            {/* Subtitle / Tagline */}
            <Text style={styles.heroTagline}>
              Turn any document into a quiz you can actually learn from.
            </Text>

            {/* FAST QUIZ GENERATION Capsule Pill */}
            <View style={styles.capsulePill}>
              <Text style={styles.capsulePillText}>FAST QUIZ GENERATION</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ─── Bottom Action Buttons ────────────────────────────────────────── */}
        <Animated.View style={[styles.actionsSection, buttonsAnimStyle]}>
          {/* Create account → */}
          <TouchableOpacity
            onPress={() => {
              triggerHaptic.selection();
              navigation.navigate("SignUp");
            }}
            activeOpacity={0.88}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Create account</Text>
            <Ionicons name="arrow-forward" size={17} color="#4F46E5" style={styles.arrowIcon} />
          </TouchableOpacity>

          {/* Sign in */}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => {
              triggerHaptic.selection();
              navigation.navigate("SignIn");
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>Sign in</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },

  heroCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 8,
    marginTop: 10,
    marginBottom: 20,
  },
  heroGradient: {
    paddingVertical: 32,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  mascotSquare: {
    width: 92,
    height: 92,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    textAlign: "center",
    marginBottom: 10,
  },
  heroTagline: {
    fontSize: 14.5,
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "400",
    maxWidth: 300,
    marginBottom: 20,
  },
  capsulePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  capsulePillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.8,
  },

  // Actions Section
  actionsSection: {
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    marginTop: 10,
  },
  primaryBtn: {
    width: "100%",
    height: 52,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4F46E5",
    letterSpacing: -0.2,
  },
  arrowIcon: {
    marginLeft: 6,
  },
  secondaryBtn: {
    width: "100%",
    height: 52,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E1B4B",
    letterSpacing: -0.2,
  },
});