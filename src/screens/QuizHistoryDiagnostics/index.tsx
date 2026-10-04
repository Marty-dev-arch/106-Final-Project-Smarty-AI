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

// Removed hardcoded ATTEMPTS_DATA

export default function QuizHistoryDiagnostics() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { startMistakePractice, attempts, quizzes, mistakes } = useQuiz();

  const [segmentTab, setSegmentTab] = useState<"history" | "weakTopics">("history");
  const [filterType, setFilterType] = useState<"all" | "passed" | "needsReview">("all");

  const weakTopics = React.useMemo(() => {
    if (!mistakes || mistakes.length === 0) return [];
    const topicMap = new Map<string, { topic: string; category: string; count: number; sampleDesc: string; accPercent: number }>();
    for (const m of mistakes) {
      if (m.mastered) continue;
      const cat = m.category || m.quizTitle || "General";
      const existing = topicMap.get(cat) || {
        topic: cat,
        category: cat.toUpperCase(),
        count: 0,
        sampleDesc: m.question?.prompt ? `Missed: "${m.question.prompt.slice(0, 45)}..."` : "Concepts requiring review",
        accPercent: Math.max(35, Math.min(75, Math.round(100 - (mistakes.length * 8)))),
      };
      existing.count += 1;
      topicMap.set(cat, existing);
    }
    return Array.from(topicMap.values()).slice(0, 3);
  }, [mistakes]);

  const formattedAttempts: AttemptRecord[] = (attempts || []).map(att => {
    const min = Math.floor(att.timeSpentSeconds / 60);
    const sec = Math.round(att.timeSpentSeconds % 60);
    const missed = att.totalQuestions - att.score;
    const passed = att.percentage >= 80;
    
    return {
      id: att.id,
      category: "General",
      categoryPillBg: "#EEF2FF",
      categoryPillColor: "#4338CA",
      subCategory: "Review",
      title: att.quizTitle,
      timeString: att.date,
      duration: `${min}m ${sec}s`,
      scorePercent: att.percentage,
      scoreFraction: `${att.score} / ${att.totalQuestions} correct`,
      correctCount: att.score,
      missedCount: missed,
      isPassed: passed,
      xp: att.earnedXP,
      isMastered: att.percentage === 100,
      weakSpotAlert: missed > 0 ? { topic: "Review missed concepts", mistakeCount: missed } : undefined,
    };
  });

  const filteredAttempts = formattedAttempts.filter((item) => {
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
                History {attempts?.length || 0}
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
                Weak Topics {weakTopics.length}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Diagnostic Insight Gradient Hero Card: Render null if no weak spots detected */}
          {weakTopics.length > 0 ? (
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
                Based on your quiz history, {weakTopics.length} topic{weakTopics.length > 1 ? "s" : ""} show areas for improvement. Practice them now to improve your score.
              </Text>

              {/* Dynamic Weak Sub-Topics Mini Cards */}
              {weakTopics.map((wt, idx) => (
                <View key={idx} style={styles.miniTopicCard}>
                  <View style={styles.miniTopicTopRow}>
                    <Text style={styles.miniTopicCategory}>{wt.category}</Text>
                    <Text style={[styles.miniTopicAcc, { color: "#DC2626" }]}>
                      {wt.count} error{wt.count > 1 ? "s" : ""}
                    </Text>
                  </View>
                  <Text style={styles.miniTopicTitle}>{wt.topic}</Text>
                  <View style={styles.miniTopicDescRow}>
                    <Ionicons name="warning-outline" size={13} color="#EF4444" style={{ marginRight: 4 }} />
                    <Text style={styles.miniTopicDesc} numberOfLines={1}>
                      {wt.sampleDesc}
                    </Text>
                  </View>
                  <View style={styles.miniTopicBottomRow}>
                    <View style={styles.progressBarTrack}>
                      <View style={[styles.progressBarFill, { width: `${wt.accPercent}%`, backgroundColor: wt.accPercent < 50 ? "#DC2626" : "#F59E0B" }]} />
                    </View>
                    <TouchableOpacity onPress={handleLaunchDrill} activeOpacity={0.7}>
                      <Text style={styles.practiceTopicLink}>Practice Topic →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Launch Smart Drill CTA Button */}
              <TouchableOpacity
                style={styles.launchDrillButton}
                onPress={handleLaunchDrill}
                activeOpacity={0.88}
              >
                <Ionicons name="flash" size={15} color="#1E1B4B" style={{ marginRight: 6 }} />
                <Text style={styles.launchDrillButtonText}>
                  Launch Smart Drill ({mistakes?.length || 0} Weak Spots)
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          ) : null}

          {/* Recent Attempts Section */}
          <View style={styles.recentAttemptsHeader}>
            <Text style={styles.recentAttemptsTitle}>Recent Attempts</Text>
            <Text style={styles.recentAttemptsCount}>{attempts?.length || 0} completed</Text>
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
                      <Text style={styles.retryPillText}>Retry Missed ({item.missedCount})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.reviewPillButton}
                      onPress={() => navigation.navigate("QuizSummary", { attemptId: item.id })}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.reviewPillText}>Review</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.reviewAnswersLink}
                    onPress={() => navigation.navigate("QuizSummary", { attemptId: item.id })}
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

          {filteredAttempts.length === 0 && (
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 48, paddingHorizontal: 24 }}>
              <Ionicons name="documents-outline" size={48} color="#9CA3AF" style={{ marginBottom: 12 }} />
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 6 }}>
                No Quiz History Yet
              </Text>
              <Text style={{ fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 20 }}>
                Complete a quiz to track your diagnostic score analysis, mistakes, and weak spots.
              </Text>
            </View>
          )}
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