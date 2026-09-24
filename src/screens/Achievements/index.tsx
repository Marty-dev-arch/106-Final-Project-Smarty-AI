import React, { useState } from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../types/navigation";
import { useQuiz } from "../../context/QuizContext";
import BottomNav from "../../components/common/BottomNav";
import TopBar from "../../components/common/TopBar";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = Math.min((Math.min(SCREEN_WIDTH, 440) - 40 - 24) / 3, 110);

interface MedalItem {
  id: string;
  title: string;
  category: string;
  iconName: keyof typeof Ionicons.glyphMap;
  isUnlocked: boolean;
  earnedDate?: string;
  tier?: string;
  description?: string;
}

const MEDALS_DATA: MedalItem[] = [
  {
    id: "gold_scholar",
    title: "Gold Scholar",
    category: "General",
    iconName: "ribbon",
    isUnlocked: true,
    earnedDate: "Sep 12, 2026",
    tier: "GOLD TIER • LEVEL 5",
    description:
      "Awarded for scoring 90% or higher on 10 consecutive advanced quizzes across any subject without hints.",
  },
  {
    id: "master_mind",
    title: "Master Mind",
    category: "Knowledge",
    iconName: "bulb",
    isUnlocked: true,
    earnedDate: "Sep 10, 2026",
    tier: "GOLD TIER • LEVEL 4",
    description:
      "Awarded for completing 5 diagnostic smart drills with zero conceptual errors.",
  },
  {
    id: "pacesetter",
    title: "Pacesetter",
    category: "Speed",
    iconName: "flash",
    isUnlocked: true,
    earnedDate: "Sep 8, 2026",
    tier: "GOLD TIER • LEVEL 3",
    description:
      "Awarded for completing 15 quizzes within the fastest 25% speed percentile.",
  },
  {
    id: "iron_will",
    title: "Iron Will",
    category: "Endurance",
    iconName: "shield",
    isUnlocked: true,
    earnedDate: "Sep 5, 2026",
    tier: "GOLD TIER • LEVEL 4",
    description:
      "Awarded for maintaining a daily streak for 12 consecutive calendar days.",
  },
  {
    id: "grand_medal",
    title: "Grand Medal",
    category: "Mastery",
    iconName: "trophy",
    isUnlocked: true,
    earnedDate: "Aug 28, 2026",
    tier: "GOLD TIER • LEVEL 5",
    description:
      "Awarded for unlocking all foundation achievements and conquering 20 quizzes.",
  },
];

