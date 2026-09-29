import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../types/navigation";
import { useQuiz } from "../../context/QuizContext";
import TopBar from "../../components/common/TopBar";
import ExportModal from "../../components/common/ExportModal";
import { triggerHaptic } from "../../utils/haptics";
import THEME from "../../config/theme";

export default function QuizTaking() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "QuizTaking">>();
  const {
    activeQuiz,
    quizzes,
    currentQuestionIndex,
    userAnswers,
    selectAnswer,
    nextQuestion,
    prevQuestion,
    finishQuiz,
    startQuiz,
    startMistakePractice,
  } = useQuiz();

  const [finishing, setFinishing] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);

  // Handle route params: specific quizId or isMistakePractice
  useEffect(() => {
    if (route.params?.isMistakePractice) {
      startMistakePractice();
    } else if (route.params?.quizId) {
      const targetId = route.params.quizId;
      const found = quizzes.find((q) => q.id === targetId);
      if (found && found.id !== activeQuiz?.id) {
        startQuiz(found);
      }
    }
  }, [route.params?.quizId, route.params?.isMistakePractice]);

  // Determine active quiz (no mock fallbacks)
  const targetedQuizId = route.params?.quizId;
  const quiz = activeQuiz || (targetedQuizId ? quizzes.find((q) => q.id === targetedQuizId) : undefined);

  // Track quiet elapsed time spent
  useEffect(() => {
    if (!quiz || !quiz.questions || quiz.questions.length === 0) return;
    setTimeSpent(0);

    const timer = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [quiz?.id]);

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Dashboard");
    }
  };

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <View style={styles.container}>
        <TopBar title="Quiz Session" showBack onBack={handleGoBack} showLogo showActions />
        <View style={styles.emptyContainer}>
          <Ionicons name="help-circle-outline" size={48} color="#94A3B8" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>No Active Quiz Session</Text>
          <Text style={styles.emptySubtitle}>
            Please select a quiz from your library or upload a document to generate a new quiz.
          </Text>
          <TouchableOpacity
            style={styles.backHomeButton}
            onPress={handleGoBack}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.backHomeText}>Return to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentQ = quiz.questions[currentQuestionIndex] || quiz.questions[0];
  const totalQ = quiz.questions.length;
  const progressPercent = Math.round(((currentQuestionIndex + 1) / totalQ) * 100);
  const selectedAnswer = userAnswers[currentQ.id];
  const isLastQuestion = currentQuestionIndex === totalQ - 1;

  const handleNextOrFinish = async () => {
    if (isLastQuestion) {
      if (finishing) return;
      setFinishing(true);
      triggerHaptic.success();
      try {
        await finishQuiz(timeSpent);
        navigation.navigate("Results");
      } finally {
        setFinishing(false);
      }
    } else {
      triggerHaptic.light();
      nextQuestion();
    }
  };

  return (
    <View style={styles.container}>
      {/* TopBar with working back navigation */}
      <TopBar
        title="Active Quiz Session"
        showBack
        onBack={handleGoBack}
        showLogo
        showActions
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Navigation Sub-bar */}
        <View style={styles.subBarRow}>
          <TouchableOpacity
            style={styles.circleNavBtn}
            onPress={() => {
              triggerHaptic.light();
              prevQuestion();
            }}
            disabled={currentQuestionIndex === 0}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={currentQuestionIndex === 0 ? "#D1D5DB" : "#1B1931"}
            />
          </TouchableOpacity>

          <View style={styles.centerPillsRow}>
            <View style={styles.questionPill}>
              <View style={styles.liveGreenDot} />
              <Text style={styles.questionPillText}>
                {currentQuestionIndex + 1}/{totalQ}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.circleNavBtn}
            onPress={handleGoBack}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color="#1B1931" />
          </TouchableOpacity>
        </View>

        {/* Thin Gold Progress Bar */}
        <View style={styles.progressTrack}>
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            colors={["#6D44F2", "#4648D4"]}
            style={[styles.progressFill, { width: `${progressPercent}%` }]}
          />
        </View>

        {/* Subject & Export Button Row (Removed "AI Verified" text) */}
        <View style={styles.metaRow}>
          <View style={styles.subjectRow}>
            <Ionicons name="flask-outline" size={16} color="#1B1931" style={{ marginRight: 6 }} />
            <Text style={styles.subjectText}>{quiz.category || quiz.title}</Text>
          </View>

          <TouchableOpacity
            style={styles.exportBtn}
            onPress={() => setShowExportModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={15} color={THEME.colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.exportBtnText}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* Question Card */}
        <View style={styles.questionCard}>
          <View style={styles.qBadge}>
            <Text style={styles.qBadgeText}>Q{currentQuestionIndex + 1}</Text>
          </View>
          <Text style={styles.questionTitle}>{currentQ.prompt}</Text>
        </View>

        {/* Options List */}
        <View style={styles.optionsContainer}>
          {currentQ.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionCard,
                  isSelected ? styles.optionCardSelected : styles.optionCardDefault,
                ]}
                onPress={() => {
                  triggerHaptic.selection();
                  selectAnswer(currentQ.id, index);
                }}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.optionText,
                    isSelected ? styles.optionTextSelected : styles.optionTextDefault,
                  ]}
                >
                  {option}
                </Text>

                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={24} color="#6D44F2" />
                ) : (
                  <View style={styles.emptyCircleIndicator} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Concept Explanation Card */}
        {currentQ.explanation ? (
          <View style={styles.conceptCard}>
            <View style={styles.bulbIconCircle}>
              <Ionicons name="bulb" size={18} color="#F59E0B" />
            </View>
            <View style={styles.conceptTextCol}>
              <View style={styles.conceptHeaderRow}>
                <Text style={styles.conceptKeyTag}>CONCEPT KEY</Text>
                <Text style={styles.conceptCategory}>{quiz.category || "Study Concept"}</Text>
              </View>
              <Text style={styles.conceptBody}>{currentQ.explanation}</Text>
            </View>
          </View>
        ) : null}

        {/* Next Question / Finish Button */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleNextOrFinish}
          activeOpacity={0.88}
          disabled={finishing}
        >
          {finishing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.actionBtnText}>
              {isLastQuestion ? "Complete Quiz →" : "Next Question →"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Export Modal Component */}
      <ExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        quiz={quiz}
      />
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
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  backHomeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: THEME.colors.primary,
    shadowColor: THEME.colors.primary,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  backHomeText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  subBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 12,
  },
  circleNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  centerPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  questionPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: "#000000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  liveGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    marginRight: 6,
  },
  questionPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1B1931",
  },
  progressTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "#F1F5F9",
    borderRadius: 2,
    marginBottom: 16,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  subjectText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1B1931",
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EDE9FE",
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6D44F2",
  },
  questionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  qBadge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
    marginTop: 2,
  },
  qBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.colors.primary,
  },
  questionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: "#1B1931",
    lineHeight: 24,
  },
  optionsContainer: {
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1.5,
  },
  optionCardDefault: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  optionCardSelected: {
    backgroundColor: "#F5F3FF",
    borderColor: "#6D44F2",
  },
  optionText: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    marginRight: 12,
  },
  optionTextDefault: {
    color: "#1B1931",
  },
  optionTextSelected: {
    color: "#6D44F2",
    fontWeight: "700",
  },
  emptyCircleIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  conceptCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF2DE",
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FFE7C2",
  },
  bulbIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFE7C2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  conceptTextCol: {
    flex: 1,
  },
  conceptHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  conceptKeyTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "#D97706",
    letterSpacing: 0.8,
    marginRight: 8,
  },
  conceptCategory: {
    fontSize: 12,
    color: "#92400E",
    fontWeight: "600",
  },
  conceptBody: {
    fontSize: 13,
    color: "#78350F",
    lineHeight: 18,
    fontWeight: "500",
  },
  actionBtn: {
    width: "100%",
    height: 54,
    borderRadius: 16,
    backgroundColor: THEME.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: THEME.colors.primary,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});