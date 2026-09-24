import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../types/navigation";
import { useAuth } from "../../context/AuthContext";
import THEME from "../../config/theme";

export default function Welcome() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { guestSignIn } = useAuth();
  const insets = useSafeAreaInsets();

  const handleGuest = async () => {
    await guestSignIn();
    navigation.navigate("Dashboard");
  };

  return (
    <View style={styles.container}>
      {/* Soft Ambient Background Glows */}
      <View style={styles.ambientTopGlow} />
      <View style={styles.ambientMidGlow} />

      <View
        style={[
          styles.contentWrapper,
          {
            paddingTop: Math.max(insets.top, 24),
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}
      >
        {/* Main Hero Card */}
        <View style={styles.heroCardWrapper}>
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            colors={["#5850F6", "#6E50F8", "#8B4EF9"]}
            style={styles.heroCard}
          >
            {/* Mascot White Square Badge */}
            <View style={styles.mascotBadge}>
              <Image
                source={require("../../../assets/illustrations/smarty_logo.png")}
                resizeMode="contain"
                style={styles.mascotImage}
              />
            </View>

            {/* Title */}
            <Text style={styles.brandTitle}>Smarty AI</Text>

            {/* Subtitle */}
            <Text style={styles.heroSubtitle}>
              Turn any document into a quiz you can actually learn from.
            </Text>

            {/* Fast Quiz Generation Text (No Background) */}
            <Text style={styles.fastQuizText}>FAST QUIZ GENERATION</Text>
          </LinearGradient>
        </View>

        {/* Action Buttons Section */}
        <View style={styles.actionsContainer}>
          {/* Create Account Button */}
          <TouchableOpacity
            style={styles.createAccountBtn}
            onPress={() => navigation.navigate("SignUp")}
            activeOpacity={0.88}
          >
            <Text style={styles.createAccountText}>Create account</Text>
            <Ionicons name="arrow-forward" size={17} color={THEME.colors.primary} />
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={styles.signInBtn}
            onPress={() => navigation.navigate("SignIn")}
            activeOpacity={0.85}
          >
            <Text style={styles.signInText}>Sign in</Text>
          </TouchableOpacity>

          {/* Guest Button */}
          <TouchableOpacity
            style={styles.guestBtn}
            onPress={handleGuest}
            activeOpacity={0.7}
          >
            <Text style={styles.guestText}>Continue as guest</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F5FE",
    position: "relative",
    overflow: "hidden",
  },
  ambientTopGlow: {
    position: "absolute",
    top: -40,
    left: -50,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#DDD6FE",
    opacity: 0.5,
  },
  ambientMidGlow: {
    position: "absolute",
    top: 260,
    left: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#C4B5FD",
    opacity: 0.35,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    zIndex: 10,
  },
  heroCardWrapper: {
    width: "100%",
    flex: 1,
    justifyContent: "center",
    paddingTop: 20,
  },
  heroCard: {
    borderRadius: 28,
    paddingVertical: 44,
    paddingHorizontal: 28,
    alignItems: "center",
    shadowColor: "#5850F6",
    shadowOpacity: 0.38,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    elevation: 10,
  },
  mascotBadge: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  mascotImage: {
    width: 68,
    height: 68,
    alignSelf: "center",
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 24,
    marginBottom: 10,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 15.5,
    color: "rgba(255, 255, 255, 0.88)",
    textAlign: "center",
    lineHeight: 23,
    paddingHorizontal: 16,
  },
  fastQuizText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1.2,
    marginTop: 30,
    textAlign: "center",
  },
  actionsContainer: {
    width: "100%",
    paddingBottom: 8,
  },
  createAccountBtn: {
    width: "100%",
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  createAccountText: {
    color: THEME.colors.primary,
    fontSize: 16,
    fontWeight: "700",
    marginRight: 6,
  },
  signInBtn: {
    width: "100%",
    height: 54,
    borderRadius: 27,
    backgroundColor: "#EAE5FF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  signInText: {
    color: "#1B1931",
    fontSize: 16,
    fontWeight: "700",
  },
  guestBtn: {
    marginTop: 20,
    paddingVertical: 8,
    alignItems: "center",
  },
  guestText: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "600",
  },
});