import React, { useState, useRef, useEffect } from "react";
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
  Modal,
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
import { documentExtractor, SlideBlock, uint8ArrayToBase64, isReadableText } from "../../utils/documentExtractor";
import { triggerHaptic } from "../../utils/haptics";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { uploadDocumentToCloudinary } from "../../services/cloudinaryService";

function decodeBase64ToUint8Array(base64: string): Uint8Array {
  if (typeof atob !== "undefined") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, "");
  const len = clean.length;
  let validLen = len;
  if (clean.endsWith("==")) validLen -= 2;
  else if (clean.endsWith("=")) validLen -= 1;
  const byteLen = Math.floor((validLen * 3) / 4);
  const bytes = new Uint8Array(byteLen);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const enc1 = chars.indexOf(clean.charAt(i));
    const enc2 = chars.indexOf(clean.charAt(i + 1));
    const enc3 = chars.indexOf(clean.charAt(i + 2));
    const enc4 = chars.indexOf(clean.charAt(i + 3));
    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;
    if (p < byteLen) bytes[p++] = chr1;
    if (enc3 !== 64 && enc3 !== -1 && p < byteLen) bytes[p++] = chr2;
    if (enc4 !== 64 && enc4 !== -1 && p < byteLen) bytes[p++] = chr3;
  }
  return bytes;
}

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
  const [rawFile, setRawFile] = useState<File | null>(null); // raw File for Cloudinary upload
  const [pdfBase64, setPdfBase64] = useState<string | undefined>(undefined);
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>(
    (user?.defaultDifficulty || "Medium").toLowerCase() as Difficulty
  );
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>([
    "multiple_choice",
    "true_false",
  ]);
  const [generating, setGenerating] = useState(false);
  const [showUploadSuccessModal, setShowUploadSuccessModal] = useState(false);
  const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState(false);

  useEffect(() => {
    if (user?.defaultDifficulty) {
      setDifficulty(user.defaultDifficulty.toLowerCase() as Difficulty);
    }
  }, [user?.defaultDifficulty]);

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
  const handlePickDocument = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.ppt,.pptx,.doc,.docx,.txt,.md';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const extractedDoc = await documentExtractor.extractTextFromFile(file);
          const baseName = extractedDoc.fileName.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim();
          let derivedTitle = baseName;
          if (extractedDoc.slides && extractedDoc.slides.length > 0) {
            for (const s of extractedDoc.slides) {
              const t = s.title?.trim();
              if (t && isReadableText(t) && t.length > 3 && t.length < 80) {
                derivedTitle = t.replace(/\b\d+\s*slides\b/gi, '').trim();
                break;
              }
            }
          }
          setTitle(derivedTitle || baseName);
          setSourceText(extractedDoc.text);
          setUploadedSlides(extractedDoc.slides && extractedDoc.slides.length > 0 ? extractedDoc.slides : undefined);
          setPdfBase64(extractedDoc.base64);
          setRawFile(file); // store raw File for Cloudinary
          setUploadedFile({
            name: extractedDoc.fileName,
            size: extractedDoc.size,
            content: extractedDoc.text,
          });
          setShowUploadSuccessModal(true);
          triggerHaptic.success();
        }
      };
      input.click();
    } else {
      // Native document picker for Android/iOS
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: [
            'application/pdf',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'text/markdown',
          ],
          copyToCacheDirectory: true,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) return;

        const asset = result.assets[0];
        const fileName = asset.name || 'document';
        const fileSize = asset.size
          ? (asset.size / (1024 * 1024)).toFixed(1) + ' MB'
          : 'Unknown';
        const ext = fileName.split('.').pop()?.toLowerCase() || '';

        let fileText = '';
        let extractedSlides: SlideBlock[] | undefined;

        if (asset.uri) {
          try {
            let buffer: ArrayBuffer | null = null;

            // 1. Primary method: fetch(asset.uri) delegates to Android native ContentResolver and bypasses permission locks
            try {
              const res = await fetch(asset.uri);
              if (['txt', 'md'].includes(ext)) {
                fileText = await res.text();
              } else {
                buffer = await res.arrayBuffer();
              }
            } catch (fetchErr) {
              console.warn('[UploadQuiz] fetch(uri) fallback needed:', fetchErr);
            }

            // 2. Fallback: FileSystem with copy to safe local directory if cache is locked
            if (!buffer && !fileText) {
              try {
                if (['txt', 'md'].includes(ext)) {
                  fileText = await FileSystem.readAsStringAsync(asset.uri, {
                    encoding: FileSystem.EncodingType.UTF8,
                  });
                } else {
                  const base64 = await FileSystem.readAsStringAsync(asset.uri, {
                    encoding: FileSystem.EncodingType.Base64,
                  });
                  buffer = decodeBase64ToUint8Array(base64).buffer as ArrayBuffer;
                }
              } catch (fsErr) {
                console.warn('[UploadQuiz] Direct FileSystem read failed, copying to safe local directory:', fsErr);
                const safeDest = `${FileSystem.documentDirectory || FileSystem.cacheDirectory}upload_${Date.now()}_${fileName}`;
                await FileSystem.copyAsync({ from: asset.uri, to: safeDest });
                if (['txt', 'md'].includes(ext)) {
                  fileText = await FileSystem.readAsStringAsync(safeDest, {
                    encoding: FileSystem.EncodingType.UTF8,
                  });
                } else {
                  const base64 = await FileSystem.readAsStringAsync(safeDest, {
                    encoding: FileSystem.EncodingType.Base64,
                  });
                  buffer = decodeBase64ToUint8Array(base64).buffer as ArrayBuffer;
                }
              }
            }

            let pdfBase64Data: string | undefined;
            if (ext === 'pdf') {
              if (buffer) {
                try {
                  pdfBase64Data = uint8ArrayToBase64(new Uint8Array(buffer));
                } catch (b64Err) {
                  console.warn('[UploadQuiz] In-memory base64 conversion notice:', b64Err);
                }
              } else if (asset.uri) {
                try {
                  pdfBase64Data = await FileSystem.readAsStringAsync(asset.uri, {
                    encoding: FileSystem.EncodingType.Base64,
                  });
                } catch (fsErr) {
                  console.warn('[UploadQuiz] Direct base64 read notice:', fsErr);
                }
              }
            }

            // 3. Extract structured text and slides from buffer
            if (buffer) {
              const extractedDoc = await documentExtractor.extractTextFromFile({
                name: fileName,
                size: asset.size,
                buffer: buffer,
              });
              fileText = extractedDoc.text;
              if (extractedDoc.slides && extractedDoc.slides.length > 0) {
                extractedSlides = extractedDoc.slides;
              }
              if (!pdfBase64Data && extractedDoc.base64) {
                pdfBase64Data = extractedDoc.base64;
              }
            }
            setPdfBase64(pdfBase64Data);
          } catch (readErr) {
            console.warn('[UploadQuiz] Failed reading file content on native:', readErr);
          }
        }

        const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
        let derivedTitle = baseName;
        if (extractedSlides && extractedSlides.length > 0) {
          for (const s of extractedSlides) {
            const t = s.title?.trim();
            if (t && isReadableText(t) && t.length > 3 && t.length < 80) {
              derivedTitle = t.replace(/\b\d+\s*slides\b/gi, '').trim();
              break;
            }
          }
        }

        setTitle(derivedTitle || baseName);
        setSourceText(fileText);
        setUploadedSlides(extractedSlides);
        setRawFile(null);
        setUploadedFile({
          name: fileName,
          size: fileSize,
          content: fileText || `Document: ${fileName}`,
        });

        // Trigger clean UI upload modal!
        setShowUploadSuccessModal(true);
        triggerHaptic.success();
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to pick document.');
      }
    }
  };

  const handleRemoveDocument = () => {
    setShowRemoveConfirmModal(true);
  };

  const confirmRemoveDocument = () => {
    setShowRemoveConfirmModal(false);
    triggerHaptic.medium();
    setUploadedFile(null);
    setRawFile(null);
    setPdfBase64(undefined);
    setSourceText("");
    setUploadedSlides(undefined);
    setTitle("");
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
      const quizTitle = title.trim() || uploadedFile?.name?.replace(/\.[^/.]+$/, "") || "Custom AI Quiz";

      // 1. Upload file to Cloudinary (non-blocking if it fails)
      let docUrl: string | undefined;
      if (rawFile) {
        try {
          docUrl = await uploadDocumentToCloudinary(rawFile, { folder: `smarty_docs/${user?.uid || 'guest'}` });
        } catch (uploadErr) {
          console.warn('[UploadQuiz] Cloudinary upload failed (continuing without URL):', uploadErr);
        }
      }

      // 2. Generate quiz from extracted content via Gemini AI
      const generated = await generateQuizWithAI({
        title: quizTitle,
        topicOrDocumentText: promptPayload,
        slides: uploadedSlides,
        count: questionCount,
        difficulty,
        questionTypes: selectedTypes,
        sourceDocName: uploadedFile?.name,
        sourceDocUrl: docUrl,
        pdfBase64,
      });

      // Clear uploaded file & topic state so form is fresh
      setUploadedFile(null);
      setRawFile(null);
      setPdfBase64(undefined);
      setSourceText("");
      setUploadedSlides(undefined);
      setTitle("");
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
                <TouchableOpacity onPress={handlePickDocument} style={styles.changeFileBtn} activeOpacity={0.7}>
                  <Ionicons name="swap-horizontal" size={18} color="#6D44F2" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleRemoveDocument} style={styles.removeFileBtn} activeOpacity={0.7}>
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
                { key: "enumeration" as QuestionType, label: "Fill in the blanks" },
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

      {/* ─── Upload Success Clean Modal ─── */}
      <Modal
        visible={showUploadSuccessModal && uploadedFile !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUploadSuccessModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.cleanModalCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}>
            <View style={styles.modalUploadIconCircle}>
              <Ionicons name="cloud-done" size={32} color="#4F46E5" />
            </View>

            <Text style={[styles.modalTitle, { color: colors.text }]}>Document Uploaded!</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Smarty AI has successfully parsed your document and prepared the quiz workspace.
            </Text>

            <View style={[styles.modalFileBadge, { backgroundColor: isDark ? "#0F172A" : "#F3F4F6", borderColor: colors.cardBorder }]}>
              <Ionicons
                name={
                  uploadedFile?.name?.endsWith(".pdf")
                    ? "document-text"
                    : uploadedFile?.name?.endsWith(".ppt") || uploadedFile?.name?.endsWith(".pptx")
                    ? "easel"
                    : "document"
                }
                size={24}
                color="#6366F1"
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalFileName, { color: colors.text }]} numberOfLines={1}>
                  {uploadedFile?.name}
                </Text>
                <Text style={[styles.modalFileSize, { color: colors.textSecondary }]}>
                  {uploadedFile?.size} {uploadedSlides ? `• ${uploadedSlides.length} slides extracted` : "• Ready for AI"}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => {
                triggerHaptic.selection();
                setShowUploadSuccessModal(false);
              }}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={["#4648D4", "#6063EE", "#8455EF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalBtnGradient}
              >
                <Text style={styles.modalPrimaryBtnText}>Continue & Configure Quiz</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalSecondaryBtn}
              onPress={() => {
                setShowUploadSuccessModal(false);
                setTimeout(() => {
                  handlePickDocument();
                }, Platform.OS === "ios" ? 450 : 150);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalSecondaryBtnText, { color: colors.textSecondary }]}>Choose Different File</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Remove Document Confirmation Modal ─── */}
      <Modal
        visible={showRemoveConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRemoveConfirmModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.cleanModalCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}>
            <View style={styles.removeIconCircle}>
              <Ionicons name="trash-outline" size={32} color="#EF4444" />
            </View>

            <Text style={[styles.modalTitle, { color: colors.text }]}>Remove Document?</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Are you sure you want to detach "{uploadedFile?.name}"? You can re-upload or enter a topic manually.
            </Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: isDark ? "#334155" : "#F3F4F6" }]}
                onPress={() => setShowRemoveConfirmModal(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalRemoveBtn}
                onPress={confirmRemoveDocument}
                activeOpacity={0.85}
              >
                <Text style={styles.modalRemoveBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  changeFileBtn: {
    padding: 8,
    marginRight: 4,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  cleanModalCard: {
    width: "100%",
    maxWidth: 350,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalUploadIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  removeIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 18,
  },
  modalFileBadge: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },
  modalFileName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  modalFileSize: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  modalPrimaryBtn: {
    width: "100%",
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 10,
  },
  modalBtnGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalSecondaryBtn: {
    paddingVertical: 8,
  },
  modalSecondaryBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4B5563",
  },
  modalRemoveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  modalRemoveBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});