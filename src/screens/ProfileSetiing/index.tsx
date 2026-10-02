import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { RootStackParamList } from "../../types/navigation";
import { useAuth } from "../../context/AuthContext";
import { useTheme, ThemeMode } from "../../context/ThemeContext";
import { useQuiz } from "../../context/QuizContext";
import { uploadToCloudinary, CLOUDINARY_CONFIG } from "../../services/cloudinaryService";
import BottomNav from "../../components/common/BottomNav";

const ProfilePersonIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 18,
  color = "#FFFFFF",
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 11.5C14.07 11.5 15.75 9.82 15.75 7.75C15.75 5.68 14.07 4 12 4C9.93 4 8.25 5.68 8.25 7.75C8.25 9.82 9.93 11.5 12 11.5Z"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M5 20C5 16.5 8 14.5 12 14.5C16 14.5 19 16.5 19 20"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export type EditModalTab = "personal" | "security" | "appearance" | "language";

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English (US)", nativeName: "English", flag: "🇺🇸" },
  { code: "fil", name: "Filipino", nativeName: "Wikang Filipino", flag: "🇵🇭" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "zh", name: "Chinese (Simplified)", nativeName: "简体中文", flag: "🇨🇳" },
];

const LANGUAGE_STORAGE_KEY = "@smarty_ai_app_language";

