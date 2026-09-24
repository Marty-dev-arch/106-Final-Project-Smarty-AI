import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../types/navigation";
import PaginationDots from "../../components/common/PaginationDots";
import THEME from "../../config/theme";

export default function MainOnboard2() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 16) }]}>
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
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Center Transparent Illustration Stage */}
      <View style={styles.stageArea}>
        <Image
          source={require("../../../assets/illustrations/onboard_2.png")}
          resizeMode="contain"
          style={styles.illustration}
        />
      </View>

      {/* Bottom Content Section */}
      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 28) }]}>
        <Text style={styles.title}>Upload Your Learning{"\n"}Materials</Text>
        <Text style={styles.subtitle}>
          Simply upload your PDF or PowerPoint files. Smarty AI works with textbooks, lecture slides, notes, and study guides.
        </Text>

        {/* Centered Dots */}
        <View style={styles.dotsWrapper}>
          <PaginationDots activeIndex={1} total={4} />
        </View>

        {/* Split Navigation Buttons Row */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={16} color="#4B5563" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => navigation.navigate("MainOnboard3")}
            activeOpacity={0.88}
          >
            <Text style={styles.nextButtonText}>Next →</Text>
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
    justifyContent: "space-between",
  },
  headerRow: {
    height: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
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
  skipText: {
    fontSize: 15,
    fontWeight: "600",
    color: THEME.colors.primary,
  },
  stageArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  illustration: {
    width: "100%",
    maxWidth: 320,
    height: "100%",
    maxHeight: 280,
  },
  bottomSection: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 28,
    paddingTop: 8,
    alignItems: "center",
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
  dotsWrapper: {
    marginTop: 22,
    marginBottom: 24,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  backButtonText: {
    color: "#4B5563",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 6,
  },
  nextButton: {
    paddingHorizontal: 36,
    height: 50,
    borderRadius: 25,
    backgroundColor: THEME.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: THEME.colors.primary,
    shadowOpacity: 0.32,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 12,
    elevation: 6,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});