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
  Modal,
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

  const { updateActiveQuiz } = useQuiz();
  const [finishing, setFinishing] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAnswerKeyModal, setShowAnswerKeyModal] = useState(false);
  const [showQuestionNavModal, setShowQuestionNavModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [flashcardMode, setFlashcardMode] = useState(false);
  const [revealedFlashcards, setRevealedFlashcards] = useState<{ [qId: string]: boolean }>({});
  const [renameTitleInput, setRenameTitleInput] = useState("");
  const [renaming, setRenaming] = useState(false);

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
      if (activeQuiz?.id !== targetId) {
        const found = quizzes.find((q) => q.id === targetId);
        if (found) {
          startQuiz(found);
        }
      } else {
        setCurrentQuestionIndex(0);
      }
    }
  }, [route.params?.quizId, route.params?.isMistakePractice, quizzes]);

  // Determine active quiz (prioritize targetedQuizId)
  const targetedQuizId = route.params?.quizId;
  const quiz = targetedQuizId
    ? (activeQuiz?.id === targetedQuizId ? activeQuiz : quizzes.find((q) => q.id === targetedQuizId) || activeQuiz)
    : activeQuiz;

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

  const handleGoBack = async () => {
    if (quiz && (currentQuestionIndex > 0 || Object.keys(userAnswers).length > 0)) {
      await updateActiveQuiz({
        ...quiz,
        savedProgressIndex: currentQuestionIndex,
        savedUserAnswers: userAnswers,
      }).catch(() => {});
    }
    navigation.navigate("MyQuizzes");
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

  const handleSaveRenameQuiz = async () => {
    if (!renameTitleInput.trim() || !quiz) return;
    setRenaming(true);
    try {
      const updatedQuiz = { ...quiz, title: renameTitleInput.trim() };
      await updateActiveQuiz(updatedQuiz);
      triggerHaptic.success();
      setShowRenameModal(false);
    } catch (e) {
      triggerHaptic.error();
      alert("Failed to update quiz title.");
    } finally {
      setRenaming(false);
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
            <TouchableOpacity
              style={styles.questionPill}
              onPress={() => {
                triggerHaptic.light();
                setShowQuestionNavModal(true);
              }}
              activeOpacity={0.75}
            >
              <View style={styles.liveGreenDot} />
              <Text style={styles.questionPillText}>
                Question {currentQuestionIndex + 1}/{totalQ}
              </Text>
              <Ionicons name="chevron-down" size={13} color="#4648D4" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
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

        {/* Meta Row: Quiz Title & Action Buttons (Rename, Answer Key, Edit Question, Export) */}
        <View style={styles.metaRow}>
          <TouchableOpacity
            style={styles.subjectRow}
            onPress={() => {
              setRenameTitleInput(quiz.title);
              setShowRenameModal(true);
            }}
            activeOpacity={0.75}
          >
            <Ionicons name="flask-outline" size={16} color="#1B1931" style={{ marginRight: 6 }} />
            <Text style={styles.subjectText} numberOfLines={1}>
              {quiz.title}
            </Text>
            <Ionicons name="pencil" size={13} color="#6D44F2" style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.threeDotsBtn}
            onPress={() => {
              triggerHaptic.light();
              setShowSettingsMenu(true);
            }}
            activeOpacity={0.75}
          >
            <Ionicons name="ellipsis-vertical" size={18} color="#4B5563" />
          </TouchableOpacity>
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

                    {/* Right Controls: Correct Selector + Delete Button */}
                    <View style={styles.optionRightGroup}>
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
                            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                            <Text style={styles.correctBadgeText}>Correct</Text>
                          </View>
                        ) : (
                          <View style={styles.uncheckCircle} />
                        )}
                      </TouchableOpacity>

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

      {/* Answer Key Modal Component */}
      <Modal
        visible={showAnswerKeyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAnswerKeyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.answerKeyCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="key" size={20} color="#10B981" style={{ marginRight: 8 }} />
                <Text style={styles.modalHeaderTitle}>Quiz Answer Key</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAnswerKeyModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.answerKeySubtitle}>
              {quiz.title} • {quiz.questions.length} Questions
            </Text>

            {/* Mode Switcher Pill */}
            <View style={styles.flashcardToggleRow}>
              <TouchableOpacity
                style={[styles.flashcardTab, !flashcardMode && styles.flashcardTabActive]}
                onPress={() => setFlashcardMode(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="list" size={13} color={!flashcardMode ? "#FFFFFF" : "#64748B"} style={{ marginRight: 4 }} />
                <Text style={[styles.flashcardTabText, !flashcardMode && styles.flashcardTabTextActive]}>List View</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.flashcardTab, flashcardMode && styles.flashcardTabActive]}
                onPress={() => setFlashcardMode(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="albums-outline" size={13} color={flashcardMode ? "#FFFFFF" : "#64748B"} style={{ marginRight: 4 }} />
                <Text style={[styles.flashcardTabText, flashcardMode && styles.flashcardTabTextActive]}>Flashcards Mode</Text>
              </TouchableOpacity>
            </View>

            {flashcardMode ? (
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {quiz.questions.map((q, qIdx) => {
                  const cardKey = q.id || `q_${qIdx}`;
                  const isRevealed = Boolean(revealedFlashcards[cardKey]);
                  const correctIdx = typeof q.correctAnswer === 'number' ? q.correctAnswer : parseInt(String(q.correctAnswer), 10) || 0;
                  const correctOptionText = q.options[correctIdx] || q.options[0];

                  return (
                    <View key={cardKey} style={styles.flashcardCard}>
                      <View style={styles.flashcardHeaderRow}>
                        <Text style={styles.flashcardBadgeText}>FLASHCARD {qIdx + 1}/{quiz.questions.length}</Text>
                        <Ionicons name="help-circle-outline" size={16} color="#6D44F2" />
                      </View>
                      <Text style={styles.flashcardQuestionText}>{q.prompt}</Text>

                      {isRevealed ? (
                        <View style={styles.flashcardAnswerBox}>
                          <View style={styles.flashcardCorrectHeader}>
                            <Ionicons name="checkmark-circle" size={16} color="#059669" style={{ marginRight: 6 }} />
                            <Text style={styles.flashcardCorrectTitle}>Answer: {OPTION_LETTERS[correctIdx]}. {correctOptionText}</Text>
                          </View>
                          {q.explanation ? (
                            <Text style={styles.flashcardExpText}>💡 {q.explanation}</Text>
                          ) : null}
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.revealAnswerBtn}
                          onPress={() => setRevealedFlashcards(prev => ({ ...prev, [cardKey]: true }))}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="sparkles" size={15} color="#6D44F2" style={{ marginRight: 6 }} />
                          <Text style={styles.revealAnswerBtnText}>Tap to Reveal Answer & Study Note</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {quiz.questions.map((q, qIdx) => {
                  const correctIdx = typeof q.correctAnswer === 'number' ? q.correctAnswer : parseInt(String(q.correctAnswer), 10) || 0;
                  return (
                    <View key={q.id || qIdx} style={styles.keyItemBox}>
                      <Text style={styles.keyQuestionTitle}>
                        Q{qIdx + 1}. {q.prompt}
                      </Text>
                      <View style={styles.keyOptionsCol}>
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = oIdx === correctIdx;
                          return (
                            <View
                              key={oIdx}
                              style={[
                                styles.keyOptRow,
                                isCorrect && styles.keyOptRowCorrect,
                              ]}
                            >
                              <Text style={[styles.keyOptLetter, isCorrect && { color: "#059669", fontWeight: "700" }]}>
                                {OPTION_LETTERS[oIdx]}. {opt}
                              </Text>
                              {isCorrect && (
                                <View style={styles.correctPill}>
                                  <Ionicons name="checkmark-circle" size={12} color="#059669" style={{ marginRight: 3 }} />
                                  <Text style={styles.correctPillText}>Correct Answer</Text>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                      {q.explanation ? (
                        <View style={styles.keyExpBox}>
                          <Text style={styles.keyExpText}>💡 {q.explanation}</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowAnswerKeyModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Close Answer Key</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── QUESTION QUICK NAVIGATION / TABLE VIEW MODAL ─── */}
      <Modal
        visible={showQuestionNavModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuestionNavModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.answerKeyCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="grid" size={20} color="#4648D4" style={{ marginRight: 8 }} />
                <Text style={styles.modalHeaderTitle}>Question Table View</Text>
              </View>
              <TouchableOpacity onPress={() => setShowQuestionNavModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.answerKeySubtitle}>
              Tap any question card below to skip and switch tabs instantly:
            </Text>

            <ScrollView style={{ maxHeight: 400, marginTop: 4 }} showsVerticalScrollIndicator={false}>
              <View style={styles.navGridContainer}>
                {quiz.questions.map((q, idx) => {
                  const isCurrent = idx === currentQuestionIndex;
                  const isAnswered = userAnswers[q.id] !== undefined;

                  return (
                    <TouchableOpacity
                      key={q.id || idx}
                      style={[
                        styles.navGridCard,
                        isCurrent && styles.navGridCardCurrent,
                        isAnswered && !isCurrent && styles.navGridCardAnswered,
                      ]}
                      onPress={() => {
                        triggerHaptic.light();
                        setCurrentQuestionIndex(idx);
                        setIsEditing(false);
                        setShowQuestionNavModal(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.navCardHeaderRow}>
                        <View style={[styles.navQBadge, isCurrent && styles.navQBadgeCurrent]}>
                          <Text style={[styles.navQBadgeText, isCurrent && styles.navQBadgeTextCurrent]}>
                            Q{idx + 1}
                          </Text>
                        </View>
                        {isCurrent ? (
                          <View style={styles.statusPillActive}>
                            <Text style={styles.statusTextActive}>ACTIVE</Text>
                          </View>
                        ) : isAnswered ? (
                          <View style={styles.statusPillDone}>
                            <Ionicons name="checkmark-circle" size={12} color="#059669" style={{ marginRight: 2 }} />
                            <Text style={styles.statusTextDone}>Done</Text>
                          </View>
                        ) : (
                          <View style={styles.statusPillPending}>
                            <Text style={styles.statusTextPending}>Pending</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.navQPromptPreview} numberOfLines={2}>
                        {q.prompt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowQuestionNavModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Close Navigator</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rename Quiz Title Modal Component */}
      <Modal
        visible={showRenameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.renameCard}>
            <Text style={styles.modalHeaderTitle}>Rename Quiz Title</Text>
            <Text style={styles.answerKeySubtitle}>Enter a new title to update across all devices & Firestore:</Text>

            <TextInput
              style={styles.renameInput}
              value={renameTitleInput}
              onChangeText={setRenameTitleInput}
              placeholder="Quiz Title"
              placeholderTextColor="#94A3B8"
              autoFocus
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowRenameModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleSaveRenameQuiz}
                disabled={renaming}
              >
                {renaming ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>Save Title</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── 3-DOTS SETTINGS MENU MODAL ─── */}
      <Modal
        visible={showSettingsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettingsMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSettingsMenu(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.settingsMenuCard}>
            <View style={styles.settingsMenuHeader}>
              <Text style={styles.settingsMenuTitle}>Quiz Options</Text>
              <TouchableOpacity
                onPress={() => setShowSettingsMenu(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Function 1: Answer Key */}
            <TouchableOpacity
              style={styles.menuOptionRow}
              onPress={() => {
                triggerHaptic.light();
                setShowSettingsMenu(false);
                setShowAnswerKeyModal(true);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.menuOptionIconBox, { backgroundColor: "#ECFDF5" }]}>
                <Ionicons name="key-outline" size={18} color="#059669" />
              </View>
              <View style={styles.menuOptionTextCol}>
                <Text style={styles.menuOptionTitle}>Answer Key</Text>
                <Text style={styles.menuOptionSub}>View correct answers & study notes</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </TouchableOpacity>

            {/* Function 2: Edit Question */}
            <TouchableOpacity
              style={styles.menuOptionRow}
              onPress={() => {
                triggerHaptic.selection();
                setShowSettingsMenu(false);
                setIsEditing(!isEditing);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.menuOptionIconBox, { backgroundColor: "#F5F3FF" }]}>
                <Ionicons
                  name={isEditing ? "eye-outline" : "create-outline"}
                  size={18}
                  color="#6D44F2"
                />
              </View>
              <View style={styles.menuOptionTextCol}>
                <Text style={styles.menuOptionTitle}>
                  {isEditing ? "Preview Question" : "Edit Question"}
                </Text>
                <Text style={styles.menuOptionSub}>
                  {isEditing ? "Switch back to preview mode" : "Customize question prompt and choices"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </TouchableOpacity>

            {/* Function 3: Export Quiz */}
            <TouchableOpacity
              style={[styles.menuOptionRow, { borderBottomWidth: 0 }]}
              onPress={() => {
                triggerHaptic.light();
                setShowSettingsMenu(false);
                setShowExportModal(true);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.menuOptionIconBox, { backgroundColor: "#EEF2FF" }]}>
                <Ionicons name="download-outline" size={18} color="#4648D4" />
              </View>
              <View style={styles.menuOptionTextCol}>
                <Text style={styles.menuOptionTitle}>Export Quiz</Text>
                <Text style={styles.menuOptionSub}>Download as PDF, DOCX, or PPTX</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
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
  threeDotsBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsMenuCard: {
    width: "88%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 10,
  },
  settingsMenuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  settingsMenuTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  menuOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  menuOptionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuOptionTextCol: {
    flex: 1,
  },
  menuOptionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  menuOptionSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
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
    minWidth: 0,
    fontSize: 14,
    fontWeight: "500",
    color: "#0F172A",
    paddingVertical: 6,
    marginRight: 4,
  },
  optionRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
  },
  correctCheckBtn: {
    paddingHorizontal: 2,
  },
  correctBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 8,
    gap: 3,
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
    padding: 3,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  answerKeyCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  answerKeySubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 14,
  },
  keyItemBox: {
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  keyQuestionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  keyOptionsCol: {
    gap: 4,
  },
  keyOptRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  keyOptRowCorrect: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  keyOptLetter: {
    fontSize: 13,
    color: "#334155",
  },
  correctPill: {
    flexDirection: "row",
    alignItems: "center",
  },
  correctPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  keyExpBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#FFFBEB",
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
    borderRadius: 6,
  },
  keyExpText: {
    fontSize: 12,
    color: "#78350F",
  },
  modalCloseBtn: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    alignItems: "center",
  },
  modalCloseBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  renameCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
  },
  renameInput: {
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0F172A",
    marginBottom: 18,
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  cancelBtnText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },
  confirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "#4F46E5",
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  /* ─── Question Table Navigator Modal Styles ─── */
  navGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingVertical: 6,
  },
  navGridCard: {
    width: "48%",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: 12,
  },
  navGridCardCurrent: {
    backgroundColor: "#F5F3FF",
    borderColor: "#4648D4",
    shadowColor: "#4648D4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  navGridCardAnswered: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  navCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  navQBadge: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  navQBadgeCurrent: {
    backgroundColor: "#4648D4",
  },
  navQBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
  },
  navQBadgeTextCurrent: {
    color: "#FFFFFF",
  },
  statusPillActive: {
    backgroundColor: "#4648D4",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusTextActive: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  statusPillDone: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusTextDone: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  statusPillPending: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusTextPending: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
  },
  navQPromptPreview: {
    fontSize: 12,
    color: "#334155",
    lineHeight: 16,
    fontWeight: "500",
  },
  flashcardToggleRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  flashcardTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    borderRadius: 9,
  },
  flashcardTabActive: {
    backgroundColor: "#6D44F2",
  },
  flashcardTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  flashcardTabTextActive: {
    color: "#FFFFFF",
  },
  flashcardCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  flashcardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  flashcardBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#6D44F2",
    letterSpacing: 0.5,
  },
  flashcardQuestionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 20,
    marginBottom: 12,
  },
  revealAnswerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F3FF",
    borderWidth: 1.5,
    borderColor: "#DDD6FE",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  revealAnswerBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6D44F2",
  },
  flashcardAnswerBox: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 12,
    padding: 12,
  },
  flashcardCorrectHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  flashcardCorrectTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#059669",
    flex: 1,
  },
  flashcardExpText: {
    fontSize: 12,
    color: "#047857",
    marginTop: 6,
    lineHeight: 16,
  },
});