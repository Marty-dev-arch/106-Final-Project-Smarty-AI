import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../types/navigation";
import { useQuiz } from "../../context/QuizContext";
import TopBar from "../../components/common/TopBar";
import ExportModal from "../../components/common/ExportModal";
import { triggerHaptic } from "../../utils/haptics";
import THEME from "../../config/theme";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function QuizTaking() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "QuizTaking">>();
  const insets = useSafeAreaInsets();
  const {
    activeQuiz,
    quizzes,
    currentQuestionIndex,
    userAnswers,
    selectAnswer,
    nextQuestion,
    prevQuestion,
    setCurrentQuestionIndex,
    finishQuiz,
    startQuiz,
    startMistakePractice,
    updateCurrentQuestion,
    addNewQuestionToQuiz,
    deleteQuestionFromQuiz,
  } = useQuiz();

  const [finishing, setFinishing] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);

  // ─── Customization / Edit Mode State ─────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [editOptions, setEditOptions] = useState<string[]>([]);
  const [editCorrectIndex, setEditCorrectIndex] = useState<number>(0);
  const [editExplanation, setEditExplanation] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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

  const currentQ = quiz?.questions ? quiz.questions[currentQuestionIndex] || quiz.questions[0] : null;
  const totalQ = quiz?.questions ? quiz.questions.length : 0;
  const progressPercent = totalQ > 0 ? Math.round(((currentQuestionIndex + 1) / totalQ) * 100) : 0;
  const selectedAnswer = currentQ ? userAnswers[currentQ.id] : undefined;
  const isLastQuestion = currentQuestionIndex === totalQ - 1;

  // Synchronize local edit fields with current question
  useEffect(() => {
    if (currentQ) {
      setEditPrompt(currentQ.prompt || "");
      setEditOptions(
        currentQ.options && currentQ.options.length > 0
          ? [...currentQ.options]
          : ["Option A", "Option B", "Option C", "Option D"]
      );
      setEditCorrectIndex(typeof currentQ.correctAnswer === "number" ? currentQ.correctAnswer : 0);
      setEditExplanation(currentQ.explanation || "");
    }
  }, [currentQuestionIndex, currentQ?.id, isEditing]);

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Dashboard");
    }
  };

  const handleSaveQuestionEdit = async () => {
    if (!currentQ) return;
    if (!editPrompt.trim()) {
      triggerHaptic.error();
      alert("Please enter a question prompt.");
      return;
    }
    const filtered = editOptions.map((o) => o.trim()).filter((o) => o.length > 0);
    if (filtered.length < 2) {
      triggerHaptic.error();
      alert("Please provide at least 2 answer options.");
      return;
    }
    const safeCorrectIndex = Math.min(Math.max(0, editCorrectIndex), filtered.length - 1);

    setSavingEdit(true);
    try {
      await updateCurrentQuestion({
        ...currentQ,
        prompt: editPrompt.trim(),
        options: filtered,
        correctAnswer: safeCorrectIndex,
        explanation: editExplanation.trim(),
      });
      triggerHaptic.success();
      setIsEditing(false);
    } catch (e) {
      triggerHaptic.error();
      alert("Failed to save changes.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddNewQuestion = async () => {
    triggerHaptic.medium();
    const newCount = totalQ + 1;
    await addNewQuestionToQuiz({
      prompt: `New Question ${newCount}`,
      options: ["First Choice", "Second Choice", "Third Choice", "Fourth Choice"],
      correctAnswer: 0,
      explanation: "",
    });
    setIsEditing(true);
  };

  const handleDeleteCurrentQuestion = () => {
    if (totalQ <= 1) {
      triggerHaptic.error();
      alert("A quiz must have at least one question.");
      return;
    }
    triggerHaptic.light();
    deleteQuestionFromQuiz(currentQuestionIndex);
    setIsEditing(false);
  };

  const handleOptionTextChange = (text: string, index: number) => {
    const updated = [...editOptions];
    updated[index] = text;
    setEditOptions(updated);
  };

  const handleAddOptionField = () => {
    if (editOptions.length >= 6) return;
    triggerHaptic.light();
    const nextLetter = OPTION_LETTERS[editOptions.length] || "X";
    setEditOptions([...editOptions, `Option ${nextLetter}`]);
  };

  const handleRemoveOptionField = (index: number) => {
    if (editOptions.length <= 2) {
      alert("Questions must have at least 2 options.");
      return;
    }
    triggerHaptic.light();
    const updated = editOptions.filter((_, i) => i !== index);
    setEditOptions(updated);
    if (editCorrectIndex >= updated.length) {
      setEditCorrectIndex(updated.length - 1);
    }
  };

  if (!quiz || !quiz.questions || quiz.questions.length === 0 || !currentQ) {
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
        title={isEditing ? "Customize Question" : "Active Quiz Session"}
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
              setIsEditing(false);
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
                Question {currentQuestionIndex + 1}/{totalQ}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.circleNavBtn}
            onPress={() => {
              triggerHaptic.light();
              if (isLastQuestion) {
                handleGoBack();
              } else {
                nextQuestion();
                setIsEditing(false);
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isLastQuestion ? "close" : "chevron-forward"}
              size={18}
              color="#1B1931"
            />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressTrack}>
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            colors={["#6D44F2", "#4648D4"]}
            style={[styles.progressFill, { width: `${progressPercent}%` }]}
          />
        </View>

        {/* Meta Row: Subject & Action Buttons (Edit Question & Export) */}
        <View style={styles.metaRow}>
          <View style={styles.subjectRow}>
            <Ionicons name="flask-outline" size={16} color="#1B1931" style={{ marginRight: 6 }} />
            <Text style={styles.subjectText} numberOfLines={1}>
              {quiz.category || quiz.title}
            </Text>
          </View>

          <View style={styles.metaActionsRight}>
            {/* Toggle Edit Button */}
            <TouchableOpacity
              style={[styles.editToggleBtn, isEditing && styles.editToggleBtnActive]}
              onPress={() => {
                triggerHaptic.selection();
                setIsEditing(!isEditing);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isEditing ? "eye-outline" : "create-outline"}
                size={14}
                color={isEditing ? "#FFFFFF" : "#6D44F2"}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.editToggleText, isEditing && styles.editToggleTextActive]}>
                {isEditing ? "Preview" : "Edit"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exportBtn}
              onPress={() => setShowExportModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="download-outline" size={14} color={THEME.colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.exportBtnText}>Export</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── EDIT MODE OR PREVIEW/TAKE MODE ───────────────────────────────── */}
        {isEditing ? (
          /* ─── FULL QUESTION CUSTOMIZATION FORM ───────────────────────────── */
          <View style={styles.editSectionCard}>
            <View style={styles.editHeaderRow}>
              <View style={styles.editBadge}>
                <Ionicons name="create" size={13} color="#6D44F2" style={{ marginRight: 4 }} />
                <Text style={styles.editBadgeText}>EDITING QUESTION {currentQuestionIndex + 1}</Text>
              </View>
              {totalQ > 1 && (
                <TouchableOpacity
                  onPress={handleDeleteCurrentQuestion}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.deleteQuestionText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Question Prompt Editor */}
            <Text style={styles.fieldLabel}>QUESTION PROMPT</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.promptTextInput}
                placeholder="Enter your question prompt here..."
                placeholderTextColor="#94A3B8"
                value={editPrompt}
                onChangeText={setEditPrompt}
                multiline
              />
            </View>

            {/* Answer Options Editor */}
            <View style={styles.optionsHeaderRow}>
              <Text style={styles.fieldLabel}>ANSWER CHOICES</Text>
              <Text style={styles.fieldSubHint}>Tap circle to set correct answer</Text>
            </View>

            <View style={styles.editOptionsList}>
              {editOptions.map((opt, idx) => {
                const isCorrect = editCorrectIndex === idx;
                const letter = OPTION_LETTERS[idx] || `${idx + 1}`;
                return (
                  <View
                    key={idx}
                    style={[styles.editOptionRow, isCorrect && styles.editOptionRowCorrect]}
                  >
                    {/* Letter tag */}
                    <View
                      style={[
                        styles.editOptionLetterBadge,
                        isCorrect && styles.editOptionLetterBadgeCorrect,
                      ]}
                    >
                      <Text
                        style={[
                          styles.editOptionLetterText,
                          isCorrect && styles.editOptionLetterTextCorrect,
                        ]}
                      >
                        {letter}
                      </Text>
                    </View>

                    {/* Option Text Input */}
                    <TextInput
                      style={styles.editOptionTextInput}
                      placeholder={`Choice ${letter}...`}
                      placeholderTextColor="#94A3B8"
                      value={opt}
                      onChangeText={(t) => handleOptionTextChange(t, idx)}
                    />

                    {/* Correct Answer Selector */}
                    <TouchableOpacity
                      style={styles.correctCheckBtn}
                      onPress={() => {
                        triggerHaptic.selection();
                        setEditCorrectIndex(idx);
                      }}
                      activeOpacity={0.7}
                    >
                      {isCorrect ? (
                        <View style={styles.correctBadgePill}>
                          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                          <Text style={styles.correctBadgeText}>Correct</Text>
                        </View>
                      ) : (
                        <View style={styles.uncheckCircle} />
                      )}
                    </TouchableOpacity>

                    {/* Remove Option Button */}
                    {editOptions.length > 2 && (
                      <TouchableOpacity
                        onPress={() => handleRemoveOptionField(idx)}
                        style={styles.removeOptBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close" size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Add Option Choice Button */}
            {editOptions.length < 6 && (
              <TouchableOpacity
                style={styles.addOptionBtn}
                onPress={handleAddOptionField}
                activeOpacity={0.75}
              >
                <Ionicons name="add-circle-outline" size={16} color="#6D44F2" style={{ marginRight: 6 }} />
                <Text style={styles.addOptionBtnText}>+ Add Another Choice</Text>
              </TouchableOpacity>
            )}

            {/* Concept Key / Explanation Editor */}
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>EXPLANATION & STUDY NOTES</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.explanationTextInput}
                placeholder="Explain why the answer is correct or add key study references..."
                placeholderTextColor="#94A3B8"
                value={editExplanation}
                onChangeText={setEditExplanation}
                multiline
              />
            </View>

            {/* Save Changes Button */}
            <TouchableOpacity
              style={styles.saveEditBtn}
              onPress={handleSaveQuestionEdit}
              disabled={savingEdit}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={["#6D44F2", "#5844E8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveEditGradient}
              >
                {savingEdit ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.saveEditBtnText}>Save Question</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          /* ─── REGULAR INTERACTIVE QUIZ PREVIEW / TAKE VIEW ───────────────── */
          <>
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
                const letter = OPTION_LETTERS[index] || `${index + 1}`;
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
                    <View style={[styles.previewLetterBadge, isSelected && styles.previewLetterBadgeSelected]}>
                      <Text style={[styles.previewLetterText, isSelected && styles.previewLetterTextSelected]}>
                        {letter}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.optionText,
                        isSelected ? styles.optionTextSelected : styles.optionTextDefault,
                      ]}
                    >
                      {option}
                    </Text>

                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={22} color="#6D44F2" />
                    ) : (
                      <View style={styles.emptyCircleIndicator} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ─── PROMINENT "ADD NEW QUESTION PAGE" BUTTON ON THE LAST QUESTION ── */}
            {isLastQuestion && (
              <TouchableOpacity
                style={styles.addQuestionPageCard}
                onPress={handleAddNewQuestion}
                activeOpacity={0.82}
              >
                <View style={styles.addQuestionIconCircle}>
                  <Ionicons name="add" size={22} color="#6D44F2" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.addQuestionPageTitle}>+ Add New Question</Text>
                  <Text style={styles.addQuestionPageSubtitle}>
                    Insert a blank question template to expand this quiz
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* ─── FIXED BOTTOM ACTION BAR ─────────────────────────────────────── */}
      {!isEditing && (
        <View style={[styles.fixedBottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
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
        </View>
      )}

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
  fixedBottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
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
  },
  questionPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  liveGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
    marginRight: 6,
  },
  questionPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  progressTrack: {
    height: 4,
    width: "100%",
    backgroundColor: "#F1F5F9",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  subjectText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  metaActionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editToggleBtnActive: {
    backgroundColor: "#6D44F2",
    borderColor: "#6D44F2",
  },
  editToggleText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#6D44F2",
  },
  editToggleTextActive: {
    color: "#FFFFFF",
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  exportBtnText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: THEME.colors.primary,
  },

  // ─── Regular View Styles ──────────────────────────────────────────────────
  questionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  qBadge: {
    backgroundColor: "#EDE9FE",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 10,
  },
  qBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6D44F2",
  },
  questionTitle: {
    fontSize: 16.5,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  optionsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  optionCardDefault: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  optionCardSelected: {
    backgroundColor: "#F5F3FF",
    borderColor: "#6D44F2",
  },
  previewLetterBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  previewLetterBadgeSelected: {
    backgroundColor: "#6D44F2",
  },
  previewLetterText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
  },
  previewLetterTextSelected: {
    color: "#FFFFFF",
  },
  optionText: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 20,
  },
  optionTextDefault: {
    color: "#334155",
    fontWeight: "500",
  },
  optionTextSelected: {
    color: "#1E1B4B",
    fontWeight: "700",
  },
  emptyCircleIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
  },
  conceptCard: {
    flexDirection: "row",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  bulbIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEF3C7",
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
    gap: 8,
  },
  conceptKeyTag: {
    fontSize: 10,
    fontWeight: "800",
    color: "#B45309",
    letterSpacing: 0.5,
  },
  conceptCategory: {
    fontSize: 11,
    fontWeight: "600",
    color: "#92400E",
  },
  conceptBody: {
    fontSize: 13,
    color: "#78350F",
    lineHeight: 18,
    fontWeight: "400",
  },

  // ─── Add New Question Page Button (on Last Question) ──────────────────────
  addQuestionPageCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF5FF",
    borderWidth: 1.5,
    borderColor: "#E9D5FF",
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  addQuestionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  addQuestionPageTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#6D44F2",
    marginBottom: 2,
  },
  addQuestionPageSubtitle: {
    fontSize: 12,
    color: "#7C3AED",
    fontWeight: "400",
  },

  // Primary Action Button (Next / Finish)
  actionBtn: {
    backgroundColor: "#4F46E5",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4F46E5",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
    marginTop: 4,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },

  // ─── Edit Mode Styles ─────────────────────────────────────────────────────
  editSectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: 18,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  editHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  editBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6D44F2",
    letterSpacing: 0.4,
  },
  deleteQuestionText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#EF4444",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  optionsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 6,
  },
  fieldSubHint: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  inputWrap: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  promptTextInput: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    minHeight: 64,
    textAlignVertical: "top",
  },
  explanationTextInput: {
    fontSize: 14,
    color: "#334155",
    minHeight: 56,
    textAlignVertical: "top",
  },
  editOptionsList: {
    gap: 8,
  },
  editOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editOptionRowCorrect: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
  },
  editOptionLetterBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  editOptionLetterBadgeCorrect: {
    backgroundColor: "#10B981",
  },
  editOptionLetterText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
  },
  editOptionLetterTextCorrect: {
    color: "#FFFFFF",
  },
  editOptionTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#0F172A",
    paddingVertical: 6,
  },
  correctCheckBtn: {
    paddingHorizontal: 6,
  },
  correctBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  correctBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  uncheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
  },
  removeOptBtn: {
    padding: 4,
    marginLeft: 2,
  },
  addOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    borderRadius: 12,
    backgroundColor: "#FAF5FF",
  },
  addOptionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6D44F2",
  },
  saveEditBtn: {
    marginTop: 20,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#6D44F2",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  saveEditGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  saveEditBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});