import React, { useState, useRef } from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  PanResponder,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { RootStackParamList } from "../../types/navigation";
import { useAuth } from "../../context/AuthContext";
import { useQuiz } from "../../context/QuizContext";
import { Difficulty, QuestionType } from "../../types/quiz";
import BottomNav from "../../components/common/BottomNav";
import { BellIcon, ProfilePersonIcon } from "../../components/common/TopBar";
import HeadWithGearIcon from "../../components/common/HeadWithGearIcon";
import THEME from "../../config/theme";

export default function UploadQuiz() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { generateQuizWithAI, startQuiz } = useQuiz();

  const [title, setTitle] = useState("Cell Biology: Structure & Function");
  const [sourceText, setSourceText] = useState("");
  const [questionCount, setQuestionCount] = useState(20);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>([
    "multiple_choice",
    "true_false",
  ]);
  const [generating, setGenerating] = useState(false);

  // Draggable Slider logic (5 to 20 questions)
  const minQuestions = 5;
  const maxQuestions = 20;
  const [sliderWidth, setSliderWidth] = useState(300);
  const sliderWidthRef = useRef(300);
  sliderWidthRef.current = sliderWidth;

  const startX = useRef(0);
  const startCount = useRef(questionCount);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        startX.current = evt.nativeEvent.pageX;
        startCount.current = questionCount;
        if (evt.nativeEvent.locationX !== undefined && sliderWidthRef.current > 0) {
          const ratio = Math.max(0, Math.min(1, evt.nativeEvent.locationX / sliderWidthRef.current));
          const val = Math.round(minQuestions + ratio * (maxQuestions - minQuestions));
          setQuestionCount(val);
          startCount.current = val;
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const width = sliderWidthRef.current || 280;
        const deltaRatio = gestureState.dx / width;
        const deltaVal = deltaRatio * (maxQuestions - minQuestions);
        const nextVal = Math.round(Math.max(minQuestions, Math.min(maxQuestions, startCount.current + deltaVal)));
        setQuestionCount(nextVal);
      },
    })
  ).current;

  const sliderProgress = Math.max(0, Math.min(1, (questionCount - minQuestions) / (maxQuestions - minQuestions)));

  const toggleType = (type: QuestionType) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter((t) => t !== type));
      }
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const generated = await generateQuizWithAI({
        title: title.trim() || "Cell Biology Quiz",
        topicOrDocumentText: sourceText.trim() || title.trim() || "Cell Biology, Organelles, and Cellular Respiration",
        count: questionCount,
        difficulty,
        questionTypes: selectedTypes,
      });
      startQuiz(generated);
      navigation.navigate("QuizTaking", { quizId: generated.id });
    } catch (e: any) {
      alert("Error generating quiz: " + (e.message || "Please check connection"));
    } finally {
      setGenerating(false);
    }
  };

  const getDifficultyIcon = (d: Difficulty) => {
    switch (d) {
      case "easy": return "happy-outline";
      case "medium": return "scale-balance";
      case "hard": return "flame-outline";
    }
  };

  const getDifficultyActiveColor = (d: Difficulty) => {
    switch (d) {
      case "easy": return "#FFD54F";
      case "medium": return "#FFA726";
      case "hard": return "#FF7043";
    }
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
      {/* Top Nav Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={THEME.colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.bellBtn}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("Achievements")}
          >
            <BellIcon size={24} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => navigation.navigate("ProfileSetiing")}
            activeOpacity={0.85}
          >
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatarBtnImage} />
            ) : (
              <ProfilePersonIcon size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Page Title */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Create a Quiz</Text>
          <Text style={styles.pageSubtitle}>
            Upload source materials or customize prompts for generative synthesis.
          </Text>
        </View>

        <View style={styles.contentWrapper}>
          {/* ─── Source Document ─── */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.sectionLabel}>Source Document</Text>
              <Text style={styles.optionalTag}>Optional</Text>
            </View>

            <TouchableOpacity style={styles.uploadZone} activeOpacity={0.7}>
              <View style={styles.uploadIconCircle}>
                <Ionicons name="cloud-upload-outline" size={28} color={THEME.colors.primary} />
              </View>
              <Text style={styles.uploadTitle}>Tap to upload a document</Text>
              <Text style={styles.uploadMeta}>PDF, PPT or PPTX · up to 10MB</Text>
            </TouchableOpacity>
          </View>

          {/* ─── Quiz Title ─── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Quiz title</Text>
            <View style={styles.titleInput}>
              <TextInput
                style={styles.titleInputText}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Cell Biology: Structure & Function"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* ─── Number of Questions (Scrollable / Draggable Bar in 20) ─── */}
          <View style={styles.section}>
            <View style={styles.questionCountHeader}>
              <View style={styles.questionCountLeft}>
                <Ionicons name="list-outline" size={20} color={THEME.colors.textPrimary} />
                <Text style={styles.questionCountLabel}>Number of questions</Text>
              </View>
              <Text style={styles.questionCountValue}>{questionCount}</Text>
            </View>

            {/* Draggable Slider Bar */}
            <View
              style={styles.sliderContainer}
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 0) setSliderWidth(w);
              }}
              {...panResponder.panHandlers}
            >
              <View style={styles.sliderTrack}>
                <LinearGradient
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  colors={["#4648D4", "#6063EE", "#8B5CF6"]}
                  style={[styles.sliderFill, { width: `${sliderProgress * 100}%` }]}
                />
              </View>

              {/* Draggable Thumb Knob */}
              <View
                style={[
                  styles.sliderThumb,
                  { left: `${sliderProgress * 100}%` },
                ]}
              >
                <View style={styles.sliderThumbInner} />
              </View>
            </View>

            {/* Slider Scale Labels */}
            <View style={styles.sliderScaleRow}>
              {[5, 10, 15, 20].map((val) => (
                <TouchableOpacity
                  key={val}
                  onPress={() => setQuestionCount(val)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text
                    style={[
                      styles.sliderScaleText,
                      questionCount === val && styles.sliderScaleTextActive,
                    ]}
                  >
                    {val === 20 ? "20 max" : val === 5 ? "5 min" : `${val}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ─── Difficulty Level ─── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Difficulty level</Text>
            <View style={styles.difficultyRow}>
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => {
                const isActive = difficulty === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.diffPill,
                      isActive && styles.diffPillActive,
                    ]}
                    onPress={() => setDifficulty(d)}
                    activeOpacity={0.8}
                  >
                    {d === "medium" ? (
                      <MaterialCommunityIcons
                        name="scale-balance"
                        size={18}
                        color={isActive ? getDifficultyActiveColor(d) : THEME.colors.textSecondary}
                        style={styles.diffIcon}
                      />
                    ) : (
                      <Ionicons
                        name={getDifficultyIcon(d) as any}
                        size={18}
                        color={isActive ? getDifficultyActiveColor(d) : THEME.colors.textSecondary}
                        style={styles.diffIcon}
                      />
                    )}
                    <Text
                      style={[
                        styles.diffPillText,
                        isActive && styles.diffPillTextActive,
                      ]}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ─── Question Types ─── */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.sectionLabel}>Question types</Text>
              <Text style={styles.optionalTag}>Select all that apply</Text>
            </View>
            <View style={styles.typesRow}>
              {([
                { key: "multiple_choice" as QuestionType, label: "Multiple choice" },
                { key: "true_false" as QuestionType, label: "True / False" },
                { key: "enumeration" as QuestionType, label: "Enumeration" },
              ]).map(({ key, label }) => {
                const isActive = selectedTypes.includes(key);
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.typeChip, isActive && styles.typeChipActive]}
                    onPress={() => toggleType(key)}
                    activeOpacity={0.7}
                  >
                    {isActive ? (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" style={styles.chipIcon} />
                    ) : (
                      <Ionicons name="add" size={16} color={THEME.colors.textSecondary} style={styles.chipIcon} />
                    )}
                    <Text
                      style={[styles.typeChipText, isActive && styles.typeChipTextActive]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ─── Info Card ─── */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="bulb-outline" size={20} color={THEME.colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Heath is important</Text>
              <Text style={styles.infoText}>
                Questions incorporate conceptual clarity checks, diagram interpretations, and real-world clinical applications.
              </Text>
            </View>
          </View>

          {/* ─── Generate Button ─── */}
          <TouchableOpacity
            style={[styles.generateBtn, generating && styles.generateBtnDisabled]}
            onPress={handleGenerate}
            disabled={generating}
            activeOpacity={0.85}
          >
            <LinearGradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              colors={["#4648D4", "#6063EE", "#8455EF"]}
              style={styles.generateGradient}
            >
              {generating ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.generateText}>Generating with Gemini AI...</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                  <Text style={styles.generateText}>Generate quiz</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomNav activeTab="Create" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  /* ── Top Navigation Bar ── */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 52,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bellBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3B46E6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3B46E6",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
    overflow: "hidden",
  },
  avatarBtnImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },

  /* ── Page Title ── */
  scrollContent: {
    paddingBottom: 24,
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },

  /* ── Content ── */
  contentWrapper: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
  },
  optionalTag: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: "500",
    fontStyle: "italic",
  },

  /* ── Upload Zone ── */
  uploadZone: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    borderStyle: "dashed",
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: "#FAFAFF",
  },
  uploadIconCircle: {
    marginBottom: 12,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  uploadMeta: {
    fontSize: 13,
    color: THEME.colors.textMuted,
  },

  /* ── Quiz Title Input ── */
  titleInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E4DFFF",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    marginTop: 8,
  },
  titleInputText: {
    flex: 1,
    fontSize: 15,
    color: THEME.colors.textPrimary,
    fontWeight: "500",
  },

  /* ── Number of Questions ── */
  questionCountHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    marginBottom: 14,
  },
  questionCountLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  questionCountLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
  },
  questionCountValue: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME.colors.primary,
  },

  /* ── Draggable Continuous Slider ── */
  sliderContainer: {
    position: "relative",
    height: 38,
    justifyContent: "center",
    marginBottom: 8,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: "#EDE9FE",
    borderRadius: 4,
    overflow: "hidden",
  },
  sliderFill: {
    height: "100%",
    borderRadius: 4,
  },
  sliderThumb: {
    position: "absolute",
    top: 3,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4648D4",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -16,
    shadowColor: "#4648D4",
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
  sliderThumbInner: {
    width: 0,
    height: 0,
  },
  sliderScaleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    marginTop: 4,
  },
  sliderScaleText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: "600",
  },
  sliderScaleTextActive: {
    color: "#4648D4",
    fontWeight: "800",
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  sliderLabelText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: "500",
    fontStyle: "italic",
  },

  /* ── Difficulty Level ── */
  difficultyRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  diffPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 9999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  diffPillActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  diffIcon: {
    marginRight: 6,
  },
  diffPillText: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
  },
  diffPillTextActive: {
    color: "#FFFFFF",
  },

  /* ── Question Type Chips ── */
  typesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 9999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  typeChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  chipIcon: {
    marginRight: 6,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.colors.textSecondary,
  },
  typeChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  /* ── Info Card ── */
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#FAFAFF",
    borderWidth: 1,
    borderColor: "#EAE5FF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
    alignItems: "flex-start",
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0EBFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 19,
    color: THEME.colors.textSecondary,
  },

  /* ── Quiz Timer Styles ── */
  timerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timerBadge: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  timerBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4338CA",
  },
  timerPresetsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
  },
  timerChip: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F8F9FD",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  timerChipActive: {
    backgroundColor: "#4648D4",
    borderColor: "#4648D4",
    shadowColor: "#4648D4",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  timerChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  timerChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  timerStepperCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FE",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 6,
    marginBottom: 8,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  stepperBtnDisabled: {
    opacity: 0.4,
    backgroundColor: "#F3F4F6",
  },
  stepperDisplay: {
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValueText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1B1931",
  },
  stepperUnitText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 1,
  },
  timerHintText: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
    paddingHorizontal: 2,
  },

  /* ── Generate Button ── */
  generateBtn: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: THEME.colors.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 16,
  },
  generateBtnDisabled: {
    opacity: 0.65,
  },
  generateGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 17,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  generateText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 10,
  },
});