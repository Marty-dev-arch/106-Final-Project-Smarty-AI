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
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { RootStackParamList } from "../../types/navigation";
import { useAuth } from "../../context/AuthContext";
import { useQuiz } from "../../context/QuizContext";
import { useTheme } from "../../context/ThemeContext";
import { useNotifications } from "../../context/NotificationContext";
import { Difficulty, QuestionType } from "../../types/quiz";
import BottomNav from "../../components/common/BottomNav";
import TabSlideWrapper from "../../components/common/TabSlideWrapper";
import { BellIcon, ProfilePersonIcon } from "../../components/common/TopBar";
import NotificationDropdown from "../../components/common/NotificationDropdown";
import BrainSpinner from "../../components/common/BrainSpinner";
import THEME from "../../config/theme";
import { documentExtractor, SlideBlock } from "../../utils/documentExtractor";

interface UploadedFileInfo {
  name: string;
  size?: string;
  content?: string;
}

export default function UploadQuiz() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { generateQuizWithAI, startQuiz } = useQuiz();
  const { colors, isDark } = useTheme();
  const { unreadCount, toggleDropdown } = useNotifications();

  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<UploadedFileInfo | null>(null);
  const [uploadedSlides, setUploadedSlides] = useState<SlideBlock[] | undefined>(undefined);
  const [questionCount, setQuestionCount] = useState(10);
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

  // Web / Native file picker implementation
  const handlePickDocument = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.ppt,.pptx,.doc,.docx,.txt,.md';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const extractedDoc = await documentExtractor.extractTextFromFile(file);
          const baseName = extractedDoc.fileName.replace(/\.[^/.]+$/, "");
          if (!title.trim()) {
            // Use the first slide title if available, otherwise the filename
            const derivedTitle =
              (extractedDoc.slides?.[0]?.title || baseName)
                .replace(/\b\d+\s*slides\b/gi, '')
                .trim();
            setTitle(derivedTitle || baseName);
          }

          setSourceText(extractedDoc.text);
          setUploadedSlides(extractedDoc.slides && extractedDoc.slides.length > 0 ? extractedDoc.slides : undefined);
          setUploadedFile({
            name: extractedDoc.fileName,
            size: extractedDoc.size,
            content: extractedDoc.text,
          });
        }
      };
      input.click();
    } else {
      Alert.alert("Document Picker", "Simulating document selection...", [
        {
          text: "Select Sample PDF",
          onPress: () => {
            setTitle("Cell Biology & Organelles");
            setSourceText("Mitochondria generate ATP. Ribosomes synthesize proteins. Golgi modifies proteins.");
            setUploadedFile({
              name: "Cell_Biology_Notes.pdf",
              size: "1.8 MB",
              content: "Cell biology notes and organelle respiration",
            });
          },
        },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const handleRemoveDocument = () => {
    setUploadedFile(null);
    setSourceText("");
    setUploadedSlides(undefined);
  };

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
    const hasDocument = Boolean(uploadedFile || sourceText.trim());
    const hasTopic = Boolean(title.trim());

    if (!hasDocument && !hasTopic) {
      Alert.alert(
        "Document or Topic Required",
        "Please upload a document (PDF, PPT, TXT) or enter a quiz topic title before generating."
      );
      return;
    }

    setGenerating(true);
    try {
      const promptPayload = sourceText.trim() || uploadedFile?.name || title.trim();
      const generated = await generateQuizWithAI({
        title: title.trim() || uploadedFile?.name?.replace(/\.[^/.]+$/, "") || "Custom AI Quiz",
        topicOrDocumentText: promptPayload,
        slides: uploadedSlides,
        count: questionCount,
        difficulty,
        questionTypes: selectedTypes,
      });
      setGenerating(false);
      startQuiz(generated);
      navigation.navigate("QuizTaking", { quizId: generated.id });
    } catch (e: any) {
      setGenerating(false);
      Alert.alert("Error", "Failed to generate quiz: " + (e.message || "Please check connection"));
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
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Brain Spinner Overlay during Generation */}
      {generating && (
        <BrainSpinner
          fullScreen
          size={84}
          message="Synthesizing quiz with Gemini AI..."
        />
      )}

      {/* Top Nav Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.bellBtn}
            activeOpacity={0.7}
            onPress={toggleDropdown}
          >
            <BellIcon size={24} color={colors.text} />
            {unreadCount > 0 && (
              <View style={styles.bellBadgeDot}>
                {unreadCount > 1 && (
                  <Text style={styles.bellBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                )}
              </View>
            )}
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

      <TabSlideWrapper>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Page Title */}
        <View style={styles.titleSection}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Create a Quiz</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            Upload source materials or customize prompts for generative synthesis.
          </Text>
        </View>

        <View style={styles.contentWrapper}>
          {/* ─── Source Document Upload ─── */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Source Document</Text>
              <Text style={[styles.optionalTag, { color: colors.textMuted }]}>Optional</Text>
            </View>

            {uploadedFile ? (
              <View style={[styles.uploadedCard, { backgroundColor: isDark ? "#1E293B" : "#F5F3FF", borderColor: isDark ? "#6366F1" : "#6D44F2" }]}>
                <View style={[styles.fileIconCircle, { backgroundColor: isDark ? "#0F172A" : "#FFFFFF" }]}>
                  <Ionicons name="document-text" size={24} color="#6D44F2" />
                </View>
                <View style={styles.fileInfoCol}>
                  <Text style={[styles.fileNameText, { color: colors.text }]} numberOfLines={1}>{uploadedFile.name}</Text>
                  <Text style={styles.fileMetaText}>{uploadedFile.size || "Active Document"}</Text>
                </View>
                <TouchableOpacity onPress={handleRemoveDocument} style={styles.removeFileBtn}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.uploadZone,
                  {
                    backgroundColor: isDark ? "#1E293B" : "#F5F3FF",
                    borderColor: isDark ? "#6366F1" : "#6D44F2",
                  },
                ]}
                onPress={handlePickDocument}
                activeOpacity={0.7}
              >
                <View style={[styles.uploadIconCircle, { backgroundColor: isDark ? "#0F172A" : "#FFFFFF" }]}>
                  <Ionicons name="cloud-upload-outline" size={28} color={THEME.colors.primary} />
                </View>
                <Text style={[styles.uploadTitle, { color: colors.text }]}>Tap to upload a document</Text>
                <Text style={[styles.uploadMeta, { color: colors.textSecondary }]}>PDF, PPT, PPTX or TXT · up to 10MB</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ─── Quiz Title ─── */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Quiz title or topic</Text>
            <View style={[styles.titleInput, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <TextInput
                style={[styles.titleInputText, { color: colors.text }]}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Cell Biology: Structure & Function"
                placeholderTextColor={isDark ? "#64748B" : "#9CA3AF"}
              />
            </View>
          </View>

          {/* ─── Number of Questions Slider ─── */}
          <View style={styles.section}>
            <View style={styles.questionCountHeader}>
              <View style={styles.questionCountLeft}>
                <Ionicons name="list-outline" size={20} color={colors.text} />
                <Text style={[styles.questionCountLabel, { color: colors.text }]}>Number of questions</Text>
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
              <View style={[styles.sliderTrack, { backgroundColor: isDark ? "#334155" : "#E5E7EB" }]}>
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
                      { color: isDark ? "#94A3B8" : "#9CA3AF" },
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
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Difficulty level</Text>
            <View style={styles.difficultyRow}>
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => {
                const isActive = difficulty === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.diffPill,
                      { backgroundColor: isDark ? "#1E293B" : "#F3F4F6" },
                      isActive && styles.diffPillActive,
                    ]}
                    onPress={() => setDifficulty(d)}
                    activeOpacity={0.8}
                  >
                    {d === "medium" ? (
                      <MaterialCommunityIcons
                        name="scale-balance"
                        size={18}
                        color={isActive ? getDifficultyActiveColor(d) : colors.textSecondary}
                        style={styles.diffIcon}
                      />
                    ) : (
                      <Ionicons
                        name={getDifficultyIcon(d) as any}
                        size={18}
                        color={isActive ? getDifficultyActiveColor(d) : colors.textSecondary}
                        style={styles.diffIcon}
                      />
                    )}
                    <Text
                      style={[
                        styles.diffPillText,
                        { color: colors.textSecondary },
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
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Question types</Text>
              <Text style={[styles.optionalTag, { color: colors.textMuted }]}>Select all that apply</Text>
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
                    style={[
                      styles.typeChip,
                      { backgroundColor: isDark ? "#1E293B" : "#F3F4F6" },
                      isActive && styles.typeChipActive,
                    ]}
                    onPress={() => toggleType(key)}
                    activeOpacity={0.7}
                  >
                    {isActive ? (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" style={styles.chipIcon} />
                    ) : (
                      <Ionicons name="add" size={16} color={colors.textSecondary} style={styles.chipIcon} />
                    )}
                    <Text
                      style={[
                        styles.typeChipText,
                        { color: colors.textSecondary },
                        isActive && styles.typeChipTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ─── Input Helper Hint ─── */}
          {!uploadedFile && !sourceText.trim() && !title.trim() && (
            <View style={[styles.hintContainer, { backgroundColor: isDark ? "#1E293B" : "#F3F4F6" }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>Upload a document or enter a topic title above to generate.</Text>
            </View>
          )}

          {/* ─── Generate Button ─── */}
          <TouchableOpacity
            style={[
              styles.generateBtn,
              (!uploadedFile && !sourceText.trim() && !title.trim()) && styles.generateBtnDimmed,
              generating && styles.generateBtnDisabled,
            ]}
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
                  <Text style={styles.generateText}>Generate Quiz</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </TabSlideWrapper>

      <BottomNav activeTab="Create" />
      <NotificationDropdown />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
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
    position: "relative",
  },
  bellBadgeDot: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  bellBadgeText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3B46E6",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    overflow: "hidden",
  },
  avatarBtnImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
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
    color: "#111827",
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  contentWrapper: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  optionalTag: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  uploadZone: {
    borderWidth: 2,
    borderColor: "#6D44F2",
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F3FF",
  },
  uploadIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    elevation: 2,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  uploadMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  uploadedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    borderWidth: 1.5,
    borderColor: "#6D44F2",
    borderRadius: 16,
    padding: 14,
  },
  fileIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  fileInfoCol: {
    flex: 1,
  },
  fileNameText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  fileMetaText: {
    fontSize: 12,
    color: "#6D44F2",
    marginTop: 2,
  },
  removeFileBtn: {
    padding: 8,
  },
  titleInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  titleInputText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  questionCountHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  questionCountLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  questionCountLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  questionCountValue: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME.colors.primary,
  },
  sliderContainer: {
    height: 32,
    justifyContent: "center",
    marginVertical: 6,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  sliderFill: {
    height: "100%",
    borderRadius: 4,
  },
  sliderThumb: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.colors.primary,
    marginLeft: -12,
    top: 4,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  sliderThumbInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  sliderScaleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  sliderScaleText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  sliderScaleTextActive: {
    color: THEME.colors.primary,
    fontWeight: "700",
  },
  difficultyRow: {
    flexDirection: "row",
    gap: 10,
  },
  diffPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  diffPillActive: {
    backgroundColor: THEME.colors.primary,
  },
  diffIcon: {
    marginRight: 6,
  },
  diffPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  diffPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  typesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  typeChipActive: {
    backgroundColor: THEME.colors.primary,
  },
  chipIcon: {
    marginRight: 6,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  typeChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  generateBtn: {
    marginTop: 10,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
  },
  generateBtnDimmed: {
    opacity: 0.65,
  },
  generateBtnDisabled: {
    opacity: 0.7,
  },
  hintContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    backgroundColor: "#F3F4F6",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  hintText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  generateGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  generateText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});