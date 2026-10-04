import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  ScrollView,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../types/navigation";
import { useQuiz } from "../../context/QuizContext";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import TopBar from "../../components/common/TopBar";
import ExportModal from "../../components/common/ExportModal";
import SmartyMascot from "../../components/common/SmartyMascot";
import ConfettiCannon from "../../components/common/ConfettiCannon";
import XPCounterRollup from "../../components/common/XPCounterRollup";
import { triggerHaptic } from "../../utils/haptics";
import { playSound } from "../../utils/soundEffects";
import THEME from "../../config/theme";

export default function Results() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { latestAttempt, activeQuiz } = useQuiz();
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAchievementPopup, setShowAchievementPopup] = useState(false);

  const attempt = latestAttempt || {
    id: "att_1",
    quizId: "quiz_cell_biology",
    quizTitle: activeQuiz?.title || "Cell Biology: Structure & Function",
    score: 13,
    totalQuestions: 15,
    percentage: 87,
    timeSpentSeconds: 402, // 6:42
    earnedXP: 250,
    answers: [],
    date: "Today",
  };

  const incorrectCount = attempt.totalQuestions - attempt.score;
  const minutes = Math.floor(attempt.timeSpentSeconds / 60);
  const seconds = attempt.timeSpentSeconds % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

  const isCelebration = attempt.percentage >= 80;

  const achievementEarned = useMemo(() => {
    if (attempt.percentage >= 90) {
      return {
        type: "Ribbon",
        title: "Gold Scholar Ribbon",
        badgeIcon: "ribbon" as const,
        colors: ["#F59E0B", "#D97706", "#B45309"],
        tier: "GOLD TIER • LEVEL 5",
        description: `Scored ${attempt.percentage}% on this quiz! Outstanding precision and subject mastery.`,
        rewardXP: attempt.earnedXP || 250,
      };
    } else if (attempt.percentage >= 80) {
      return {
        type: "Badge",
        title: "Precision Master Badge",
        badgeIcon: "shield-checkmark" as const,
        colors: ["#6366F1", "#4F46E5", "#4338CA"],
        tier: "SILVER TIER • LEVEL 3",
        description: `Scored ${attempt.percentage}% on this quiz! Excellent conceptual understanding.`,
        rewardXP: attempt.earnedXP || 200,
      };
    } else if (attempt.percentage >= 60) {
      return {
        type: "Medal",
        title: "Smarty Explorer Medal",
        badgeIcon: "medal" as const,
        colors: ["#10B981", "#059669", "#047857"],
        tier: "BRONZE TIER • LEVEL 1",
        description: `Successfully conquered this quiz with a ${attempt.percentage}% completion score!`,
        rewardXP: attempt.earnedXP || 150,
      };
    }
    return null;
  }, [attempt.percentage, attempt.earnedXP]);

  useEffect(() => {
    if (isCelebration) {
      triggerHaptic.success();
    } else {
      triggerHaptic.medium();
    }

    if (achievementEarned) {
      sendNotification({
        title: `${achievementEarned.title} Unlocked! 🏆`,
        message: achievementEarned.description,
        type: "achievement",
        actionScreen: "Achievements",
      }).catch(() => {});

      const timer = setTimeout(() => {
        setShowAchievementPopup(true);
        if (user?.hapticFeedback !== false) {
          triggerHaptic.success();
          playSound.reward(true);
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isCelebration, achievementEarned, user?.hapticFeedback]);

  return (
    <View style={styles.container}>
      {/* Full-screen Confetti celebration on high score */}
      {isCelebration && <ConfettiCannon count={50} active={true} />}

      <TopBar
        title="Quiz Summary Review"
        showBack
        onBack={() => navigation.navigate("MyQuizzes")}
        showLogo={false}
        showActions
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Meta Row */}
        <View style={styles.statusRow}>
          <View style={styles.evalBadge}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#4648D4" style={{ marginRight: 6 }} />
            <Text style={styles.evalText}>EVALUATION COMPLETE</Text>
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => navigation.navigate("MyQuizzes")}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color="#1B1931" />
          </TouchableOpacity>
        </View>

        {/* Mascot Mood Presentation */}
        <View style={{ alignItems: "center", marginVertical: 6 }}>
          <SmartyMascot
            size={96}
            mood={isCelebration ? "celebrating" : "encouraging"}
            interactive={true}
          />
        </View>

        {/* Animated Rolling XP Counter */}
        <XPCounterRollup targetXP={attempt.earnedXP || 250} />

        {/* Score Circle Gauge */}
        <View style={styles.gaugeContainer}>
          <View style={styles.gaugeOuterRing}>
            <View style={styles.gaugeInnerCircle}>
              <View style={styles.scoreNumberRow}>
                <Text style={styles.scoreVal}>{attempt.percentage}</Text>
                <Text style={styles.scorePercentSign}>%</Text>
              </View>
              <Text style={styles.scoreLabel}>SCORE</Text>
            </View>
          </View>
        </View>

        {/* Great work greeting */}
        <Text style={styles.greetingTitle}>
          Great work, {user?.displayName?.split(" ")[0] || "Marty"}!
        </Text>

        <View style={styles.topicRow}>
          <Ionicons name="flask-outline" size={16} color="#4648D4" style={{ marginRight: 6 }} />
          <Text style={styles.topicText}>{attempt.quizTitle}</Text>
        </View>

        {/* 3 Metrics Card */}
        <View style={styles.metricsCard}>
          <View style={styles.metricCol}>
            <Ionicons name="checkmark-circle" size={22} color="#22C55E" style={styles.metricIcon} />
            <Text style={styles.metricNumberGreen}>{attempt.score}</Text>
            <Text style={styles.metricLabel}>Correct</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricCol}>
            <Ionicons name="close-circle" size={22} color="#EF4444" style={styles.metricIcon} />
            <Text style={styles.metricNumberRed}>{incorrectCount}</Text>
            <Text style={styles.metricLabel}>Incorrect</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricCol}>
            <Ionicons name="time-outline" size={22} color="#1B1931" style={styles.metricIcon} />
            <Text style={styles.metricNumberDark}>{formattedTime}</Text>
            <Text style={styles.metricLabel}>Time</Text>
          </View>
        </View>

        {/* Knowledge Insight Card */}
        <View style={styles.insightCard}>
          <View style={styles.insightIconBox}>
            <Ionicons name="bulb-outline" size={20} color="#4648D4" />
          </View>
          <View style={styles.insightTextCol}>
            <Text style={styles.insightTitle}>Knowledge Insight</Text>
            <Text style={styles.insightBody}>
              Review concept keys and explanations to solidify your high score.
            </Text>
          </View>
        </View>

        {/* Review Answers Button */}
        <TouchableOpacity
          style={styles.reviewBtn}
          onPress={() => navigation.navigate("QuizSummary", { attemptId: attempt.id })}
          activeOpacity={0.88}
        >
          <Text style={styles.reviewBtnText}>Review answers →</Text>
        </TouchableOpacity>

        {/* Export Quiz Button */}
        {activeQuiz && (
          <TouchableOpacity
            style={styles.exportOutlineBtn}
            onPress={() => setShowExportModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="download-outline" size={18} color="#6D44F2" style={{ marginRight: 6 }} />
            <Text style={styles.exportOutlineBtnText}>Export Quiz (DOCX, PPT, PDF)</Text>
          </TouchableOpacity>
        )}

        {/* Back to Quizzes Link */}
        <TouchableOpacity
          style={styles.backHomeBtn}
          onPress={() => navigation.navigate("MyQuizzes")}
          activeOpacity={0.7}
        >
          <Text style={styles.backHomeText}>Back to Quizzes</Text>
        </TouchableOpacity>
      </ScrollView>

      {activeQuiz && (
        <ExportModal
          visible={showExportModal}
          onClose={() => setShowExportModal(false)}
          quiz={activeQuiz}
          attempt={attempt}
        />
      )}

      {/* ─── Achievement / Medal / Ribbon Celebration Popup Modal ─── */}
      <Modal
        visible={showAchievementPopup && achievementEarned !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAchievementPopup(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.achievementCard}>
            <LinearGradient
              colors={
                achievementEarned?.colors
                  ? (achievementEarned.colors as [string, string, ...string[]])
                  : ["#4F46E5", "#6366F1"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.achievementHeaderGradient}
            >
              <View style={styles.medalCircle}>
                <Ionicons name={achievementEarned?.badgeIcon || "ribbon"} size={44} color="#FFFFFF" />
              </View>
              <View style={styles.congratsPill}>
                <Ionicons name="sparkles" size={13} color="#FBBF24" style={{ marginRight: 5 }} />
                <Text style={styles.congratsPillText}>NEW ACHIEVEMENT UNLOCKED!</Text>
              </View>
            </LinearGradient>

            <View style={styles.achievementBody}>
              <Text style={styles.achievementTierText}>{achievementEarned?.tier}</Text>
              <Text style={styles.achievementTitle}>{achievementEarned?.title}</Text>
              <Text style={styles.achievementDesc}>{achievementEarned?.description}</Text>

              <View style={styles.xpRewardBox}>
                <Ionicons name="sparkles" size={16} color="#4F46E5" style={{ marginRight: 6 }} />
                <Text style={styles.xpRewardText}>+{achievementEarned?.rewardXP} XP Earned</Text>
              </View>

              <TouchableOpacity
                style={styles.claimButton}
                onPress={() => {
                  triggerHaptic.selection();
                  setShowAchievementPopup(false);
                }}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={["#4F46E5", "#6366F1"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.claimButtonGradient}
                >
                  <Text style={styles.claimButtonText}>Claim & Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.viewAllBadgesBtn}
                onPress={() => {
                  setShowAchievementPopup(false);
                  navigation.navigate("Achievements");
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllBadgesText}>View Trophy Case</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 32,
    alignItems: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginVertical: 10,
  },
  evalBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  evalText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4648D4",
    letterSpacing: 0.8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeContainer: {
    marginVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeOuterRing: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 10,
    borderColor: "#FFDDB5",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    backgroundColor: "#FFFFFF",
    shadowColor: "#FFDDB5",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  gaugeInnerCircle: {
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNumberRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  scoreVal: {
    fontSize: 38,
    fontWeight: "800",
    color: "#1B1931",
  },
  scorePercentSign: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1B1931",
    marginTop: 4,
    marginLeft: 2,
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    letterSpacing: 0.8,
    marginTop: 2,
  },
  floatingMascotBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  floatingMascotImage: {
    width: 24,
    height: 24,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1B1931",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  topicText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4648D4",
  },
  metricsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 12,
    width: "100%",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  metricCol: {
    alignItems: "center",
    flex: 1,
  },
  metricIcon: {
    marginBottom: 6,
  },
  metricNumberGreen: {
    fontSize: 20,
    fontWeight: "800",
    color: "#22C55E",
    marginBottom: 2,
  },
  metricNumberRed: {
    fontSize: 20,
    fontWeight: "800",
    color: "#EF4444",
    marginBottom: 2,
  },
  metricNumberDark: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1B1931",
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E5E7EB",
  },
  insightCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    width: "100%",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  insightIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  insightTextCol: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1B1931",
    marginBottom: 4,
  },
  insightBody: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
    fontWeight: "500",
  },
  practiceBox: {
    width: "100%",
    height: 72,
    backgroundColor: "#F3EEFF",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#EDE5FE",
  },
  reviewBtn: {
    width: "100%",
    height: 52,
    borderRadius: 26,
    backgroundColor: THEME.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: THEME.colors.primary,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 14,
  },
  reviewBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  exportOutlineBtn: {
    width: "100%",
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5F3FF",
    borderWidth: 1.5,
    borderColor: "#6D44F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  exportOutlineBtnText: {
    color: "#6D44F2",
    fontSize: 14,
    fontWeight: "700",
  },
  backHomeBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  backHomeText: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  achievementCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  achievementHeaderGradient: {
    width: "100%",
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  medalCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
    marginBottom: 12,
  },
  congratsPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  congratsPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.8,
  },
  achievementBody: {
    width: "100%",
    paddingHorizontal: 22,
    paddingVertical: 20,
    alignItems: "center",
  },
  achievementTierText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6D44F2",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  achievementTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
    textAlign: "center",
  },
  achievementDesc: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 14,
  },
  xpRewardBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 18,
  },
  xpRewardText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4F46E5",
  },
  claimButton: {
    width: "100%",
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 10,
  },
  claimButtonGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  claimButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  viewAllBadgesBtn: {
    paddingVertical: 6,
  },
  viewAllBadgesText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
});