export default function ProfileSetiing() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, signOut, updateAccountDetails, updateUser } = useAuth();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const { deleteAllQuizzesAndFiles, quizzes } = useQuiz();
  const profileQuizzesTaken = (user?.quizzesTaken ?? 0) === 0 || quizzes.length === 0 ? 0 : user?.quizzesTaken ?? 0;
  const profileAvgScore = profileQuizzesTaken === 0 ? 0 : user?.avgScore ?? 0;

  // Study Settings state (initialized from user profile in Firestore)
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">(user?.defaultDifficulty || "Medium");
  const [mistakeSync, setMistakeSync] = useState(user?.mistakeSync ?? true);
  const [streakReminder, setStreakReminder] = useState(user?.streakReminder ?? true);
  const [hapticFeedback, setHapticFeedback] = useState(user?.hapticFeedback ?? true);
  const [profileImage, setProfileImage] = useState<string | null>(user?.photoURL || null);

  useEffect(() => {
    if (user) {
      if (user.defaultDifficulty) setDifficulty(user.defaultDifficulty);
      if (user.mistakeSync !== undefined) setMistakeSync(user.mistakeSync);
      if (user.streakReminder !== undefined) setStreakReminder(user.streakReminder);
      if (user.hapticFeedback !== undefined) setHapticFeedback(user.hapticFeedback);
    }
  }, [user?.defaultDifficulty, user?.mistakeSync, user?.streakReminder, user?.hapticFeedback]);

  const handleSelectDifficulty = async (level: "Easy" | "Medium" | "Hard") => {
    setDifficulty(level);
    await updateUser({ defaultDifficulty: level });
  };

  const handleToggleMistakeSync = async (val: boolean) => {
    setMistakeSync(val);
    await updateUser({ mistakeSync: val });
  };

  const handleToggleStreakReminder = async (val: boolean) => {
    setStreakReminder(val);
    await updateUser({ streakReminder: val });
  };

  const handleToggleHapticFeedback = async (val: boolean) => {
    setHapticFeedback(val);
    await updateUser({ hapticFeedback: val });
  };

  // Real dynamic calculation for Daily Goal Progress
  const completedQuizzesCount = quizzes.filter((q) => q.bestScore !== undefined && q.bestScore !== null).length;
  const realQuizzesCompletedToday = (user?.quizzesTaken ?? 0) === 0 || quizzes.length === 0 ? 0 : completedQuizzesCount;
  const dailyGoalTarget = 2;
  const dailyGoalPercent = Math.min(100, Math.round((realQuizzesCompletedToday / dailyGoalTarget) * 100));

  // Language state
  const [currentLanguage, setCurrentLanguage] = useState<string>("en");

  // Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<EditModalTab>("personal");

  // Personal Info Form
  const [editName, setEditName] = useState(user?.displayName || "");
  const [editEmail, setEditEmail] = useState(user?.email || "");
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);

  // Security Form
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);

  // Feedback State
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Crop & Resize Modal State
  const [showCropModal, setShowCropModal] = useState(false);
  const [rawImageUri, setRawImageUri] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropRotation, setCropRotation] = useState(0);
  const [isProcessingCrop, setIsProcessingCrop] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Logout Modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Load language preference
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored) {
          setCurrentLanguage(stored);
        }
      } catch (e) {
        console.warn("Language loading error:", e);
      }
    })();
  }, []);

  useEffect(() => {
    if (user?.photoURL) {
      setProfileImage(user.photoURL);
    }
    if (user?.displayName) {
      setEditName(user.displayName);
    }
    if (user?.email) {
      setEditEmail(user.email);
    }
  }, [user]);

  // Entrance animation
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(18);

  useEffect(() => {
    contentOpacity.value = withTiming(1, {
      duration: 280,
      easing: Easing.out(Easing.quad),
    });
    contentTranslateY.value = withSpring(0, {
      damping: 22,
      stiffness: 300,
      mass: 0.8,
    });
  }, []);

  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const handleBack = () => {
    contentOpacity.value = withTiming(0, {
      duration: 200,
      easing: Easing.in(Easing.quad),
    });
    contentTranslateY.value = withTiming(
      14,
      { duration: 200, easing: Easing.in(Easing.quad) },
      (finished) => {
        if (finished) {
          runOnJS(navigation.goBack)();
        }
      }
    );
  };

  // Launch Image Picker (guaranteed to work across PC browsers & all iPhone/Android phone models)
  const pickImage = async () => {
    try {
      // 1. Web & Mobile Web fallback (iPhone Safari/Chrome, Android Chrome, PC browsers)
      if (Platform.OS === "web") {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              const resultUri = reader.result as string;
              setRawImageUri(resultUri);
              setCropZoom(1);
              setCropRotation(0);
              setShowEditModal(false);
              setShowCropModal(true);
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
        return;
      }

      // 2. Native Mobile App (iOS / Android Expo)
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Needed", "Please allow photo library access to change your profile picture.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const selectedUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        setRawImageUri(selectedUri);
        setCropZoom(1);
        setCropRotation(0);
        setShowEditModal(false);
        setShowCropModal(true);
      }
    } catch (err: any) {
      console.warn("Pick image error:", err);
      Alert.alert("Upload Notice", err.message || "Failed to select photo.");
    }
  };

  // Confirm Crop & Resize, upload to Cloudinary, and save to Firebase
  const handleConfirmCropAndSave = async () => {
    if (!rawImageUri) return;

    setIsProcessingCrop(true);
    try {
      // 1. Process image transformation using ImageManipulator
      const actions: ImageManipulator.Action[] = [];
      if (cropRotation !== 0) {
        actions.push({ rotate: cropRotation });
      }
      actions.push({ resize: { width: 600, height: 600 } });

      let manipulatedUri = rawImageUri;
      let croppedBase64 = rawImageUri;

      try {
        const manipulated = await ImageManipulator.manipulateAsync(
          rawImageUri,
          actions,
          {
            compress: 0.85,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
          }
        );
        manipulatedUri = manipulated.uri;
        croppedBase64 = manipulated.base64
          ? `data:image/jpeg;base64,${manipulated.base64}`
          : manipulated.uri;
      } catch (manipErr) {
        console.warn("ImageManipulator notice:", manipErr);
      }

      // Close crop modal, restore edit modal, and start upload
      setShowCropModal(false);
      setShowEditModal(true);
      setIsUploadingAvatar(true);
      setProfileImage(manipulatedUri); // instant local preview

      let finalPhotoURL = manipulatedUri;

      // 2. Upload to Cloudinary
      if (CLOUDINARY_CONFIG.cloudName) {
        finalPhotoURL = await uploadToCloudinary(croppedBase64, {
          folder: "smarty_profiles",
        });
        setProfileImage(finalPhotoURL);
      }

      // 3. Save to Firebase Auth, Firestore, and AsyncStorage
      await updateAccountDetails({ photoURL: finalPhotoURL });
      setModalSuccess("Profile picture updated and saved successfully!");
      setTimeout(() => setModalSuccess(null), 3000);
    } catch (err: any) {
      console.warn("Crop/Upload error:", err);
      setModalError(err.message || "Failed to process and upload profile image.");
    } finally {
      setIsProcessingCrop(false);
      setIsUploadingAvatar(false);
    }
  };

  const openModalWithTab = (tab: EditModalTab) => {
    setActiveTab(tab);
    setEditName(user?.displayName || "");
    setEditEmail(user?.email || "");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setModalError(null);
    setModalSuccess(null);
    setShowEditModal(true);
  };

  // Save Personal Info (Name, Email)
  const handleSavePersonalInfo = async () => {
    if (!editName.trim()) {
      setModalError("Please enter your name.");
      return;
    }
    if (!editEmail.trim() || !editEmail.includes("@")) {
      setModalError("Please enter a valid email address.");
      return;
    }

    setIsSavingPersonal(true);
    setModalError(null);
    setModalSuccess(null);

    try {
      await updateAccountDetails({
        displayName: editName.trim(),
        email: editEmail.trim(),
        photoURL: profileImage || undefined,
      });

      setModalSuccess("Personal information updated successfully!");
      setTimeout(() => {
        setModalSuccess(null);
      }, 2500);
    } catch (err: any) {
      setModalError(err.message || "Failed to update profile details.");
    } finally {
      setIsSavingPersonal(false);
    }
  };

  // Save Password Change (requires Old Password)
  const handleSavePassword = async () => {
    if (!oldPassword) {
      setModalError("Please enter your current / old password.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setModalError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setModalError("New passwords do not match. Please verify.");
      return;
    }
    if (oldPassword === newPassword) {
      setModalError("New password must be different from your old password.");
      return;
    }

    setIsSavingSecurity(true);
    setModalError(null);
    setModalSuccess(null);

    try {
      await updateAccountDetails({
        oldPassword: oldPassword.trim(),
        password: newPassword.trim(),
      });

      setModalSuccess("Password changed successfully! Keep it safe.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setModalSuccess(null);
      }, 3000);
    } catch (err: any) {
      setModalError(err.message || "Failed to update password. Check old password.");
    } finally {
      setIsSavingSecurity(false);
    }
  };

  // Delete all quizzes and files
  const executeDeleteAll = async () => {
    setIsDeletingData(true);
    setModalError(null);
    try {
      await deleteAllQuizzesAndFiles();
      setModalSuccess("All quizzes and uploaded files deleted successfully!");
      setTimeout(() => setModalSuccess(null), 3500);
    } catch (err: any) {
      setModalError(err.message || "Failed to delete quizzes and files.");
    } finally {
      setIsDeletingData(false);
    }
  };

  const handleDeleteAllQuizzesAndFiles = () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Are you sure you want to delete all your quizzes, attempts, and uploaded documents? This will delete them locally and from your Firestore account permanently."
      );
      if (confirmed) {
        executeDeleteAll();
      }
      return;
    }

    Alert.alert(
      "Delete All Quizzes & Files",
      "Are you sure you want to delete all your quizzes, attempts, and uploaded documents? This will delete them locally AND in Firestore for your account.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: executeDeleteAll,
        },
      ]
    );
  };

  // Change Theme Mode
  const handleSelectTheme = async (mode: ThemeMode) => {
    await setThemeMode(mode);
  };

  // Select Language
  const handleSelectLanguage = async (code: string) => {
    setCurrentLanguage(code);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, code);
      setModalSuccess("Language updated successfully!");
      setTimeout(() => setModalSuccess(null), 1800);
    } catch (e) {
      console.warn("Language save error:", e);
    }
  };

  const handleConfirmSignOut = async () => {
    setShowLogoutModal(false);
    try {
      await signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: "SignIn" }],
      });
    } catch (e) {
      console.warn("Sign out error:", e);
    }
  };

  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header Bar */}
      <View style={[styles.topHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerBrandTitle, { color: colors.text }]}>Profile & Settings</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.profileAvatarMini,
            { backgroundColor: profileImage ? "transparent" : "#6D44F2" },
          ]}
          activeOpacity={0.85}
          onPress={() => openModalWithTab("personal")}
        >
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileAvatarMiniImage} resizeMode="cover" />
          ) : (
            <ProfilePersonIcon size={16} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      <Animated.View style={[{ flex: 1 }, contentAnimStyle]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentWrapper}>
            {/* User Profile Hero Card */}
            <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.profileHeaderRow}>
                <TouchableOpacity
                  style={styles.avatarWrapper}
                  onPress={() => openModalWithTab("personal")}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.avatarCircle,
                      { backgroundColor: profileImage ? "transparent" : "#6D44F2" },
                    ]}
                  >
                    {isUploadingAvatar ? (
                      <ActivityIndicator size="small" color="#6D44F2" />
                    ) : profileImage ? (
                      <Image source={{ uri: profileImage }} style={styles.avatarImage} resizeMode="cover" />
                    ) : (
                      <ProfilePersonIcon size={26} color="#FFFFFF" />
                    )}
                  </View>
                  <View style={styles.cameraIconBadge}>
                    <Ionicons name="camera" size={11} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>

                <View style={styles.profileInfoCol}>
                  <Text style={[styles.userName, { color: colors.text }]}>
                    {user?.displayName || "Learner"}
                  </Text>
                  <View style={styles.scholarBadge}>
                    <Ionicons name="ribbon-outline" size={12} color="#92400E" style={{ marginRight: 3 }} />
                    <Text style={styles.scholarText}>{user?.tier || "Scholar"}</Text>
                  </View>
                  <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                    {user?.email || "learner@smartyai.app"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openModalWithTab("personal")}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={12} color="#6D44F2" style={{ marginRight: 4 }} />
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* Metric Statistics */}
              <View style={styles.metricsRow}>
                <View style={[styles.metricBox, isDark ? styles.metricBoxDark : styles.metricBoxPurple]}>
                  <Text style={[styles.metricNum, { color: isDark ? "#A78BFA" : "#4338CA" }]}>
                    {profileQuizzesTaken}
                  </Text>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Quizzes</Text>
                </View>

                <View style={[styles.metricBox, isDark ? styles.metricBoxDark : styles.metricBoxIndigo]}>
                  <Text style={[styles.metricNum, { color: isDark ? "#818CF8" : "#3730A3" }]}>
                    {profileAvgScore}%
                  </Text>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Avg Score</Text>
                </View>

                <View style={[styles.metricBox, isDark ? styles.metricBoxDark : styles.metricBoxAmber]}>
                  <Text style={[styles.metricNum, { color: "#F59E0B" }]}>
                    {user?.streak ?? 1} 🔥
                  </Text>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Day Streak</Text>
                </View>
              </View>
            </View>



            {/* Streak Motivation Banner */}
            <View style={[styles.motivationCard, { backgroundColor: isDark ? "#1E1B4B" : "#EEF2FF", borderColor: isDark ? "#312E81" : "#E0E7FF" }]}>
              <View style={[styles.motivationIconBox, { backgroundColor: isDark ? "#2E1065" : "#FFFFFF" }]}>
                <Ionicons name="sparkles" size={18} color="#8B5CF6" />
              </View>
              <View style={styles.motivationTextCol}>
                <Text style={[styles.motivationTitle, { color: isDark ? "#E0E7FF" : "#1E1B4B" }]}>
                  Keep Up Your Learning Momentum!
                </Text>
                <Text style={[styles.motivationSubtitle, { color: isDark ? "#A5B4FC" : "#4338CA" }]}>
                  Complete 1 quiz daily to double your XP streak rewards.
                </Text>
              </View>
              <Ionicons name="flash" size={18} color="#F59E0B" />
            </View>

            {/* SECTION: STUDY & AI PREFERENCES */}
            <Text style={[styles.sectionHeaderTitle, { color: colors.textMuted }]}>STUDY & AI PREFERENCES</Text>
            <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {/* Default Quiz Difficulty */}
              <Text style={[styles.fieldTitle, { color: colors.text }]}>Default Quiz Difficulty</Text>
              <View style={styles.difficultyPillsRow}>
                {(["Easy", "Medium", "Hard"] as const).map((level) => {
                  const isSelected = difficulty === level;
                  return (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.diffPill,
                        isSelected
                          ? styles.diffPillActive
                          : [styles.diffPillInactive, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }],
                      ]}
                      onPress={() => handleSelectDifficulty(level)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.diffPillText,
                          isSelected
                            ? styles.diffPillTextActive
                            : [styles.diffPillTextInactive, { color: colors.textSecondary }],
                        ]}
                      >
                        {level}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Daily Study Target */}
              <View style={[styles.targetSection, { borderTopColor: colors.border }]}>
                <View style={styles.targetHeaderRow}>
                  <Text style={[styles.targetLabel, { color: colors.text }]}>Daily Goal Progress</Text>
                  <Text style={styles.targetGoalText}>15 mins / {dailyGoalTarget} quizzes</Text>
                </View>
                <View style={[styles.targetProgressTrack, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }]}>
                  <View style={[styles.targetProgressFill, { width: `${dailyGoalPercent}%` }]} />
                </View>
                <View style={styles.targetFooterRow}>
                  <Text style={[styles.targetSubLeft, { color: colors.textMuted }]}>
                    Current: {realQuizzesCompletedToday} {realQuizzesCompletedToday === 1 ? 'quiz' : 'quizzes'} completed
                  </Text>
                  <Text style={[styles.targetSubRight, { color: colors.text }]}>{dailyGoalPercent}% achieved</Text>
                </View>
              </View>
            </View>

            {/* SECTION: LEARNING CONTENT & DATA */}
            <Text style={[styles.sectionHeaderTitle, { color: colors.textMuted }]}>LEARNING CONTENT & DATA</Text>
            <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {/* Mistake Bank Auto-Sync */}
              <View style={styles.settingRowWithIcon}>
                <View style={[styles.itemIconBox, { backgroundColor: "#FEE2E2" }]}>
                  <Ionicons name="sync-outline" size={16} color="#DC2626" />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={[styles.settingMainTitle, { color: colors.text }]}>Mistake Bank Auto-Sync</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Auto-queue missed questions for review</Text>
                </View>
                <Switch
                  value={mistakeSync}
                  onValueChange={handleToggleMistakeSync}
                  trackColor={{ false: isDark ? "#334155" : "#E5E7EB", true: "#6D44F2" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

              {/* Uploaded Materials */}
              <TouchableOpacity
                style={styles.settingRowWithIcon}
                onPress={() => navigation.navigate("UploadQuiz")}
                activeOpacity={0.7}
              >
                <View style={[styles.itemIconBox, { backgroundColor: "#EEF2FF" }]}>
                  <Ionicons name="folder-open-outline" size={16} color="#4338CA" />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={[styles.settingMainTitle, { color: colors.text }]}>Uploaded Materials (PDF/PPT)</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Documents active for AI quiz generation</Text>
                </View>
                <View style={styles.arrowGroup}>
                  <Text style={[styles.fileCountText, { color: colors.textMuted }]}>8 files</Text>
                  <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
                </View>
              </TouchableOpacity>

              <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

              {/* Export Study Diagnostics */}
              <TouchableOpacity
                style={styles.settingRowWithIcon}
                onPress={() => Alert.alert("Export Diagnostics", "Exporting your performance data as PDF...")}
                activeOpacity={0.7}
              >
                <View style={[styles.itemIconBox, { backgroundColor: "#FEF3C7" }]}>
                  <Ionicons name="bar-chart-outline" size={16} color="#D97706" />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={[styles.settingMainTitle, { color: colors.text }]}>Export Study Diagnostics</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Download PDF / CSV completion charts</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* SECTION: APP PREFERENCES */}
            <Text style={[styles.sectionHeaderTitle, { color: colors.textMuted }]}>APP PREFERENCES</Text>
            <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {/* Appearance Setting Item */}
              <TouchableOpacity
                style={styles.settingRowWithIcon}
                onPress={() => openModalWithTab("appearance")}
                activeOpacity={0.7}
              >
                <View style={[styles.itemIconBox, { backgroundColor: "#F3E8FF" }]}>
                  <Ionicons name="color-palette-outline" size={16} color="#7C3AED" />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={[styles.settingMainTitle, { color: colors.text }]}>Theme & Appearance</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>
                    {themeMode === "system" ? "System Default" : isDark ? "Dark Mode" : "Light Mode"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
              </TouchableOpacity>

              <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

              {/* Language Setting Item */}
              <TouchableOpacity
                style={styles.settingRowWithIcon}
                onPress={() => openModalWithTab("language")}
                activeOpacity={0.7}
              >
                <View style={[styles.itemIconBox, { backgroundColor: "#DCFCE7" }]}>
                  <Ionicons name="globe-outline" size={16} color="#16A34A" />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={[styles.settingMainTitle, { color: colors.text }]}>App Language</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>
                    {currentLangObj.flag} {currentLangObj.name}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
              </TouchableOpacity>

              <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

              {/* Daily Streak Reminder */}
              <View style={styles.settingRowWithIcon}>
                <View style={[styles.itemIconBox, { backgroundColor: "#FEE2E2" }]}>
                  <Ionicons name="notifications-outline" size={16} color="#DC2626" />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={[styles.settingMainTitle, { color: colors.text }]}>Daily Streak Reminder</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Scheduled at 7:00 PM daily</Text>
                </View>
                <Switch
                  value={streakReminder}
                  onValueChange={handleToggleStreakReminder}
                  trackColor={{ false: isDark ? "#334155" : "#E5E7EB", true: "#6D44F2" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

              {/* Sound & Haptic Feedback */}
              <View style={styles.settingRowWithIcon}>
                <View style={[styles.itemIconBox, { backgroundColor: "#EEF2FF" }]}>
                  <Ionicons name="phone-portrait-outline" size={16} color="#4338CA" />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={[styles.settingMainTitle, { color: colors.text }]}>Sound & Haptic Feedback</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Subtle vibrations upon quiz scoring</Text>
                </View>
                <Switch
                  value={hapticFeedback}
                  onValueChange={handleToggleHapticFeedback}
                  trackColor={{ false: isDark ? "#334155" : "#E5E7EB", true: "#6D44F2" }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* SECTION: SUPPORT & LEGAL */}
            <Text style={[styles.sectionHeaderTitle, { color: colors.textMuted }]}>SUPPORT & LEGAL</Text>
            <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <TouchableOpacity
                style={styles.settingRowWithIcon}
                onPress={() => Alert.alert("Help Center", "Opening Smarty AI Guide & FAQs...")}
                activeOpacity={0.7}
              >
                <View style={[styles.itemIconBox, { backgroundColor: "#EEF2FF" }]}>
                  <Ionicons name="help-circle-outline" size={16} color="#4338CA" />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={[styles.settingMainTitle, { color: colors.text }]}>Help Center & Smarty AI Guide</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
              </TouchableOpacity>

              <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

              <TouchableOpacity
                style={styles.settingRowWithIcon}
                onPress={() => Alert.alert("Legal", "Privacy Policy & Terms of Service...")}
                activeOpacity={0.7}
              >
                <View style={[styles.itemIconBox, { backgroundColor: "#EEF2FF" }]}>
                  <Ionicons name="shield-checkmark-outline" size={16} color="#4338CA" />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={[styles.settingMainTitle, { color: colors.text }]}>Privacy Policy & Terms</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Premium Sleek Log Out Button */}
            <TouchableOpacity
              style={[styles.logoutButton, isDark && { backgroundColor: "#3F1818", borderColor: "#7F1D1D" }]}
              onPress={() => setShowLogoutModal(true)}
              activeOpacity={0.82}
            >
              <Ionicons name="log-out-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>

            {/* Footer Brand Note */}
            <View style={styles.footerBrand}>
              <Text style={[styles.footerBrandTitle, { color: colors.text }]}>Smarty AI</Text>
              <Text style={styles.footerBrandDesc}>Empowering Intelligent Learning</Text>
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      {/* ─── EDIT PROFILE & SETTINGS MULTI-TAB MODAL ─── */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isSavingPersonal && !isSavingSecurity && setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.editModalCard, { backgroundColor: colors.card }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeaderRow, { borderBottomColor: colors.border }]}>
              <View style={styles.modalTitleGroup}>
                <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>Edit Profile & Settings</Text>
              </View>
              <TouchableOpacity
                onPress={() => !isSavingPersonal && !isSavingSecurity && setShowEditModal(false)}
                style={[styles.modalCloseButton, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Segmented Tab Navigation */}
            <View style={[styles.tabBarContainer, { backgroundColor: isDark ? "#0F172A" : "#F1F5F9" }]}>
              <TouchableOpacity
                style={[
                  styles.tabBarPill,
                  activeTab === "personal" && [styles.tabBarPillActive, { backgroundColor: colors.card }],
                ]}
                onPress={() => {
                  setActiveTab("personal");
                  setModalError(null);
                  setModalSuccess(null);
                }}
              >
                <Ionicons
                  name="person-outline"
                  size={13}
                  color={activeTab === "personal" ? "#6D44F2" : colors.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.tabBarPillText,
                    { color: activeTab === "personal" ? "#6D44F2" : colors.textMuted },
                  ]}
                  numberOfLines={1}
                >
                  Personal
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabBarPill,
                  activeTab === "security" && [styles.tabBarPillActive, { backgroundColor: colors.card }],
                ]}
                onPress={() => {
                  setActiveTab("security");
                  setModalError(null);
                  setModalSuccess(null);
                }}
              >
                <Ionicons
                  name="shield-outline"
                  size={13}
                  color={activeTab === "security" ? "#6D44F2" : colors.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.tabBarPillText,
                    { color: activeTab === "security" ? "#6D44F2" : colors.textMuted },
                  ]}
                  numberOfLines={1}
                >
                  Security
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabBarPill,
                  activeTab === "appearance" && [styles.tabBarPillActive, { backgroundColor: colors.card }],
                ]}
                onPress={() => {
                  setActiveTab("appearance");
                  setModalError(null);
                  setModalSuccess(null);
                }}
              >
                <Ionicons
                  name="color-palette-outline"
                  size={13}
                  color={activeTab === "appearance" ? "#6D44F2" : colors.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.tabBarPillText,
                    { color: activeTab === "appearance" ? "#6D44F2" : colors.textMuted },
                  ]}
                  numberOfLines={1}
                >
                  Theme
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabBarPill,
                  activeTab === "language" && [styles.tabBarPillActive, { backgroundColor: colors.card }],
                ]}
                onPress={() => {
                  setActiveTab("language");
                  setModalError(null);
                  setModalSuccess(null);
                }}
              >
                <Ionicons
                  name="globe-outline"
                  size={13}
                  color={activeTab === "language" ? "#6D44F2" : colors.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.tabBarPillText,
                    { color: activeTab === "language" ? "#6D44F2" : colors.textMuted },
                  ]}
                  numberOfLines={1}
                >
                  Language
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error / Success Toast Messages */}
            {modalError && (
              <View style={styles.modalErrorBanner}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.modalErrorText}>{modalError}</Text>
              </View>
            )}

            {modalSuccess && (
              <View style={styles.modalSuccessBanner}>
                <Ionicons name="checkmark-circle" size={16} color="#16A34A" style={{ marginRight: 6 }} />
                <Text style={styles.modalSuccessText}>{modalSuccess}</Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {/* ══════════ TAB 1: PERSONAL INFO ══════════ */}
              {activeTab === "personal" && (
                <View style={styles.tabContentBlock}>
                  {/* Avatar Picker */}
                  <View
                    style={[
                      styles.modalAvatarRow,
                      { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor: colors.cardBorder },
                    ]}
                  >
                    <TouchableOpacity
                      style={[
                        styles.modalAvatarBox,
                        { backgroundColor: profileImage ? "transparent" : "#6D44F2" },
                      ]}
                      onPress={pickImage}
                      activeOpacity={0.8}
                      disabled={isUploadingAvatar}
                    >
                      {isUploadingAvatar ? (
                        <ActivityIndicator size="small" color="#6D44F2" />
                      ) : profileImage ? (
                        <Image source={{ uri: profileImage }} style={styles.modalAvatarImg} resizeMode="cover" />
                      ) : (
                        <ProfilePersonIcon size={32} color="#FFFFFF" />
                      )}
                      <View style={styles.modalCameraBadge}>
                        <Ionicons name="camera" size={12} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>
                    <View style={styles.modalAvatarTextCol}>
                      <Text style={[styles.modalAvatarTitle, { color: colors.text }]}>Profile Picture</Text>
                      {isUploadingAvatar ? (
                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                          <ActivityIndicator size="small" color="#6D44F2" style={{ marginRight: 6 }} />
                          <Text style={{ fontSize: 11.5, fontWeight: "700", color: "#6D44F2" }}>
                            Uploading to Cloudinary...
                          </Text>
                        </View>
                      ) : (
                        <TouchableOpacity onPress={pickImage}>
                          <Text style={styles.modalChangePhotoLink}>Tap to choose & crop photo</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Name Input */}
                  <View style={styles.modalInputGroup}>
                    <Text style={[styles.modalInputLabel, { color: colors.textSecondary }]}>Full Name</Text>
                    <View
                      style={[
                        styles.modalInputWrapper,
                        { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor: colors.cardBorder },
                      ]}
                    >
                      <Ionicons name="person-outline" size={18} color="#64748B" style={styles.inputLeadingIcon} />
                      <TextInput
                        style={[styles.modalTextInput, { color: colors.text }]}
                        value={editName}
                        onChangeText={setEditName}
                        placeholder="Enter your name"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="words"
                        editable={!isSavingPersonal}
                      />
                    </View>
                  </View>

                  {/* Email Input */}
                  <View style={styles.modalInputGroup}>
                    <Text style={[styles.modalInputLabel, { color: colors.textSecondary }]}>Email Address</Text>
                    <View
                      style={[
                        styles.modalInputWrapper,
                        { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor: colors.cardBorder },
                      ]}
                    >
                      <Ionicons name="mail-outline" size={18} color="#64748B" style={styles.inputLeadingIcon} />
                      <TextInput
                        style={[styles.modalTextInput, { color: colors.text }]}
                        value={editEmail}
                        onChangeText={setEditEmail}
                        placeholder="Enter email address"
                        placeholderTextColor="#94A3B8"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!isSavingPersonal}
                      />
                    </View>
                  </View>

                  {/* Save Button for Personal Info */}
                  <TouchableOpacity
                    style={[styles.modalPrimaryBtn, isSavingPersonal && styles.btnDisabled]}
                    onPress={handleSavePersonalInfo}
                    activeOpacity={0.85}
                    disabled={isSavingPersonal}
                  >
                    {isSavingPersonal ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="save-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.modalPrimaryBtnText}>Save Personal Info</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* ══════════ TAB 2: SECURITY (CHANGE PASSWORD) ══════════ */}
              {activeTab === "security" && (
                <View style={styles.tabContentBlock}>
                  <View
                    style={[
                      styles.infoBannerBox,
                      { backgroundColor: isDark ? "#1E1B4B" : "#EEF2FF", borderColor: isDark ? "#312E81" : "#E0E7FF" },
                    ]}
                  >
                    <Ionicons name="shield-outline" size={18} color="#6D44F2" style={{ marginRight: 8 }} />
                    <Text style={[styles.infoBannerText, { color: isDark ? "#C7D2FE" : "#3730A3" }]}>
                      Enter your current password to verify your identity and set a new password.
                    </Text>
                  </View>

                  {/* Current / Old Password */}
                  <View style={styles.modalInputGroup}>
                    <Text style={[styles.modalInputLabel, { color: colors.textSecondary }]}>Current Password *</Text>
                    <View
                      style={[
                        styles.modalInputWrapper,
                        { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor: colors.cardBorder },
                      ]}
                    >
                      <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={styles.inputLeadingIcon} />
                      <TextInput
                        style={[styles.modalTextInput, { color: colors.text }]}
                        value={oldPassword}
                        onChangeText={setOldPassword}
                        placeholder="Enter current password"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showOldPassword}
                        autoCapitalize="none"
                        editable={!isSavingSecurity}
                      />
                      <TouchableOpacity
                        onPress={() => setShowOldPassword((prev) => !prev)}
                        style={styles.inputTrailingIcon}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name={showOldPassword ? "eye-off-outline" : "eye-outline"}
                          size={18}
                          color="#64748B"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* New Password */}
                  <View style={styles.modalInputGroup}>
                    <Text style={[styles.modalInputLabel, { color: colors.textSecondary }]}>New Password *</Text>
                    <View
                      style={[
                        styles.modalInputWrapper,
                        { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor: colors.cardBorder },
                      ]}
                    >
                      <Ionicons name="key-outline" size={18} color="#64748B" style={styles.inputLeadingIcon} />
                      <TextInput
                        style={[styles.modalTextInput, { color: colors.text }]}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="At least 6 characters"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showNewPassword}
                        autoCapitalize="none"
                        editable={!isSavingSecurity}
                      />
                      <TouchableOpacity
                        onPress={() => setShowNewPassword((prev) => !prev)}
                        style={styles.inputTrailingIcon}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                          size={18}
                          color="#64748B"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Confirm New Password */}
                  <View style={styles.modalInputGroup}>
                    <Text style={[styles.modalInputLabel, { color: colors.textSecondary }]}>Confirm New Password *</Text>
                    <View
                      style={[
                        styles.modalInputWrapper,
                        { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor: colors.cardBorder },
                      ]}
                    >
                      <Ionicons name="checkmark-circle-outline" size={18} color="#64748B" style={styles.inputLeadingIcon} />
                      <TextInput
                        style={[styles.modalTextInput, { color: colors.text }]}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Re-enter new password"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        editable={!isSavingSecurity}
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword((prev) => !prev)}
                        style={styles.inputTrailingIcon}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                          size={18}
                          color="#64748B"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Update Password Button */}
                  <TouchableOpacity
                    style={[styles.modalPrimaryBtn, isSavingSecurity && styles.btnDisabled]}
                    onPress={handleSavePassword}
                    activeOpacity={0.85}
                    disabled={isSavingSecurity}
                  >
                    {isSavingSecurity ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="lock-closed" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.modalPrimaryBtnText}>Update Password</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* ─── DANGER ZONE: DELETE ALL QUIZZES & FILES ─── */}
                  <View style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: isDark ? "#334155" : "#E2E8F0" }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#EF4444", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                      Data & Account Cleanup
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12, lineHeight: 17 }}>
                      Permanently delete all quizzes, attempts, and uploaded documents associated with your logged-in account in Firestore and local storage.
                    </Text>
                    <TouchableOpacity
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isDark ? "#451A1A" : "#FEF2F2",
                        borderWidth: 1,
                        borderColor: isDark ? "#7F1D1D" : "#FCA5A5",
                        borderRadius: 12,
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                      }}
                      onPress={handleDeleteAllQuizzesAndFiles}
                      disabled={isDeletingData}
                      activeOpacity={0.8}
                    >
                      {isDeletingData ? (
                        <ActivityIndicator size="small" color="#DC2626" />
                      ) : (
                        <>
                          <Ionicons name="trash-outline" size={16} color="#DC2626" style={{ marginRight: 8 }} />
                          <Text style={{ fontSize: 13.5, fontWeight: "700", color: "#DC2626" }}>
                            Delete All Quizzes & Files
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ══════════ TAB 3: APPEARANCE (DARK/LIGHT MODE) ══════════ */}
              {activeTab === "appearance" && (
                <View style={styles.tabContentBlock}>
                  <Text style={[styles.sectionSubDesc, { color: colors.textSecondary }]}>
                    Choose how Smarty AI looks to you on this device.
                  </Text>

                  {/* Light Mode Option */}
                  <TouchableOpacity
                    style={[
                      styles.themeCardOption,
                      { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor: colors.cardBorder },
                      themeMode === "light" && styles.themeCardOptionSelected,
                    ]}
                    onPress={() => handleSelectTheme("light")}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.themeIconBox, { backgroundColor: "#FEF3C7" }]}>
                      <Ionicons name="sunny" size={22} color="#D97706" />
                    </View>
                    <View style={styles.themeTextCol}>
                      <Text style={[styles.themeOptionTitle, { color: colors.text }]}>Light Mode</Text>
                      <Text style={[styles.themeOptionDesc, { color: colors.textMuted }]}>
                        Clean, high-contrast bright theme
                      </Text>
                    </View>
                    {themeMode === "light" && (
                      <View style={styles.selectedBadge}>
                        <Ionicons name="checkmark-circle" size={22} color="#6D44F2" />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Dark Mode Option */}
                  <TouchableOpacity
                    style={[
                      styles.themeCardOption,
                      { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor: colors.cardBorder },
                      themeMode === "dark" && styles.themeCardOptionSelected,
                    ]}
                    onPress={() => handleSelectTheme("dark")}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.themeIconBox, { backgroundColor: "#1E1B4B" }]}>
                      <Ionicons name="moon" size={22} color="#8B5CF6" />
                    </View>
                    <View style={styles.themeTextCol}>
                      <Text style={[styles.themeOptionTitle, { color: colors.text }]}>Dark Mode</Text>
                      <Text style={[styles.themeOptionDesc, { color: colors.textMuted }]}>
                        Sleek midnight look, easy on the eyes
                      </Text>
                    </View>
                    {themeMode === "dark" && (
                      <View style={styles.selectedBadge}>
                        <Ionicons name="checkmark-circle" size={22} color="#6D44F2" />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* System Default Option */}
                  <TouchableOpacity
                    style={[
                      styles.themeCardOption,
                      { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor: colors.cardBorder },
                      themeMode === "system" && styles.themeCardOptionSelected,
                    ]}
                    onPress={() => handleSelectTheme("system")}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.themeIconBox, { backgroundColor: "#EEF2FF" }]}>
                      <Ionicons name="phone-portrait-outline" size={22} color="#4338CA" />
                    </View>
                    <View style={styles.themeTextCol}>
                      <Text style={[styles.themeOptionTitle, { color: colors.text }]}>System Default</Text>
                      <Text style={[styles.themeOptionDesc, { color: colors.textMuted }]}>
                        Sync with your device system settings
                      </Text>
                    </View>
                    {themeMode === "system" && (
                      <View style={styles.selectedBadge}>
                        <Ionicons name="checkmark-circle" size={22} color="#6D44F2" />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* ══════════ TAB 4: LANGUAGE ══════════ */}
              {activeTab === "language" && (
                <View style={styles.tabContentBlock}>
                  <Text style={[styles.sectionSubDesc, { color: colors.textSecondary }]}>
                    Select your preferred language for quizzes, explanations, and navigation.
                  </Text>

                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isSelected = currentLanguage === lang.code;
                    return (
                      <TouchableOpacity
                        key={lang.code}
                        style={[
                          styles.langCardItem,
                          { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor: colors.cardBorder },
                          isSelected && styles.langCardItemSelected,
                        ]}
                        onPress={() => handleSelectLanguage(lang.code)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.langFlag}>{lang.flag}</Text>
                        <View style={styles.langTextCol}>
                          <Text style={[styles.langNativeName, { color: colors.text }]}>
                            {lang.nativeName}
                          </Text>
                          <Text style={[styles.langEngName, { color: colors.textMuted }]}>
                            {lang.name}
                          </Text>
                        </View>
                        {isSelected && (
                          <View style={styles.selectedBadge}>
                            <Ionicons name="checkmark-circle" size={22} color="#6D44F2" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── CROP & RESIZE PHOTO MODAL ─── */}
      <Modal
        visible={showCropModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isProcessingCrop && setShowCropModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.cropModalCard, { backgroundColor: colors.card }]}>
            {/* Modal Header */}
            <View style={styles.cropModalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="crop-outline" size={20} color="#6D44F2" style={{ marginRight: 8 }} />
                <Text style={[styles.cropModalTitle, { color: colors.text }]}>Crop & Resize Photo</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (!isProcessingCrop) {
                    setShowCropModal(false);
                    setShowEditModal(true);
                  }
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.cropModalSubtitle, { color: colors.textMuted }]}>
              Adjust scale and rotation to frame your profile picture nicely.
            </Text>

            {/* Circular Crop Viewport */}
            <View style={styles.cropViewportWrapper}>
              <View style={styles.cropCircleMask}>
                {rawImageUri && (
                  <Image
                    source={{ uri: rawImageUri }}
                    style={[
                      styles.cropPreviewImage,
                      {
                        transform: [
                          { scale: cropZoom },
                          { rotate: `${cropRotation}deg` },
                        ],
                      },
                    ]}
                    resizeMode="cover"
                  />
                )}
              </View>
              <View style={styles.cropOverlayBorder} />
            </View>

            {/* Zoom & Rotation Controls */}
            <View style={[styles.cropControlsContainer, { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" }]}>
              {/* Zoom Controls */}
              <View style={styles.cropControlRow}>
                <Text style={[styles.cropControlLabel, { color: colors.textSecondary }]}>
                  Zoom ({Math.round(cropZoom * 100)}%)
                </Text>
                <View style={styles.zoomButtonsGroup}>
                  <TouchableOpacity
                    style={[styles.zoomBtn, { backgroundColor: colors.card }]}
                    onPress={() => setCropZoom((prev) => Math.max(0.8, prev - 0.15))}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="remove" size={18} color={colors.text} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.zoomBtn, { backgroundColor: colors.card }]}
                    onPress={() => setCropZoom((prev) => Math.min(2.5, prev + 0.15))}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={18} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Rotation & Reset */}
              <View style={[styles.cropControlRow, { marginTop: 10 }]}>
                <TouchableOpacity
                  style={[styles.rotateBtn, { backgroundColor: colors.card }]}
                  onPress={() => setCropRotation((prev) => (prev + 90) % 360)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh-outline" size={16} color="#6D44F2" style={{ marginRight: 6 }} />
                  <Text style={[styles.rotateBtnText, { color: colors.text }]}>Rotate 90°</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.rotateBtn, { backgroundColor: colors.card }]}
                  onPress={() => {
                    setCropZoom(1);
                    setCropRotation(0);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="reload-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
                  <Text style={[styles.rotateBtnText, { color: colors.textMuted }]}>Reset</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Modal Actions */}
            <View style={styles.cropModalActions}>
              <TouchableOpacity
                style={[
                  styles.cropCancelBtn,
                  { backgroundColor: isDark ? "#1E293B" : "#F1F5F9", borderColor: colors.cardBorder },
                ]}
                onPress={() => {
                  if (!isProcessingCrop) {
                    setShowCropModal(false);
                    setShowEditModal(true);
                  }
                }}
                activeOpacity={0.75}
                disabled={isProcessingCrop}
              >
                <Text style={[styles.cropCancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cropSaveBtn, isProcessingCrop && styles.btnDisabled]}
                onPress={handleConfirmCropAndSave}
                activeOpacity={0.85}
                disabled={isProcessingCrop}
              >
                {isProcessingCrop ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.cropSaveBtnText}>Save & Upload</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── LOGOUT CONFIRMATION MODAL ─── */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.logoutModalCard, { backgroundColor: colors.card }]}>
            <View style={styles.logoutIconCircle}>
              <Ionicons name="log-out-outline" size={28} color="#EF4444" />
            </View>

            <Text style={[styles.logoutModalTitle, { color: colors.text }]}>Log Out</Text>
            <Text style={[styles.logoutModalDesc, { color: colors.textSecondary }]}>
              Are you sure you want to log out? You will need to sign in again to access your saved quizzes and study progress.
            </Text>

            <View style={styles.logoutModalButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.logoutCancelBtn,
                  { backgroundColor: isDark ? "#1E293B" : "#F8FAFC", borderColor: colors.cardBorder },
                ]}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.75}
              >
                <Text style={[styles.logoutCancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutConfirmBtn}
                onPress={handleConfirmSignOut}
                activeOpacity={0.85}
              >
                <Ionicons name="log-out-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.logoutConfirmBtnText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Persistent Bottom Navigation */}
      <BottomNav activeTab="Performance" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 10,
    padding: 2,
  },
  headerBrandTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  profileAvatarMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6D44F2",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  profileAvatarMiniImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  contentWrapper: {
    paddingHorizontal: 20,
    maxWidth: 440,
    alignSelf: "center",
    width: "100%",
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 18,
    marginTop: 14,
    marginBottom: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  profileHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarWrapper: {
    position: "relative",
    marginRight: 14,
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6D44F2",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
    overflow: "hidden",
  },
  avatarImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  cameraIconBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#4338CA",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  profileInfoCol: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  scholarBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
    marginBottom: 3,
  },
  scholarText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400E",
  },
  userEmail: {
    fontSize: 12,
    color: "#64748B",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(109, 68, 242, 0.08)",
    borderRadius: 8,
  },
  editText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6D44F2",
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  metricBox: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  metricBoxDark: {
    backgroundColor: "#1E293B",
  },
  metricBoxPurple: {
    backgroundColor: "#F5F3FF",
  },
  metricBoxIndigo: {
    backgroundColor: "#EEF2FF",
  },
  metricBoxAmber: {
    backgroundColor: "#FEF3C7",
  },
  metricNum: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  // Quick Actions Grid
  quickActionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 14,
  },
  quickActionTile: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  quickActionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  quickActionTitle: {
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 2,
  },
  quickActionSub: {
    fontSize: 9.5,
    fontWeight: "600",
    textAlign: "center",
  },
  motivationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  motivationIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  motivationTextCol: {
    flex: 1,
    paddingRight: 6,
  },
  motivationTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E1B4B",
    marginBottom: 2,
  },
  motivationSubtitle: {
    fontSize: 11,
    color: "#4338CA",
    lineHeight: 15,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 6,
  },
  settingsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  fieldTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 10,
  },
  difficultyPillsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  diffPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  diffPillActive: {
    backgroundColor: "#6D44F2",
  },
  diffPillInactive: {
    backgroundColor: "#F1F5F9",
  },
  diffPillText: {
    fontSize: 12,
  },
  diffPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  diffPillTextInactive: {
    color: "#64748B",
    fontWeight: "600",
  },
  targetSection: {
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  targetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  targetLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  targetGoalText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6D44F2",
  },
  targetProgressTrack: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  targetProgressFill: {
    height: "100%",
    backgroundColor: "#6D44F2",
    borderRadius: 3,
  },
  targetFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  targetSubLeft: {
    fontSize: 11,
    color: "#64748B",
  },
  targetSubRight: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  settingRowWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  itemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  settingTextCol: {
    flex: 1,
  },
  settingMainTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  settingSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  arrowGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  fileCountText: {
    fontSize: 11,
    color: "#64748B",
    marginRight: 6,
    fontWeight: "600",
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 4,
  },
  logoutButton: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    borderRadius: 16,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 20,
    shadowColor: "#EF4444",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#EF4444",
    letterSpacing: -0.2,
  },
  footerBrand: {
    alignItems: "center",
    marginBottom: 24,
  },
  footerBrandTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  footerBrandDesc: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  // Modal Backdrop
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  // Multi-Tab Edit Modal Card
  editModalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  modalCloseButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  // Segmented Tab Bar
  tabBarContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  tabBarPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    borderRadius: 10,
  },
  tabBarPillActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  tabBarPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  tabContentBlock: {
    paddingVertical: 4,
  },
  sectionSubDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: "#64748B",
    marginBottom: 14,
  },
  // Modal Avatar Row
  modalAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalAvatarBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginRight: 14,
    overflow: "hidden",
  },
  modalAvatarImg: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  modalCameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#4338CA",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  modalAvatarTextCol: {
    flex: 1,
  },
  modalAvatarTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalChangePhotoLink: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#6D44F2",
    marginTop: 2,
  },
  // Toast Banners
  modalErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  modalErrorText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DC2626",
    flex: 1,
  },
  modalSuccessBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  modalSuccessText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16A34A",
    flex: 1,
  },
  infoBannerBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#E0E7FF",
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  infoBannerText: {
    fontSize: 11.5,
    lineHeight: 16,
    color: "#3730A3",
    flex: 1,
  },
  // Inputs
  modalInputGroup: {
    marginBottom: 12,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  modalInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
  },
  inputLeadingIcon: {
    marginRight: 10,
  },
  inputTrailingIcon: {
    padding: 4,
  },
  modalTextInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    color: "#0F172A",
    paddingVertical: 0,
  },
  modalPrimaryBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: "#6D44F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: "#6D44F2",
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  modalPrimaryBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  // Theme selection cards
  themeCardOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  themeCardOptionSelected: {
    borderColor: "#6D44F2",
    backgroundColor: "rgba(109, 68, 242, 0.05)",
  },
  themeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  themeTextCol: {
    flex: 1,
  },
  themeOptionTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  themeOptionDesc: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  selectedBadge: {
    marginLeft: 8,
  },
  // Language selection cards
  langCardItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  langCardItemSelected: {
    borderColor: "#6D44F2",
    backgroundColor: "rgba(109, 68, 242, 0.05)",
  },
  langFlag: {
    fontSize: 22,
    marginRight: 12,
  },
  langTextCol: {
    flex: 1,
  },
  langNativeName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  langEngName: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  // ─── Crop Modal Styles ───
  cropModalCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  cropModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cropModalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  cropModalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 16,
  },
  cropViewportWrapper: {
    width: 220,
    height: 220,
    alignSelf: "center",
    position: "relative",
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cropCircleMask: {
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F172A",
  },
  cropPreviewImage: {
    width: 220,
    height: 220,
  },
  cropOverlayBorder: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2.5,
    borderColor: "#6D44F2",
    pointerEvents: "none",
  },
  cropControlsContainer: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  cropControlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cropControlLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  zoomButtonsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  zoomBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  rotateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    borderRadius: 10,
    marginHorizontal: 4,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  rotateBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  cropModalActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cropCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  cropCancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },
  cropSaveBtn: {
    flex: 1.4,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#6D44F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6D44F2",
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  cropSaveBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  // Logout Confirmation Modal Card
  logoutModalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  logoutIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEF2F2",
    borderWidth: 2,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoutModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  logoutModalDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  logoutModalButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 10,
  },
  logoutCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutCancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },
  logoutConfirmBtn: {
    flex: 1.2,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EF4444",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  logoutConfirmBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});