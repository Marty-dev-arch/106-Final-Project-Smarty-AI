import React, { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { RootStackParamList } from "../../types/navigation";
import { useAuth } from "../../context/AuthContext";
import { useQuiz } from "../../context/QuizContext";
import { useTheme } from "../../context/ThemeContext";
import TopBar from "../../components/common/TopBar";
import BottomNav from "../../components/common/BottomNav";
import TabSlideWrapper from "../../components/common/TabSlideWrapper";
import { PerformanceSkeleton } from "../../components/common/SkeletonLoader";
import { triggerHaptic } from "../../utils/haptics";
import THEME from "../../config/theme";

export default function Performance() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, refreshUser } = useAuth();
  const { quizzes, isLoading, refreshData } = useQuiz();
  const { colors, isDark } = useTheme();
  const [period, setPeriod] = useState<"month" | "quarter" | "all">("month");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerHaptic.light();
    try {
      await Promise.all([refreshData(), refreshUser()]);
    } catch (e) {
      console.warn("Performance refresh error:", e);
    } finally {
      setRefreshing(false);
    }
  }, [refreshData, refreshUser]);

  const avgScore = user?.avgScore ?? 0;
  const quizzesCount = user?.quizzesTaken ?? 0;
  const estimatedQuestions = quizzesCount * 10;
  const estimatedCorrect = Math.round((estimatedQuestions * avgScore) / 100);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar title="Performance" showLogo showActions />

      <TabSlideWrapper>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary, "#783CE8"]}
          />
        }
      >
        {isLoading ? (
          <PerformanceSkeleton />
        ) : (
          <>
            {/* Period Selector Tabs */}
            <View style={[styles.periodTabsContainer, { backgroundColor: isDark ? "#1E293B" : "#F3F4F6" }]}>
          {[
            { key: "month", label: "This Month" },
            { key: "quarter", label: "Quarter" },
            { key: "all", label: "All-Time" },
          ].map((item) => {
            const isSelected = period === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.periodTab,
                  isSelected && [styles.periodTabActive, { backgroundColor: colors.card }],
                ]}
                onPress={() => setPeriod(item.key as any)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.periodTabText,
                    { color: colors.textSecondary },
                    isSelected && [styles.periodTabTextActive, { color: colors.text }],
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Overall Score Section */}
        <View style={[styles.overallScoreCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.scoreHeaderRow}>
            <View style={styles.scoreTagRow}>
              <Ionicons name="sparkles" size={16} color="#4648D4" style={{ marginRight: 6 }} />
              <Text style={styles.scoreTagText}>OVERALL SCORE</Text>
            </View>
            <View style={styles.trendRow}>
              <Ionicons name="trending-up" size={16} color="#10B981" style={{ marginRight: 4 }} />
              <Text style={styles.trendText}>
                {avgScore >= 75 ? "↑ Excellent Mastery" : "↑ Improving Steadily"}
              </Text>
            </View>
          </View>

          <View style={styles.scoreValueRow}>
            <Text style={[styles.bigScoreText, { color: colors.text }]}>{avgScore}%</Text>
            <Text style={[styles.scoreDenominator, { color: colors.textMuted }]}> / 100</Text>
          </View>

          <Text style={[styles.scoreSummaryText, { color: colors.textSecondary }]}>
            {quizzesCount > 0
              ? `Calculated from ${quizzesCount} quizzes taken across all subject modules.`
              : "Take your first quiz to generate comprehensive mastery insights."}
          </Text>

          {/* Smooth Trend Wave Chart */}
          <View style={styles.chartWrapper}>
            <Svg width="100%" height={90} viewBox="0 0 340 90" fill="none">
              <Defs>
                <SvgGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#4648D4" stopOpacity={isDark ? 0.45 : 0.25} />
                  <Stop offset="1" stopColor="#4648D4" stopOpacity={0.0} />
                </SvgGradient>
              </Defs>
              {/* Area Fill */}
              <Path
                d="M 10 65 Q 60 55 100 60 T 180 50 T 260 45 T 320 25 L 320 90 L 10 90 Z"
                fill="url(#chartGradient)"
              />
              {/* Stroke Line */}
              <Path
                d="M 10 65 Q 60 55 100 60 T 180 50 T 260 45 T 320 25"
                stroke="#6366F1"
                strokeWidth={3}
                fill="none"
              />
              {/* Peak Point */}
              <Path
                d="M 320 25 m -4, 0 a 4,4 0 1,0 8,0 a 4,4 0 1,0 -8,0"
                fill="#6366F1"
              />
            </Svg>
          </View>

          {/* 3 Metrics Row */}
          <View style={[styles.metricsRow, { borderTopColor: colors.cardBorder }]}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricNumber, { color: colors.text }]}>{quizzesCount}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Quizzes</Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricNumber, { color: colors.text }]}>{estimatedQuestions}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Questions</Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.metricItem}>
              <Text style={styles.metricNumberGreen}>{estimatedCorrect}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Correct</Text>
            </View>
          </View>
        </View>

        {/* Subject Mastery Section */}
        <View style={styles.masteryHeaderRow}>
          <Text style={[styles.masteryTitle, { color: colors.text }]}>Subject mastery</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate("QuizHistoryDiagnostics")}
          >
            <Text style={styles.detailsText}>Details</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.masterySubtitle, { color: colors.textSecondary }]}>mastery index computed by Gemini AI</Text>

        {quizzes.length === 0 ? (
          <View style={[styles.emptyMasteryCard, { backgroundColor: isDark ? "#1E293B" : "#F8FAFC", borderColor: colors.cardBorder }]}>
            <Ionicons name="analytics-outline" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyMasteryTitle, { color: colors.text }]}>No Subject Data Yet</Text>
            <Text style={[styles.emptyMasterySubtitle, { color: colors.textSecondary }]}>
              Take or generate a quiz to start tracking your subject mastery scores.
            </Text>
          </View>
        ) : (
          quizzes.map((q) => {
            const scorePercent = q.bestScore ?? 0;
            const categoryName = q.category || q.title;
            
            let statusText = "Need Review";
            let statusColor = "#EF4444";
            let trackFillColor = "#EF4444";

            if (scorePercent >= 85) {
              statusText = "Excellent Mastery";
              statusColor = "#10B981";
              trackFillColor = "#10B981";
            } else if (scorePercent >= 70) {
              statusText = "Good Mastery";
              statusColor = isDark ? "#818CF8" : "#6D44F2";
              trackFillColor = isDark ? "#818CF8" : "#6D44F2";
            } else if (scorePercent >= 50) {
              statusText = "Consistent Progress";
              statusColor = "#F59E0B";
              trackFillColor = "#F59E0B";
            }

            return (
              <View key={q.id} style={[styles.subjectCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.subjectTopRow}>
                  <View style={[styles.subjectIconBox, { backgroundColor: isDark ? "#312E81" : "#EDE9FE" }]}>
                    <Ionicons name="book-outline" size={18} color={isDark ? "#818CF8" : THEME.colors.primary} />
                  </View>
                  <View style={styles.subjectInfoCol}>
                    <Text style={[styles.subjectName, { color: colors.text }]} numberOfLines={1}>{categoryName}</Text>
                    <Text style={[styles.subjectStatus, { color: statusColor }]}>{statusText}</Text>
                  </View>
                  <Text style={[styles.percentText, { color: statusColor }]}>{scorePercent}%</Text>
                </View>
                <View style={[styles.subjectTrack, { backgroundColor: isDark ? "#334155" : "#EDE9FE" }]}>
                  <View style={[styles.subjectFill, { width: `${Math.min(100, Math.max(5, scorePercent))}%`, backgroundColor: trackFillColor }]} />
                </View>
              </View>
            );
          })
        )}

        {/* AI Study Drill Card */}
        <View style={styles.drillWrapper}>
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            colors={["#4F46E5", "#6366F1", "#7C3AED"]}
            style={styles.drillCard}
          >
            <View style={styles.drillLeftCol}>
              <Text style={styles.drillTag}>AI STUDY DRILL</Text>
              <Text style={styles.drillTitle}>Boost Organic Chemistry</Text>
              <Text style={styles.drillSubtitle}>5 rapid conceptual questions ready</Text>
            </View>
            <TouchableOpacity
              style={styles.drillBtn}
              onPress={() => navigation.navigate("QuizTaking")}
              activeOpacity={0.85}
            >
              <Text style={styles.drillBtnText}>Start</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
        </>
        )}
      </ScrollView>
      </TabSlideWrapper>

      <BottomNav activeTab="Performance" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
  },
  periodTabsContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 9999,
    padding: 3,
    marginBottom: 20,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
  },
  periodTabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  periodTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  periodTabTextActive: {
    color: "#1B1931",
    fontWeight: "700",
  },
  overallScoreCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 2,
  },
  scoreHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  scoreTagRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  scoreTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4648D4",
    letterSpacing: 0.8,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  trendText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#10B981",
  },
  scoreValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 6,
  },
  bigScoreText: {
    fontSize: 42,
    fontWeight: "800",
    color: "#1B1931",
    letterSpacing: -1,
  },
  scoreDenominator: {
    fontSize: 18,
    fontWeight: "700",
    color: "#9CA3AF",
    marginLeft: 4,
  },
  scoreSummaryText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 10,
  },
  chartWrapper: {
    width: "100%",
    marginBottom: 14,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  metricItem: {
    alignItems: "center",
    flex: 1,
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1B1931",
  },
  metricNumberGreen: {
    fontSize: 18,
    fontWeight: "800",
    color: "#10B981",
  },
  metricLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E5E7EB",
  },
  masteryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  masteryTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1B1931",
  },
  detailsText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4648D4",
  },
  masterySubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 14,
  },
  subjectCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  subjectTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  subjectIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  subjectInfoCol: {
    flex: 1,
  },
  subjectName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1B1931",
    marginBottom: 2,
  },
  subjectStatusGreen: {
    fontSize: 12,
    fontWeight: "700",
    color: "#10B981",
  },
  subjectStatusBlue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4648D4",
  },
  subjectStatusOrange: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D97706",
  },
  subjectStatusRed: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EF4444",
  },
  percentGreen: {
    fontSize: 16,
    fontWeight: "800",
    color: "#10B981",
  },
  percentBlue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#4648D4",
  },
  percentOrange: {
    fontSize: 16,
    fontWeight: "800",
    color: "#D97706",
  },
  percentRed: {
    fontSize: 16,
    fontWeight: "800",
    color: "#EF4444",
  },
  percentText: {
    fontSize: 16,
    fontWeight: "800",
  },
  subjectStatus: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyMasteryCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyMasteryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  emptyMasterySubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
  subjectTrack: {
    width: "100%",
    height: 6,
    backgroundColor: "#EDE9FE",
    borderRadius: 3,
    overflow: "hidden",
  },
  subjectFill: {
    height: "100%",
    borderRadius: 3,
  },
  subjectFillGreen: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 3,
  },
  subjectFillBlue: {
    height: "100%",
    backgroundColor: "#4648D4",
    borderRadius: 3,
  },
  subjectFillOrange: {
    height: "100%",
    backgroundColor: "#F59E0B",
    borderRadius: 3,
  },
  subjectFillRed: {
    height: "100%",
    backgroundColor: "#EF4444",
    borderRadius: 3,
  },
  drillWrapper: {
    width: "100%",
    marginTop: 6,
    marginBottom: 14,
    borderRadius: 18,
    shadowColor: "#4F46E5",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 8,
  },
  drillCard: {
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  drillLeftCol: {
    flex: 1,
    marginRight: 10,
  },
  drillTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.8)",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  drillTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  drillSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.85)",
  },
  drillBtn: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  drillBtnText: {
    color: "#4648D4",
    fontSize: 14,
    fontWeight: "800",
  },
});