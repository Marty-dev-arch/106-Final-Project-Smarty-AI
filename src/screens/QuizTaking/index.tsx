import React, { useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../types/navigation";
import { useQuiz } from "../../context/QuizContext";
import TopBar from "../../components/common/TopBar";
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

  // If no active quiz, fallback to first quiz in list
  const targetedQuizId = route.params?.quizId;
  const quiz = activeQuiz || (targetedQuizId ? quizzes.find((q) => q.id === targetedQuizId) : undefined) || quizzes[0];

  // Track quiet elapsed time spent
  useEffect(() => {
    if (!quiz || !quiz.questions || quiz.questions.length === 0) return;
    setTimeSpent(0);

    const timer = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [quiz?.id]);

  const handleExitConfirm = () => {
    Alert.alert("Leave Quiz?", "Your current progress will be lost if you leave now.", [
      { text: "Keep Going", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => navigation.navigate("Dashboard"),
      },
    ]);
  };

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <View style={styles.container}>
        <TopBar title="Quiz Session" showBack onBack={() => navigation.navigate("Dashboard")} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No questions available in this quiz.</Text>
          <TouchableOpacity
            style={styles.backHomeButton}
            onPress={() => navigation.navigate("Dashboard")}
          >
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
      try {
        await finishQuiz(timeSpent);
        navigation.navigate("Results");
      } finally {
        setFinishing(false);
      }
    } else {
      nextQuestion();
    }
  };

  return (
    <View style={styles.container}>
      {/* Standard TopBar */}
      <TopBar
        title="Active Quiz Session"
        showBack
        onBack={handleExitConfirm}
        showLogo
        showActions
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Navigation Sub-bar */}
        <View style={styles.subBarRow}>
          <TouchableOpacity
            style={styles.circleNavBtn}
            onPress={prevQuestion}
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
            onPress={handleExitConfirm}
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
            colors={["#FFDDB5", "#FFA940"]}
            style={[styles.progressFill, { width: `${progressPercent}%` }]}
          />
        </View>

        {/* Subject & AI Verified Tag Row */}
        <View style={styles.metaRow}>
          <View style={styles.subjectRow}>
            <Ionicons name="flask-outline" size={16} color="#1B1931" style={{ marginRight: 6 }} />
            <Text style={styles.subjectText}>{quiz.category || "Biology"}</Text>
          </View>

          <View style={styles.verifiedRow}>
            <Image
              source={require("../../../assets/illustrations/smarty_logo.png")}
              style={styles.verifiedLogo}
              resizeMode="contain"
            />
            <Text style={styles.verifiedText}>AI Verified</Text>
          </View>
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
                onPress={() => selectAnswer(currentQ.id, index)}
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
                  <Ionicons name="checkmark-circle" size={24} color="#4648D4" />
                ) : (
                  <View style={styles.emptyCircleIndicator} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Concept Key Card */}
        <View style={styles.conceptCard}>
          <View style={styles.bulbIconCircle}>
            <Ionicons name="bulb" size={18} color="#F59E0B" />
          </View>
          <View style={styles.conceptTextCol}>
            <View style={styles.conceptHeaderRow}>
              <Text style={styles.conceptKeyTag}>CONCEPT KEY</Text>
              <Text style={styles.conceptCategory}>{quiz.category || "Cell Biology"}</Text>
            </View>
            <Text style={styles.conceptBody}>
              {currentQ.explanation ||
                "Mitochondria generate ATP through cellular respiration, powering nearly everything the cell does."}
            </Text>
          </View>
        </View>

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
              {isLastQuestion ? "Complete quiz →" : "Next question →"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 16,
  },
  backHomeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: THEME.colors.primary,
  },
  backHomeText: {
    color: "#FFFFFF",
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
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: "#4338CA",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  timerPillUrgent: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
  },
  timerPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4338CA",
    fontVariant: ["tabular-nums"],
  },
  timerPillTextUrgent: {
    color: "#DC2626",
  },
  progressTrack: {
    width: "100%",
    height: 3,
    backgroundColor: "#F3F4F6",
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
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  verifiedLogo: {
    width: 16,
    height: 16,
    marginRight: 6,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
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
    backgroundColor: "#EAE8FE",
    borderColor: "#4648D4",
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
    color: "#4648D4",
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
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});