export default function Achievements() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { medals } = useQuiz();

  const [activeTab, setActiveTab] = useState<"Badges" | "Medals" | "Ribbons">("Medals");

  const handleOpenMedal = (medal: MedalItem) => {
    navigation.navigate("MedalDetails", {
      medalId: medal.id,
      medal: {
        id: medal.id,
        title: medal.title,
        subtitle: medal.tier || "GOLD TIER",
        description: medal.description || "",
        category: medal.category || "General",
        unlocked: medal.isUnlocked,
        iconUri: "",
        progress: 10,
        totalRequired: 10,
      },
    });
  };

  return (
    <View style={styles.container}>
      <TopBar title="Achievements" showLogo={true} showActions={true} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrapper}>
          {/* Top Hero Trophy Card */}
          <View style={styles.heroCard}>
            <LinearGradient
              colors={["#F59E0B", "#D97706", "#92400E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroTrophyCircle}
            >
              <Ionicons name="ribbon" size={28} color="#FFFFFF" />
            </LinearGradient>

            <View style={styles.heroTextCol}>
              <View style={styles.heroTagRow}>
                <Text style={styles.grandExplorerText}>GRAND EXPLORER</Text>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>LVI 4</Text>
                </View>
                <Text style={styles.trophyBlueLabel}>Trophy</Text>
              </View>
              <Text style={styles.heroTitle}>Master Collector</Text>
              <Text style={styles.heroSubtitle}>5 of 5 Medals unlocked</Text>
            </View>
          </View>

          {/* Capsule Switch Tabs */}
          <View style={styles.capsuleTabsContainer}>
            <TouchableOpacity
              style={[
                styles.capsuleTab,
                activeTab === "Badges" && styles.capsuleTabActive,
              ]}
              onPress={() => setActiveTab("Badges")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.capsuleTabText,
                  activeTab === "Badges" && styles.capsuleTabTextActive,
                ]}
              >
                Badges
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.capsuleTab,
                activeTab === "Medals" && styles.capsuleTabActive,
              ]}
              onPress={() => setActiveTab("Medals")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.capsuleTabText,
                  activeTab === "Medals" && styles.capsuleTabTextActive,
                ]}
              >
                Medals
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.capsuleTab,
                activeTab === "Ribbons" && styles.capsuleTabActive,
              ]}
              onPress={() => setActiveTab("Ribbons")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.capsuleTabText,
                  activeTab === "Ribbons" && styles.capsuleTabTextActive,
                ]}
              >
                Ribbons
              </Text>
            </TouchableOpacity>
          </View>

          {/* Medal Collection Progress Card */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressCardTitle}>Medal Collection Progress</Text>
              <View style={styles.progressValueGroup}>
                <Text style={styles.unlockedFractionText}>5/5 Unlocked</Text>
                <Text style={styles.progressPercentText}>100%</Text>
              </View>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: "100%" }]} />
            </View>
          </View>

          {/* Section: Unlocked (5 of 5) */}
          <View style={styles.unlockedHeaderRow}>
            <Text style={styles.unlockedSectionTitle}>Unlocked (5 of 5)</Text>
            <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7}>
              <Text style={styles.filterText}>Filter</Text>
              <Ionicons name="options-outline" size={14} color="#4338CA" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          {/* 3-Column Medals Grid */}
          <View style={styles.medalsGrid}>
            {MEDALS_DATA.map((medal) => (
              <TouchableOpacity
                key={medal.id}
                style={styles.medalGridItem}
                onPress={() => handleOpenMedal(medal)}
                activeOpacity={0.82}
              >
                {/* Golden Gradient Medal Circle */}
                <View style={styles.medalCircleWrapper}>
                  <LinearGradient
                    colors={["#E5A93C", "#C2831B", "#8C5810"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.goldMedalCircle}
                  >
                    <Ionicons name={medal.iconName} size={30} color="#FFFFFF" />
                  </LinearGradient>

                  {/* Checkmark Badge */}
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={9} color="#FFFFFF" />
                  </View>
                </View>

                {/* Title & Status */}
                <Text style={styles.medalItemTitle} numberOfLines={1}>
                  {medal.title}
                </Text>
                <Text style={styles.medalItemStatus}>Earned</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category Mastered Card */}
          <TouchableOpacity
            style={styles.categoryMasteredCard}
            onPress={() => navigation.navigate("QuizHistoryDiagnostics")}
            activeOpacity={0.8}
          >
            <View style={styles.masteredIconCircle}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#4338CA" />
            </View>
            <View style={styles.categoryMasteredTextCol}>
              <Text style={styles.categoryMasteredTitle}>Category Mastered</Text>
              <Text style={styles.categoryMasteredSubtitle}>
                Category Mastered — 5 of 5 Unlocked
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Persistent Bottom Navigation */}
      <BottomNav activeTab="Awards" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  bellButton: {
    padding: 6,
    marginRight: 10,
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3E3ECB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3E3ECB",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  contentWrapper: {
    paddingHorizontal: 20,
    maxWidth: 440,
    alignSelf: "center",
    width: "100%",
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F2F6",
    borderRadius: 18,
    padding: 16,
    marginTop: 6,
    marginBottom: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  heroTrophyCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    shadowColor: "#D97706",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  heroTextCol: {
    flex: 1,
  },
  heroTagRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  grandExplorerText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400E",
    letterSpacing: 0.5,
    marginRight: 6,
  },
  levelBadge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginRight: "auto",
  },
  levelText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#6D28D9",
  },
  trophyBlueLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4338CA",
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  heroSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  capsuleTabsContainer: {
    flexDirection: "row",
    backgroundColor: "#EDE9FE",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  capsuleTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
  },
  capsuleTabActive: {
    backgroundColor: "#4338CA",
  },
  capsuleTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  capsuleTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F2F6",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  progressHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressCardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  progressValueGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  unlockedFractionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4338CA",
    marginRight: 6,
  },
  progressPercentText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#4338CA",
    borderRadius: 3,
  },
  unlockedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  unlockedSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4338CA",
  },
  medalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 18,
  },
  medalGridItem: {
    width: CARD_WIDTH,
    alignItems: "center",
  },
  medalCircleWrapper: {
    position: "relative",
    marginBottom: 6,
  },
  goldMedalCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#C2831B",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 7,
    elevation: 3,
  },
  checkBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#5E3D0A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  medalItemTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 2,
  },
  medalItemStatus: {
    fontSize: 10,
    fontWeight: "800",
    color: "#B45309",
    textAlign: "center",
  },
  categoryMasteredCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F2F6",
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  masteredIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  categoryMasteredTextCol: {
    flex: 1,
  },
  categoryMasteredTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  categoryMasteredSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
});