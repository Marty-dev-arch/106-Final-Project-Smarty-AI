import React, { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../types/navigation";
import { useQuiz } from "../../context/QuizContext";
import TopBar from "../../components/common/TopBar";
import BottomNav from "../../components/common/BottomNav";

interface AttemptRecord {
  id: string;
  category: string;
  categoryPillBg: string;
  categoryPillColor: string;
  subCategory: string;
  title: string;
  timeString: string;
  duration: string;
  scorePercent: number;
  scoreFraction: string;
  correctCount: number;
  missedCount: number;
  isPassed: boolean;
  xp?: number;
  isMastered?: boolean;
  weakSpotAlert?: {
    topic: string;
    mistakeCount: number;
  };
  medalBanner?: string;
}

const ATTEMPTS_DATA: AttemptRecord[] = [
  {
    id: "att_1",
    category: "Biology",
    categoryPillBg: "#EEF2FF",
    categoryPillColor: "#4338CA",
    subCategory: "Cell Biology Ch. 4",
    title: "Membrane Structure & Transport",
    timeString: "Today, 2:15 PM",
    duration: "6m 42s",
    scorePercent: 87,
    scoreFraction: "13 / 15 correct",
    correctCount: 13,
    missedCount: 2,
    isPassed: true,
    xp: 120,
    isMastered: true,
  },
  {
    id: "att_2",
    category: "Chemistry",
    categoryPillBg: "#FEE2E2",
    categoryPillColor: "#DC2626",
    subCategory: "Organic Chem • Ch. 8",
    title: "Reaction Mechanisms II",
    timeString: "Yesterday, 4:30 PM",
    duration: "9m 10s",
    scorePercent: 58,
    scoreFraction: "7 / 12 correct",
    correctCount: 7,
    missedCount: 5,
    isPassed: false,
    weakSpotAlert: {
      topic: "Weak Spot: Nucleophilic Attack",
      mistakeCount: 5,
    },
  },
  {
    id: "att_3",
    category: "History",
    categoryPillBg: "#FEF3C7",
    categoryPillColor: "#92400E",
    subCategory: "Modern Era",
    title: "World War II Causes & Alliances",
    timeString: "Sep 12, 10:00 AM",
    duration: "8m 05s",
    scorePercent: 73,
    scoreFraction: "11 / 15 correct",
    correctCount: 11,
    missedCount: 4,
    isPassed: false,
  },
  {
    id: "att_4",
    category: "Language",
    categoryPillBg: "#EDE9FE",
    categoryPillColor: "#6D28D9",
    subCategory: "Bisaya Vocabulary",
    title: "Daily Phrases & Greetings Unit 1",
    timeString: "Sep 10, 8:20 PM",
    duration: "4m 18s",
    scorePercent: 100,
    scoreFraction: "10 / 10 perfect",
    correctCount: 10,
    missedCount: 0,
    isPassed: true,
    medalBanner: "Perfect Score Medal Earned • Streak Maintained",
  },
];

export default function QuizHistoryDiagnostics() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { startMistakePractice } = useQuiz();

  const [segmentTab, setSegmentTab] = useState<"history" | "weakTopics">("history");
  const [filterType, setFilterType] = useState<"all" | "passed" | "needsReview">("all");

  const filteredAttempts = ATTEMPTS_DATA.filter((item) => {
    if (filterType === "passed") return item.scorePercent >= 80;
    if (filterType === "needsReview") return item.scorePercent < 80;
    return true;
  });

  const handleLaunchDrill = () => {
    startMistakePractice();
    navigation.navigate("QuizTaking", { isMistakePractice: true });
  };

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.container}>
      <TopBar
        title="Quiz Summary Review"
        showBack
        showLogo={false}
        showBell={false}
        showActions
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrapper}>
          {/* Segmented Switch */}
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                segmentTab === "history" && styles.segmentButtonActive,
              ]}
              onPress={() => setSegmentTab("history")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  segmentTab === "history" && styles.segmentTextActive,
                ]}
              >
                History 24
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentButton,
                segmentTab === "weakTopics" && styles.segmentButtonActive,
              ]}
              onPress={() => setSegmentTab("weakTopics")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  segmentTab === "weakTopics" && styles.segmentTextActive,
                ]}
              >
                Weak Topics 3
              </Text>
            </TouchableOpacity>
          </View>

          {/* Diagnostic Insight Gradient Hero Card */}
          <LinearGradient
            colors={["#4F46E5", "#6366F1", "#5A30D0"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            {/* Top row */}
            <View style={styles.heroTopRow}>
              <View style={styles.heroLeftBadgeGroup}>
                <View style={styles.mascotSquareBadge}>
                  <Image
                    source={require("../../../assets/illustrations/smarty_logo.png")}
                    style={styles.mascotMini}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.diagnosticTag}>DIAGNOSTIC INSIGHT</Text>
              </View>

              <View style={styles.needsFocusBadge}>
                <Ionicons name="trending-down" size={12} color="#92400E" style={{ marginRight: 3 }} />
                <Text style={styles.needsFocusText}>Needs Focus</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>AI Weak Spot Detect</Text>
            <Text style={styles.heroSubtitle}>
              on your last 10 quizzes, 3 low sub-topics show persistent confusion. Tackle them now to maintain your score Activity.
            </Text>

            {/* 3 Weak Sub-Topics Mini Cards */}
            <View style={styles.miniTopicCard}>
              <View style={styles.miniTopicTopRow}>
                <Text style={styles.miniTopicCategory}>ORGANIC CHEMISTRY</Text>
                <Text style={[styles.miniTopicAcc, { color: "#DC2626" }]}>
                  42% Check 8 err
                </Text>
              </View>
              <Text style={styles.miniTopicTitle}>Reaction Mechanisms</Text>
              <View style={styles.miniTopicDescRow}>
                <Ionicons name="warning-outline" size={13} color="#EF4444" style={{ marginRight: 4 }} />
                <Text style={styles.miniTopicDesc}>
                  Struggling with SN1 vs SN2 transition states
                </Text>
              </View>
              <View style={styles.miniTopicBottomRow}>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: "42%", backgroundColor: "#DC2626" }]} />
                </View>
                <TouchableOpacity onPress={handleLaunchDrill} activeOpacity={0.7}>
                  <Text style={styles.practiceTopicLink}>Practice Topic →</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.miniTopicCard}>
              <View style={styles.miniTopicTopRow}>
                <Text style={styles.miniTopicCategory}>BIOLOGY</Text>
                <Text style={[styles.miniTopicAcc, { color: "#D97706" }]}>
                  54% Acc • 5 err
                </Text>
              </View>
              <Text style={styles.miniTopicTitle}>Cell Membrane Permea</Text>
              <View style={styles.miniTopicDescRow}>
                <Ionicons name="ellipse-outline" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
                <Text style={styles.miniTopicDesc}>
                  Active transport vs facilitated diffusion confusi...
                </Text>
              </View>
              <View style={styles.miniTopicBottomRow}>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: "54%", backgroundColor: "#F59E0B" }]} />
                </View>
                <TouchableOpacity onPress={handleLaunchDrill} activeOpacity={0.7}>
                  <Text style={styles.practiceTopicLink}>Practice Topic →</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.miniTopicCard}>
              <View style={styles.miniTopicTopRow}>
                <Text style={styles.miniTopicCategory}>WORLD HISTORY</Text>
                <Text style={[styles.miniTopicAcc, { color: "#D97706" }]}>
                  60% Acc • 4 err
                </Text>
              </View>
              <Text style={styles.miniTopicTitle}>WWII Pacific Theatre</Text>
              <View style={styles.miniTopicDescRow}>
                <Ionicons name="globe-outline" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
                <Text style={styles.miniTopicDesc}>
                  Battle timeline sequence & Island Hopping stra
                </Text>
              </View>
              <View style={styles.miniTopicBottomRow}>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: "60%", backgroundColor: "#FBBF24" }]} />
                </View>
                <TouchableOpacity onPress={handleLaunchDrill} activeOpacity={0.7}>
                  <Text style={styles.practiceTopicLink}>Practice Topic →</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Launch Smart Drill CTA Button */}
            <TouchableOpacity
              style={styles.launchDrillButton}
              onPress={handleLaunchDrill}
              activeOpacity={0.88}
            >
              <Ionicons name="flash" size={15} color="#1E1B4B" style={{ marginRight: 6 }} />
              <Text style={styles.launchDrillButtonText}>
                Launch Smart Drill (All Weak Spots)
              </Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Recent Attempts Section */}
          <View style={styles.recentAttemptsHeader}>
            <Text style={styles.recentAttemptsTitle}>Recent Attempts</Text>
            <Text style={styles.recentAttemptsCount}>24 completed</Text>
          </View>

          {/* Filter Chips */}
          <View style={styles.filterChipsRow}>
            <TouchableOpacity
              style={[
                styles.attemptFilterChip,
                filterType === "all" && styles.attemptFilterChipActive,
              ]}
              onPress={() => setFilterType("all")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.attemptFilterText,
                  filterType === "all" && styles.attemptFilterTextActive,
                ]}
              >
                All Quizzes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.attemptFilterChip,
                filterType === "passed" && styles.attemptFilterChipActive,
              ]}
              onPress={() => setFilterType("passed")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.attemptFilterText,
                  filterType === "passed" && styles.attemptFilterTextActive,
                ]}
              >
                Passed (≥80%)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.attemptFilterChip,
                filterType === "needsReview" && styles.attemptFilterChipActive,
              ]}
              onPress={() => setFilterType("needsReview")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.attemptFilterText,
                  filterType === "needsReview" && styles.attemptFilterTextActive,
                ]}
              >
                Needs Review (&lt;80%)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Attempt Cards List */}
          {filteredAttempts.map((item) => (
            <View key={item.id} style={styles.attemptCard}>
              {/* Top row */}
              <View style={styles.attemptCardTopRow}>
                <View style={styles.attemptTagsLeft}>
                  <View style={[styles.attemptCategoryPill, { backgroundColor: item.categoryPillBg }]}>
                    <Text style={[styles.attemptCategoryPillText, { color: item.categoryPillColor }]}>
                      {item.category}
                    </Text>
                  </View>
                  <Text style={styles.attemptSubCategory}>{item.subCategory}</Text>
                </View>

                <View style={styles.attemptScoreCol}>
                  <Text
                    style={[
                      styles.attemptScorePercent,
                      { color: item.scorePercent >= 80 ? "#4338CA" : item.scorePercent >= 70 ? "#111827" : "#DC2626" },
                    ]}
                  >
                    {item.scorePercent}%
                  </Text>
                  <Text style={styles.attemptScoreFraction}>{item.scoreFraction}</Text>
                </View>
              </View>

              {/* Title */}
              <Text style={styles.attemptTitle}>{item.title}</Text>

              {/* Time info row */}
              <View style={styles.timeInfoRow}>
                <Ionicons name="time-outline" size={13} color="#6B7280" style={{ marginRight: 4 }} />
                <Text style={styles.timeInfoText}>{item.timeString}</Text>
                <Text style={styles.timeInfoDot}>•</Text>
                <Ionicons name="timer-outline" size={13} color="#6B7280" style={{ marginRight: 4 }} />
                <Text style={styles.timeInfoText}>{item.duration}</Text>
              </View>

              {/* Badges row if any */}
              {item.xp && (
                <View style={styles.badgesRow}>
                  <View style={styles.xpBadge}>
                    <Ionicons name="sparkles" size={11} color="#4338CA" style={{ marginRight: 3 }} />
                    <Text style={styles.xpBadgeText}>+{item.xp} XP</Text>
                  </View>
                  {item.isMastered && (
                    <View style={styles.masteredBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#111827" style={{ marginRight: 3 }} />
                      <Text style={styles.masteredBadgeText}>Mastered</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Diagnostic Weak Spot Alert Box */}
              {item.weakSpotAlert && (
                <View style={styles.weakSpotAlertBox}>
                  <View style={styles.weakSpotLeft}>
                    <Ionicons name="bulb-outline" size={13} color="#4338CA" style={{ marginRight: 4 }} />
                    <Text style={styles.weakSpotText}>{item.weakSpotAlert.topic}</Text>
                  </View>
                  <Text style={styles.weakSpotRedText}>
                    +{item.weakSpotAlert.mistakeCount} to Mistake Bank
                  </Text>
                </View>
              )}

              {/* Medal Banner if any */}
              {item.medalBanner && (
                <View style={styles.medalBannerBox}>
                  <Ionicons name="ribbon-outline" size={14} color="#92400E" style={{ marginRight: 6 }} />
                  <Text style={styles.medalBannerText}>{item.medalBanner}</Text>
                </View>
              )}

              {/* Card Footer Actions */}
              <View style={styles.attemptFooterRow}>
                <View style={styles.attemptFooterStats}>
                  <View style={styles.statChip}>
                    <Ionicons name="checkmark-circle-outline" size={13} color="#10B981" style={{ marginRight: 3 }} />
                    <Text style={styles.correctStatText}>{item.correctCount} Correct</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Ionicons name="close-circle-outline" size={13} color="#DC2626" style={{ marginRight: 3 }} />
                    <Text style={styles.missedStatText}>{item.missedCount} Missed</Text>
                  </View>
                </View>

                {item.weakSpotAlert ? (
                  <View style={styles.multiActionGroup}>
                    <TouchableOpacity
                      style={styles.retryPillButton}
                      onPress={handleLaunchDrill}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="refresh" size={11} color="#DC2626" style={{ marginRight: 4 }} />
                      <Text style={styles.retryPillText}>Retry Missed (5)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.reviewPillButton}
                      onPress={() => navigation.navigate("QuizSummary")}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.reviewPillText}>Review</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.reviewAnswersLink}
                    onPress={() => navigation.navigate("QuizSummary")}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.reviewAnswersLinkText}>
                      {item.scorePercent === 100 ? "Summary >" : "Review Answers >"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Persistent Bottom Nav */}
      <BottomNav activeTab="Quizzes" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    padding: 3,
    marginTop: 14,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 9,
  },
  segmentButtonActive: {
    backgroundColor: "#4338CA",
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4338CA",
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },
  heroBanner: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#4338CA",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  heroLeftBadgeGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  mascotSquareBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  mascotMini: {
    width: 18,
    height: 18,
  },
  diagnosticTag: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFFCC",
    letterSpacing: 0.8,
  },
  needsFocusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  needsFocusText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400E",
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 4,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: "#FFFFFFDD",
    marginBottom: 14,
  },
  miniTopicCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  miniTopicTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  miniTopicCategory: {
    fontSize: 9,
    fontWeight: "800",
    color: "#4338CA",
    letterSpacing: 0.4,
  },
  miniTopicAcc: {
    fontSize: 10,
    fontWeight: "700",
  },
  miniTopicTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  miniTopicDescRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  miniTopicDesc: {
    fontSize: 10,
    color: "#6B7280",
    flex: 1,
  },
  miniTopicBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressBarTrack: {
    width: "60%",
    height: 5,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 5,
    borderRadius: 3,
  },
  practiceTopicLink: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4338CA",
  },
  launchDrillButton: {
    backgroundColor: "#FBBF24",
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  launchDrillButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  recentAttemptsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  recentAttemptsTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  recentAttemptsCount: {
    fontSize: 11,
    color: "#6B7280",
  },
  filterChipsRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  attemptFilterChip: {
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
  },
  attemptFilterChipActive: {
    backgroundColor: "#4338CA",
  },
  attemptFilterText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
  },
  attemptFilterTextActive: {
    color: "#FFFFFF",
  },
  attemptCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F2F6",
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 1,
  },
  attemptCardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  attemptTagsLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  attemptCategoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
  },
  attemptCategoryPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  attemptSubCategory: {
    fontSize: 11,
    color: "#6B7280",
  },
  attemptScoreCol: {
    alignItems: "flex-end",
  },
  attemptScorePercent: {
    fontSize: 18,
    fontWeight: "800",
  },
  attemptScoreFraction: {
    fontSize: 9,
    color: "#6B7280",
  },
  attemptTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  timeInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  timeInfoText: {
    fontSize: 11,
    color: "#6B7280",
  },
  timeInfoDot: {
    marginHorizontal: 6,
    color: "#9CA3AF",
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  xpBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4338CA",
  },
  masteredBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  masteredBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
  },
  weakSpotAlertBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F5F3FF",
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  weakSpotLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  weakSpotText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4338CA",
  },
  weakSpotRedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#DC2626",
  },
  medalBannerBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  medalBannerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
  },
  attemptFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  attemptFooterStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  correctStatText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#10B981",
  },
  missedStatText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#DC2626",
  },
  multiActionGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  retryPillButton: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 6,
  },
  retryPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#DC2626",
  },
  reviewPillButton: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  reviewPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#4338CA",
  },
  reviewAnswersLink: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  reviewAnswersLinkText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4338CA",
  },
});