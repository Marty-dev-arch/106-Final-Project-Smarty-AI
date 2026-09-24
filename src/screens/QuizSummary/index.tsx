import React, { useState } from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../types/navigation";
import { useQuiz } from "../../context/QuizContext";
import TopBar from "../../components/common/TopBar";
import THEME from "../../config/theme";

export default function QuizSummary() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { latestAttempt, activeQuiz, userAnswers } = useQuiz();

  const [expandedExplanation, setExpandedExplanation] = useState<boolean>(true);

  const attempt = latestAttempt || {
    id: "att_demo",
    quizId: "quiz_cell_biology",
    quizTitle: activeQuiz?.title || "Cell Biology Evaluation",
    score: 3,
    totalQuestions: 4,
    percentage: 75,
    timeSpentSeconds: 45,
    earnedXP: 200,
    answers: [],
    date: "Today",
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <TopBar
        showBack
        showLogo={false}
        title="Quiz Summary"
        showBell
        showActions
        onBack={() => navigation.navigate("Dashboard")}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrapper}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.mainTitle}>Review Answers</Text>
              <Text style={styles.subtitle}>
                Cell Biology Evaluation • 4 questions
              </Text>
            </View>
            <View style={styles.starScoreBadge}>
              <Ionicons name="star" size={14} color="#D97706" style={{ marginRight: 4 }} />
              <Text style={styles.starScoreText}>3 / 4</Text>
            </View>
          </View>

          {/* Top Result Banner Card */}
          <View style={styles.resultBannerCard}>
            <View style={styles.percentageRing}>
              <Text style={styles.percentageNumber}>75%</Text>
            </View>
            <View style={styles.resultBannerTextCol}>
              <View style={styles.bannerHeadingRow}>
                <Text style={styles.resultBannerTitle}>Outstanding effort!</Text>
                <Text style={styles.partyEmoji}> 🎉</Text>
              </View>
              <Text style={styles.resultBannerSubtitle}>
                You mastered core organelles and permeable mechanisms. One concept left
              </Text>
            </View>
          </View>

          {/* Question 1 (Correct) */}
          <View style={styles.questionCard}>
            <View style={styles.questionCardHeader}>
              <View style={[styles.statusIconCircle, styles.correctIconCircle]}>
                <Ionicons name="checkmark" size={13} color="#FFFFFF" />
              </View>
              <View style={styles.headerTexts}>
                <Text style={styles.questionNumberText}>QUESTION 1</Text>
                <Text style={styles.xpText}>+100 XP</Text>
              </View>
            </View>

            <Text style={styles.questionPrompt}>
              Which organelle is the powerhouse of the cell?
            </Text>

            <View style={styles.answerRow}>
              <Text style={styles.answerPrefix}>Your answer: </Text>
              <Text style={styles.answerBold}>Mitochondria</Text>
            </View>
          </View>

          {/* Question 2 (Incorrect with Accordion) */}
          <View style={styles.questionCard}>
            <View style={styles.questionCardHeader}>
              <View style={[styles.statusIconCircle, styles.incorrectIconCircle]}>
                <Ionicons name="close" size={13} color="#FFFFFF" />
              </View>
              <View style={styles.headerTexts}>
                <Text style={[styles.questionNumberText, { color: "#B91C1C" }]}>
                  QUESTION 2
                </Text>
                <Text style={styles.needsReviewText}>Needs Review</Text>
              </View>
            </View>

            <Text style={styles.questionPrompt}>
              The cell membrane is completely impermeable to all molecules.
            </Text>

            <View style={styles.answerRow}>
              <Text style={styles.answerPrefix}>Your answer: </Text>
              <Text style={[styles.answerBold, { color: "#DC2626" }]}>True</Text>
            </View>

            <View style={[styles.answerRow, { marginTop: 4 }]}>
              <Text style={styles.answerPrefix}>Correct answer: </Text>
              <Text style={[styles.answerBold, { color: "#16A34A" }]}>False</Text>
            </View>

            {/* Accordion Toggle */}
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => setExpandedExplanation(!expandedExplanation)}
              activeOpacity={0.7}
            >
              <View style={styles.accordionHeaderLeft}>
                <Ionicons name="bulb-outline" size={15} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.accordionHeaderText}>AI Tutor Explanation</Text>
              </View>
              <Ionicons
                name={expandedExplanation ? "chevron-up" : "chevron-down"}
                size={16}
                color="#4338CA"
              />
            </TouchableOpacity>

            {/* Accordion Content */}
            {expandedExplanation && (
              <View style={styles.accordionBody}>
                <Text style={styles.explanationParagraph}>
                  The membrane is selectively permeable — small, non-polar molecules pass through fairly easily.
                </Text>
                <View style={styles.tipRow}>
                  <Text style={styles.tipLabel}>Tip: </Text>
                  <Text style={styles.tipText}>
                    Water and oxygen use passive diffusion or aquaporins.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Question 3 (Correct with Key Takeaway) */}
          <View style={styles.questionCard}>
            <View style={styles.questionCardHeader}>
              <View style={[styles.statusIconCircle, styles.correctIconCircle]}>
                <Ionicons name="checkmark" size={13} color="#FFFFFF" />
              </View>
              <View style={styles.headerTexts}>
                <Text style={styles.questionNumberText}>QUESTION 3</Text>
                <Text style={styles.xpText}>+100 XP</Text>
              </View>
            </View>

            <Text style={styles.questionPrompt}>
              Which structure controls what enters and exits the cell?
            </Text>

            <View style={styles.answerRow}>
              <Text style={styles.answerPrefix}>Your answer: </Text>
              <Text style={styles.answerBold}>Cell membrane</Text>
            </View>

            {/* Key Takeaway Box */}
            <View style={styles.takeawayBox}>
              <View style={styles.takeawayHeaderRow}>
                <Ionicons name="information-circle-outline" size={14} color="#6366F1" style={{ marginRight: 4 }} />
                <Text style={styles.takeawayLabel}>Key takeaway</Text>
              </View>
              <Text style={styles.takeawayText}>
                Also known as the plasma membrane, its lipid bilayer maintains cellular homeostasis by selectively gating nutrients and waste.
              </Text>
            </View>
          </View>

          {/* Question 4 (Correct) */}
          <View style={styles.questionCard}>
            <View style={styles.questionCardHeader}>
              <View style={[styles.statusIconCircle, styles.correctIconCircle]}>
                <Ionicons name="checkmark" size={13} color="#FFFFFF" />
              </View>
              <View style={styles.headerTexts}>
                <Text style={styles.questionNumberText}>QUESTION 4</Text>
                <Text style={styles.xpText}>+100 XP</Text>
              </View>
            </View>

            <Text style={styles.questionPrompt}>
              Name the site of protein synthesis in a cell.
            </Text>

            <View style={styles.answerRow}>
              <Text style={styles.answerPrefix}>Your answer: </Text>
              <Text style={styles.answerBold}>Ribosome</Text>
            </View>
          </View>

          {/* Bottom Action Buttons */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate("Results", { attemptId: attempt.id })}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryButtonText}>Continue to Summary →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("QuizTaking", { isMistakePractice: true })}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={16} color="#5B41E8" style={{ marginRight: 6 }} />
            <Text style={styles.secondaryButtonText}>Retry Missed Questions</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  contentWrapper: {
    paddingHorizontal: 20,
    maxWidth: 440,
    alignSelf: "center",
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E1B4B",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 3,
  },
  starScoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  starScoreText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#92400E",
  },
  resultBannerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F6FF",
    borderWidth: 1,
    borderColor: "#EDE9FE",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  percentageRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 4,
    borderColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  percentageNumber: {
    fontSize: 14,
    fontWeight: "800",
    color: "#4F46E5",
  },
  resultBannerTextCol: {
    flex: 1,
  },
  bannerHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  resultBannerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  partyEmoji: {
    fontSize: 14,
  },
  resultBannerSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: "#6B7280",
  },
  questionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F2F6",
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 1,
  },
  questionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statusIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  correctIconCircle: {
    backgroundColor: "#10B981",
  },
  incorrectIconCircle: {
    backgroundColor: "#EF4444",
  },
  headerTexts: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  questionNumberText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    letterSpacing: 0.4,
  },
  xpText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#10B981",
  },
  needsReviewText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  questionPrompt: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 21,
    marginBottom: 10,
  },
  answerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  answerPrefix: {
    fontSize: 13,
    color: "#6B7280",
  },
  answerBold: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F3F0FF",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  accordionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  accordionHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4338CA",
  },
  accordionBody: {
    backgroundColor: "#F8F6FF",
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
  },
  explanationParagraph: {
    fontSize: 12,
    lineHeight: 18,
    color: "#374151",
    marginBottom: 6,
  },
  tipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tipLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4338CA",
  },
  tipText: {
    fontSize: 12,
    color: "#6B7280",
  },
  takeawayBox: {
    backgroundColor: "#F8F6FF",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  takeawayHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  takeawayLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6366F1",
  },
  takeawayText: {
    fontSize: 12,
    lineHeight: 17,
    color: "#4B5563",
  },
  primaryButton: {
    backgroundColor: "#5B41E8",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: "#5B41E8",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#F0EDFF",
    height: 50,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  secondaryButtonText: {
    color: "#5B41E8",
    fontSize: 14,
    fontWeight: "700",
  },
});