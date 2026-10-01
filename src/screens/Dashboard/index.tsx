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
import { RootStackParamList } from "../../types/navigation";
import { useAuth } from "../../context/AuthContext";
import { useQuiz } from "../../context/QuizContext";
import { useTheme } from "../../context/ThemeContext";
import { Quiz } from "../../types/quiz";
import TopBar from "../../components/common/TopBar";
import BottomNav from "../../components/common/BottomNav";
import BlinkingMascot from "../../components/common/BlinkingMascot";
import TypewriterText from "../../components/common/TypewriterText";
import TabSlideWrapper from "../../components/common/TabSlideWrapper";
import { DashboardSkeleton } from "../../components/common/SkeletonLoader";
import { triggerHaptic } from "../../utils/haptics";
import { evaluateStreak, getLocalDateString } from "../../utils/streakHelper";
import THEME from "../../config/theme";

export default function Dashboard() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, refreshUser } = useAuth();
  const { quizzes, startQuiz, isLoading, refreshData } = useQuiz();
  const { colors, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const streakInfo = evaluateStreak(user?.streak, user?.lastActiveDate, user?.longestStreak);
  const isStreakActiveToday = streakInfo.isActiveToday;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerHaptic.light();
    try {
      await Promise.all([refreshData(), refreshUser()]);
    } catch (e) {
      console.warn("Refresh error:", e);
    } finally {
      setRefreshing(false);
    }
  }, [refreshData, refreshUser]);

  const featuredQuiz = quizzes[0];

  const handleStartStudy = (q?: Quiz) => {
    triggerHaptic.medium();
    const targetQuiz = q || featuredQuiz;
    if (targetQuiz) {
      startQuiz(targetQuiz);
      navigation.navigate("QuizTaking", { quizId: targetQuiz.id });
    } else {
      navigation.navigate("UploadQuiz");
    }
  };

  const quizzesTaken = (user?.quizzesTaken ?? 0) === 0 || quizzes.length === 0 ? 0 : user?.quizzesTaken ?? 0;
  const avgScore = quizzesTaken === 0 ? 0 : user?.avgScore ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar title="Home" showLogo={true} showActions={true} />

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
          <DashboardSkeleton />
        ) : (
          <>
            {/* Greeting Header */}
            <Text style={[styles.greetingText, { color: colors.text }]}>
              Good Morning, {user?.displayName?.split(" ")[0] || "Marty"}!
            </Text>

            {/* Companion Speech Bubble Card with Animated Blinking Mascot & Typing Text */}
            <View style={styles.companionCard}>
              <BlinkingMascot size={86} style={styles.mascotAvatar} />
              <View style={styles.speechBubbleWrapper}>
                <View style={[styles.speechPointer, isDark && { borderRightColor: colors.card }]} />
                <View style={[styles.speechBubble, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <Text style={styles.speechTag}>SMARTY</Text>
                  <TypewriterText
                    text={"heyhey, how can i help you?\nupload any pptx, pdf, docs\nto start generate for you!"}
                    style={[styles.speechMessage, { color: colors.textSecondary }]}
                    speed={30}
                  />
                </View>
              </View>
            </View>

            {/* Primary Action Banner */}
        <TouchableOpacity
          onPress={() => {
            triggerHaptic.light();
            navigation.navigate("UploadQuiz");
          }}
          activeOpacity={0.9}
          style={styles.uploadBannerWrapper}
        >
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            colors={["#3D35D1", "#5844E8", "#783CE8"]}
            style={styles.uploadBanner}
          >
            <View style={styles.uploadLeft}>
              <Ionicons
                name="cloud-upload-outline"
                size={30}
                color="#FFFFFF"
                style={styles.cloudIcon}
              />
              <View style={styles.uploadTextGroup}>
                <Text style={styles.uploadTitle}>Upload a document</Text>
                <Text style={styles.uploadSubtitle}>
                  Turn a PDF or slide deck into a quiz
                </Text>
              </View>
            </View>
            <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* 3 Real Metrics Row */}
        <View style={[styles.metricsRow, { backgroundColor: isDark ? colors.card : "transparent", borderRadius: 16, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
          <TouchableOpacity
            style={styles.metricItem}
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic.selection();
              navigation.navigate("MyQuizzes");
            }}
          >
            <Text style={[styles.metricNumber, { color: colors.text }]}>{quizzesTaken}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>QUIZZES</Text>
          </TouchableOpacity>

          <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.metricItem}
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic.selection();
              navigation.navigate("Performance");
            }}
          >
            <Text style={[styles.metricNumber, { color: colors.text }]}>{avgScore}%</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>AVG. SCORE</Text>
          </TouchableOpacity>

          <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.metricItem}
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic.selection();
              navigation.navigate("Achievements");
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
              <Text style={[styles.metricNumber, { color: isStreakActiveToday ? "#FF7A00" : colors.text }]}>
                {streakInfo.currentStreak}
              </Text>
              <Text style={{ fontSize: 16, marginLeft: 2 }}>{isStreakActiveToday ? "🔥" : "⚡"}</Text>
            </View>
            <Text style={[styles.metricLabel, { color: isStreakActiveToday ? "#FF7A00" : colors.textSecondary }]}>
              {isStreakActiveToday ? "STREAK ON" : "DAY STREAK"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent Achievements */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent achievements</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Achievements")}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.achievementsScroll}
        >
          <TouchableOpacity
            style={[styles.achievementChip, { backgroundColor: isDark ? colors.card : "#F4F1FE", borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Achievements")}
          >
            <Text style={[styles.achievementName, { color: colors.text }]}>Week Streak</Text>
            <Text style={[styles.achievementDesc, { color: colors.textSecondary }]}>
              {user?.streak ? `${user.streak} days active` : "Start your streak"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.achievementChip, { backgroundColor: isDark ? colors.card : "#F4F1FE", borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Achievements")}
          >
            <Text style={[styles.achievementName, { color: colors.text }]}>Average Score</Text>
            <Text style={[styles.achievementDesc, { color: colors.textSecondary }]}>
              {user?.avgScore ? `${user.avgScore}% overall` : "No scores yet"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.achievementChip, { backgroundColor: isDark ? colors.card : "#F4F1FE", borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Achievements")}
          >
            <Text style={[styles.achievementName, { color: colors.text }]}>Knowledge Rank</Text>
            <Text style={[styles.achievementDesc, { color: colors.textSecondary }]}>{user?.tier || "Novice Scholar"}</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Available Quiz to Take (Real Data) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {featuredQuiz ? "Available quiz" : "Start studying"}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate("MyQuizzes")}>
            <Text style={styles.seeAllText}>All ({quizzes.length})</Text>
          </TouchableOpacity>
        </View>

        {featuredQuiz ? (
          <TouchableOpacity
            style={[styles.studyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => handleStartStudy(featuredQuiz)}
            activeOpacity={0.88}
          >
            <View style={styles.studyCardRow}>
              <View style={[styles.studyIconBox, isDark && { backgroundColor: "#1E1B4B" }]}>
                <Ionicons name="book-outline" size={22} color={THEME.colors.primary} />
              </View>
              <View style={styles.studyInfoCol}>
                <Text style={[styles.studyMetaText, { color: colors.textSecondary }]}>
                  {(featuredQuiz.category || "BIOLOGY").toUpperCase()} • {featuredQuiz.questions?.length || 4} QUESTIONS
                </Text>
                <Text style={[styles.studyTitleText, { color: colors.text }]} numberOfLines={1}>
                  {featuredQuiz.title}
                </Text>
                {/* Real Progress / Score Bar */}
                <View style={[styles.progressBarTrack, isDark && { backgroundColor: "#1E293B" }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: featuredQuiz.bestScore ? `${Math.min(100, featuredQuiz.bestScore)}%` : "100%" },
                    ]}
                  />
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.studyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => navigation.navigate("UploadQuiz")}
            activeOpacity={0.88}
          >
            <View style={styles.studyCardRow}>
              <View style={[styles.studyIconBox, isDark && { backgroundColor: "#1E1B4B" }]}>
                <Ionicons name="add-circle-outline" size={24} color={THEME.colors.primary} />
              </View>
              <View style={styles.studyInfoCol}>
                <Text style={[styles.studyMetaText, { color: colors.textSecondary }]}>GET STARTED</Text>
                <Text style={[styles.studyTitleText, { color: colors.text }]}>Create your first quiz now</Text>
                <Text style={[styles.studyMetaText, { color: colors.textSecondary }]}>Upload a file or choose any topic</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        )}

        {/* Daily Smart Tip Card */}
        <TouchableOpacity
          style={[styles.tipCard, { backgroundColor: isDark ? "#1E1B4B" : "#F6F3FE", borderColor: isDark ? "#312E81" : "#EBE5FE" }]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("UploadQuiz")}
        >
          <View style={[styles.tipIconBox, isDark && { backgroundColor: "#2E1065" }]}>
            <Ionicons name="bulb-outline" size={22} color={THEME.colors.primary} />
          </View>
          <View style={styles.tipTextCol}>
            <Text style={styles.tipTag}>DAILY SMART TIP</Text>
            <Text style={[styles.tipBody, { color: isDark ? "#C7D2FE" : "#4B5563" }]}>
              Quizzes generated directly from lecture notes boost memory retention by up to 34%. Tap to upload!
            </Text>
          </View>
        </TouchableOpacity>
        </>
        )}
      </ScrollView>
      </TabSlideWrapper>

      <BottomNav activeTab="Home" />
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
    paddingTop: 14,
    paddingBottom: 24,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1B1931",
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  companionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  mascotAvatar: {
    width: 86,
    height: 90,
    marginRight: 8,
  },
  speechBubbleWrapper: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
  },
  speechPointer: {
    position: "absolute",
    left: -7,
    top: "38%",
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderTopColor: "transparent",
    borderBottomWidth: 7,
    borderBottomColor: "transparent",
    borderRightWidth: 8,
    borderRightColor: "#FFFFFF",
    zIndex: 3,
  },
  speechBubble: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 3,
  },
  speechTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FB7185",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  speechMessage: {
    fontSize: 12.5,
    color: "#374151",
    lineHeight: 17,
    fontWeight: "500",
  },
  uploadBannerWrapper: {
    width: "100%",
    marginBottom: 24,
    borderRadius: 20,
    shadowColor: "#3D35D1",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 8,
  },
  uploadBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  uploadLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cloudIcon: {
    marginRight: 14,
  },
  uploadTextGroup: {
    flex: 1,
  },
  uploadTitle: {
    fontSize: 17.5,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  uploadSubtitle: {
    fontSize: 12.5,
    color: "rgba(255, 255, 255, 0.85)",
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 4,
    marginBottom: 26,
  },
  metricItem: {
    alignItems: "center",
    flex: 1,
  },
  metricNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1B1931",
    marginBottom: 3,
  },
  metricLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.5,
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E5E7EB",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1B1931",
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.colors.primary,
  },
  inProgressBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  achievementsScroll: {
    paddingBottom: 4,
    marginBottom: 20,
  },
  achievementChip: {
    backgroundColor: "#F4F1FE",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 10,
  },
  achievementName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1B1931",
    marginBottom: 2,
  },
  achievementDesc: {
    fontSize: 12,
    color: "#6B7280",
  },
  studyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  studyCardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  studyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  studyInfoCol: {
    flex: 1,
    marginRight: 8,
  },
  studyMetaText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  studyTitleText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1B1931",
    marginBottom: 8,
  },
  progressBarTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EDE9FE",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: THEME.colors.primary,
    borderRadius: 3,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F6F3FE",
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EBE5FE",
  },
  tipIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  tipTextCol: {
    flex: 1,
  },
  tipTag: {
    fontSize: 11,
    fontWeight: "800",
    color: THEME.colors.primary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  tipBody: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
    fontWeight: "500",
  },
});