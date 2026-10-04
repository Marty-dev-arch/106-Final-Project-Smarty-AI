import React, { useState } from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../types/navigation";
import { useQuiz } from "../../context/QuizContext";
import TopBar from "../../components/common/TopBar";
import ExportModal from "../../components/common/ExportModal";
import { isReadableText, sanitizeTitle } from "../../utils/documentExtractor";
import THEME from "../../config/theme";

export default function QuizSummary() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "QuizSummary">>();
  const { latestAttempt, attempts, quizzes, activeQuiz, userAnswers } = useQuiz();

  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});
  const [showExportModal, setShowExportModal] = useState(false);

  const toggleExplanation = (id: string) => {
    setExpandedExplanations(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const attempt = (route.params?.attemptId ? attempts?.find(a => a.id === route.params?.attemptId) : null) || latestAttempt || (attempts && attempts.length > 0 ? attempts[0] : null);
  const targetQuiz = attempt ? (quizzes.find(q => q.id === attempt.quizId) || (activeQuiz?.id === attempt.quizId ? activeQuiz : activeQuiz)) : activeQuiz;

  const displayTitle = sanitizeTitle(
    attempt?.quizTitle,
    targetQuiz?.sourceDocName || targetQuiz?.title,
    "Study Quiz"
  );

  const questionsList = targetQuiz?.questions && targetQuiz.questions.length > 0
    ? targetQuiz.questions
    : attempt?.answers?.map((ans, idx) => ({
        id: ans.questionId,
        type: (typeof ans.userAnswer === "string" ? "enumeration" : "multiple_choice") as any,
        prompt: `Question ${idx + 1}`,
        options: [],
        correctAnswer: ans.isCorrect ? ans.userAnswer : "Correct concept",
        explanation: "Review this topic in your study notes.",
      })) || [];

  if (!attempt) {
    return (
      <SafeAreaView style={styles.container}>
        <TopBar showBack title="Quiz Summary" onBack={() => navigation.navigate("MyQuizzes")} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#6B7280" }}>No attempt data found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <TopBar
        showBack
        showLogo={false}
        title="Quiz Summary"
        showBell
        showActions
        onBack={() => navigation.navigate("MyQuizzes")}
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
                {displayTitle} • {attempt.totalQuestions} questions
              </Text>
            </View>
            <View style={styles.starScoreBadge}>
              <Ionicons name="star" size={14} color="#D97706" style={{ marginRight: 4 }} />
              <Text style={styles.starScoreText}>{attempt.score} / {attempt.totalQuestions}</Text>
            </View>
          </View>

          {/* Top Result Banner Card */}
          <View style={styles.resultBannerCard}>
            <View style={styles.percentageRing}>
              <Text style={styles.percentageNumber}>{attempt.percentage}%</Text>
            </View>
            <View style={styles.resultBannerTextCol}>
              <View style={styles.bannerHeadingRow}>
                <Text style={styles.resultBannerTitle}>{attempt.percentage >= 80 ? "Outstanding effort!" : "Good effort!"}</Text>
                <Text style={styles.partyEmoji}>{attempt.percentage >= 80 ? " 🎉" : " 💪"}</Text>
              </View>
              <Text style={styles.resultBannerSubtitle}>
                {attempt.percentage >= 80 
                  ? "You mastered the core concepts well." 
                  : "Review the missed concepts to improve your score next time."}
              </Text>
            </View>
          </View>

          {/* Dynamic Questions Rendering */}
          {questionsList.map((question, index) => {
            const answerDetail = attempt.answers.find(a => a.questionId === question.id) || attempt.answers[index];
            const isCorrect = answerDetail !== undefined 
              ? Boolean(answerDetail.isCorrect) 
              : (
                typeof question.correctAnswer === "number"
                  ? userAnswers[question.id] === question.correctAnswer
                  : String(userAnswers[question.id] || "").trim().toLowerCase() === String(question.correctAnswer || "").trim().toLowerCase()
              );

            const rawUserAns = answerDetail?.userAnswer !== undefined ? answerDetail.userAnswer : userAnswers[question.id];
            const isSkipped = rawUserAns === -1 || rawUserAns === undefined || rawUserAns === null || rawUserAns === "";

            let userAnswerText = "Skipped";
            if (!isSkipped) {
              if (typeof rawUserAns === "number") {
                if (question.options && question.options[rawUserAns] !== undefined) {
                  userAnswerText = question.options[rawUserAns];
                } else {
                  userAnswerText = `Option ${rawUserAns + 1}`;
                }
              } else {
                userAnswerText = String(rawUserAns);
              }
            }

            let correctAnswerText = "";
            if (typeof question.correctAnswer === "number") {
              if (question.options && question.options[question.correctAnswer] !== undefined) {
                correctAnswerText = question.options[question.correctAnswer];
              } else {
                correctAnswerText = `Option ${question.correctAnswer + 1}`;
              }
            } else {
              correctAnswerText = String(question.correctAnswer ?? "");
            }

            const expanded = !!expandedExplanations[question.id];

            return (
              <View key={question.id || `q_${index}`} style={styles.questionCard}>
                <View style={styles.questionCardHeader}>
                  <View style={[
                    styles.statusIconCircle, 
                    isCorrect ? styles.correctIconCircle : (isSkipped ? { backgroundColor: '#F59E0B' } : styles.incorrectIconCircle)
                  ]}>
                    <Ionicons name={isCorrect ? "checkmark" : (isSkipped ? "remove" : "close")} size={13} color="#FFFFFF" />
                  </View>
                  <View style={styles.headerTexts}>
                    <Text style={[
                      styles.questionNumberText, 
                      !isCorrect && !isSkipped ? { color: "#B91C1C" } : (isSkipped ? { color: "#D97706" } : {})
                    ]}>
                      QUESTION {index + 1}
                    </Text>
                    {isCorrect ? (
                      <Text style={styles.xpText}>+50 XP</Text>
                    ) : isSkipped ? (
                      <Text style={[styles.needsReviewText, { color: "#D97706" }]}>Missed</Text>
                    ) : (
                      <Text style={styles.needsReviewText}>Needs Review</Text>
                    )}
                  </View>
                </View>

                <Text style={styles.questionPrompt}>
                  {question.prompt}
                </Text>

                <View style={styles.answerBlock}>
                  <Text style={styles.answerLine}>
                    <Text style={styles.answerPrefix}>Your answer:  </Text>
                    <Text style={[
                      styles.answerBold, 
                      !isCorrect && !isSkipped ? { color: "#DC2626" } : (isSkipped ? { color: "#D97706" } : { color: "#111827" })
                    ]}>
                      {userAnswerText}
                    </Text>
                  </Text>

                  {!isCorrect && (
                    <Text style={[styles.answerLine, { marginTop: 6 }]}>
                      <Text style={styles.answerPrefix}>Correct answer:  </Text>
                      <Text style={[styles.answerBold, { color: "#16A34A" }]}>{correctAnswerText}</Text>
                    </Text>
                  )}
                </View>

                {/* Explanation Toggle */}
                {question.explanation && (
                  <>
                    <TouchableOpacity
                      style={styles.accordionHeader}
                      onPress={() => toggleExplanation(question.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.accordionHeaderLeft}>
                        <Ionicons name="bulb-outline" size={15} color={isCorrect ? "#10B981" : "#DC2626"} style={{ marginRight: 6 }} />
                        <Text style={styles.accordionHeaderText}>AI Tutor Explanation</Text>
                      </View>
                      <Ionicons
                        name={expanded ? "chevron-up" : "chevron-down"}
                        size={16}
                        color="#4338CA"
                      />
                    </TouchableOpacity>

                    {expanded && (
                      <View style={styles.accordionBody}>
                        <Text style={styles.explanationParagraph}>
                          {question.explanation}
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            );
          })}

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

          {targetQuiz && (
            <TouchableOpacity
              style={styles.exportOutlineBtn}
              onPress={() => setShowExportModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="download-outline" size={16} color="#4F46E5" style={{ marginRight: 6 }} />
              <Text style={styles.exportOutlineBtnText}>Export Study Guide (PDF, DOCX)</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {targetQuiz && (
        <ExportModal
          visible={showExportModal}
          onClose={() => setShowExportModal(false)}
          quiz={targetQuiz}
          attempt={attempt}
        />
      )}
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
  answerBlock: {
    marginTop: 4,
    marginBottom: 6,
  },
  answerLine: {
    fontSize: 14,
    lineHeight: 20,
    color: "#111827",
  },
  answerPrefix: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  answerBold: {
    fontSize: 14,
    fontWeight: "700",
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
  exportOutlineBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E0E7FF",
    backgroundColor: "#F5F3FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 10,
  },
  exportOutlineBtnText: {
    color: "#4F46E5",
    fontSize: 14,
    fontWeight: "700",
  },
});