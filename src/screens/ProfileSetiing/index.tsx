import React, { useState } from "react";
import {
  View,
  ScrollView,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { RootStackParamList } from "../../types/navigation";
import { useAuth } from "../../context/AuthContext";
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

export default function ProfileSetiing() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, signOut, updateUser } = useAuth();

  // Settings state matching Figma design
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [flashcardAutoGen, setFlashcardAutoGen] = useState(true);
  const [mistakeSync, setMistakeSync] = useState(true);
  const [streakReminder, setStreakReminder] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [profileImage, setProfileImage] = useState<string | null>(user?.photoURL || null);

  React.useEffect(() => {
    if (user?.photoURL) {
      setProfileImage(user.photoURL);
    }
  }, [user?.photoURL]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library to upload a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);
      if (updateUser) {
        await updateUser({ photoURL: uri });
      }
    }
  };

  const handleSignOut = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          navigation.navigate("Welcome");
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Image
            source={require("../../../assets/illustrations/smarty_logo.png")}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.headerBrandTitle}>Profile Settings</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.profileAvatarMini}
            activeOpacity={0.85}
            onPress={pickImage}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileAvatarMiniImage} />
            ) : (
              <ProfilePersonIcon size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrapper}>
          {/* User Profile Hero Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileHeaderRow}>
              <TouchableOpacity style={styles.avatarWrapper} onPress={pickImage} activeOpacity={0.8}>
                <View style={styles.avatarCircle}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                  ) : (
                    <ProfilePersonIcon size={24} color="#FFFFFF" />
                  )}
                </View>
                <View style={styles.cameraIconBadge}>
                  <Ionicons name="camera" size={11} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <View style={styles.profileInfoCol}>
                <Text style={styles.userName}>
                  {user?.displayName || "Marty Goboy"}
                </Text>
                <View style={styles.goldScholarPill}>
                  <Text style={styles.goldScholarText}>Gold Scholar</Text>
                </View>
                <Text style={styles.userEmail}>
                  {user?.email || "marty.goboy.@edu.com"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => Alert.alert("Edit Profile", "Profile edit dialog")}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil" size={12} color="#EF4444" style={{ marginRight: 3 }} />
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {/* 3 Metric Boxes */}
            <View style={styles.metricsRow}>
              <View style={[styles.metricBox, styles.metricBoxPurple]}>
                <Text style={[styles.metricNum, { color: "#4338CA" }]}>
                  {user?.quizzesTaken ?? 24}
                </Text>
                <Text style={styles.metricLabel}>Quizzes Taken</Text>
              </View>

              <View style={[styles.metricBox, styles.metricBoxPurple]}>
                <Text style={[styles.metricNum, { color: "#4338CA" }]}>
                  {user?.avgScore ?? 87}%
                </Text>
                <Text style={styles.metricLabel}>Avg Score</Text>
              </View>

              <View style={[styles.metricBox, styles.metricBoxAmber]}>
                <Text style={[styles.metricNum, { color: "#B45309" }]}>
                  {user?.streak ?? 6}
                </Text>
                <Text style={[styles.metricLabel, { color: "#92400E" }]}>Day Streak</Text>
              </View>
            </View>
          </View>

          {/* You're on Fire, Marty! Notification Banner */}
          <View style={styles.fireBannerCard}>
            <View style={styles.fireIconBox}>
              <Ionicons name="image-outline" size={18} color="#4338CA" />
            </View>
            <View style={styles.fireTextCol}>
              <Text style={styles.fireTitle}>You're on Fire, Marty!</Text>
              <Text style={styles.fireSubtitle}>
                Complete today's 5-min goal to unlock your weekly milestone badge.
              </Text>
            </View>
            <Ionicons name="flash" size={18} color="#F59E0B" />
          </View>

          {/* SECTION: STUDY & AI PREFERENCES */}
          <Text style={styles.sectionHeaderTitle}>STUDY & AI PREFERENCES</Text>
          <View style={styles.settingsCard}>
            {/* Default Quiz Difficulty */}
            <Text style={styles.fieldTitle}>Default Quiz Difficulty</Text>
            <View style={styles.difficultyPillsRow}>
              {(["Easy", "Medium", "Hard"] as const).map((level) => {
                const isSelected = difficulty === level;
                return (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.diffPill,
                      isSelected ? styles.diffPillActive : styles.diffPillInactive,
                    ]}
                    onPress={() => setDifficulty(level)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.diffPillText,
                        isSelected ? styles.diffPillTextActive : styles.diffPillTextInactive,
                      ]}
                    >
                      {level}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Daily Study Target */}
            <View style={styles.targetSection}>
              <View style={styles.targetHeaderRow}>
                <Text style={styles.targetLabel}>Daily Study Target</Text>
                <Text style={styles.targetGoalText}>15 mins / 2 quizzes</Text>
              </View>
              <View style={styles.targetProgressTrack}>
                <View style={[styles.targetProgressFill, { width: "73%" }]} />
              </View>
              <View style={styles.targetFooterRow}>
                <Text style={styles.targetSubLeft}>Current: 1 quiz (11 mins)</Text>
                <Text style={styles.targetSubRight}>73% achieved</Text>
              </View>
            </View>

            {/* AI Flashcard Auto-Gen */}
            <View style={styles.settingRow}>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingMainTitle}>AI Flashcard Auto-Gen</Text>
                <Text style={styles.settingSubtitle}>Synthesize key concepts automatically</Text>
              </View>
              <Switch
                value={flashcardAutoGen}
                onValueChange={setFlashcardAutoGen}
                trackColor={{ false: "#E5E7EB", true: "#4338CA" }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* SECTION: LEARNING CONTENT & DATA */}
          <Text style={styles.sectionHeaderTitle}>LEARNING CONTENT & DATA</Text>
          <View style={styles.settingsCard}>
            {/* Mistake Bank Auto-Sync */}
            <View style={styles.settingRowWithIcon}>
              <View style={[styles.itemIconBox, { backgroundColor: "#FEE2E2" }]}>
                <Ionicons name="sync" size={16} color="#DC2626" />
              </View>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingMainTitle}>Mistake Bank Auto-Sync</Text>
                <Text style={styles.settingSubtitle}>
                  Auto-queue missed questions for revision
                </Text>
              </View>
              <Switch
                value={mistakeSync}
                onValueChange={setMistakeSync}
                trackColor={{ false: "#E5E7EB", true: "#4338CA" }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.rowDivider} />

            {/* Uploaded Materials (PDF/PPT) */}
            <TouchableOpacity
              style={styles.settingRowWithIcon}
              onPress={() => navigation.navigate("UploadQuiz")}
              activeOpacity={0.7}
            >
              <View style={[styles.itemIconBox, { backgroundColor: "#EEF2FF" }]}>
                <Ionicons name="folder-outline" size={16} color="#4338CA" />
              </View>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingMainTitle}>Uploaded Materials (PDF/PPT)</Text>
                <Text style={styles.settingSubtitle}>
                  8 documents active for quiz generation
                </Text>
              </View>
              <View style={styles.arrowGroup}>
                <Text style={styles.fileCountText}>8 file</Text>
                <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
              </View>
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            {/* Export Study Diagnostics */}
            <TouchableOpacity
              style={styles.settingRowWithIcon}
              onPress={() => Alert.alert("Export", "Downloading PDF / CSV completion charts...")}
              activeOpacity={0.7}
            >
              <View style={[styles.itemIconBox, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="bar-chart-outline" size={16} color="#D97706" />
              </View>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingMainTitle}>Export Study Diagnostics</Text>
                <Text style={styles.settingSubtitle}>
                  Download PDF / CSV completion charts
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* SECTION: APP SETTINGS */}
          <Text style={styles.sectionHeaderTitle}>APP SETTINGS</Text>
          <View style={styles.settingsCard}>
            {/* Daily Streak Reminder */}
            <View style={styles.settingRowWithIcon}>
              <View style={[styles.itemIconBox, { backgroundColor: "#FEE2E2" }]}>
                <Ionicons name="notifications-outline" size={16} color="#DC2626" />
              </View>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingMainTitle}>Daily Streak Reminder</Text>
                <Text style={styles.settingSubtitle}>Scheduled at 7:00 PM daily</Text>
              </View>
              <Switch
                value={streakReminder}
                onValueChange={setStreakReminder}
                trackColor={{ false: "#E5E7EB", true: "#4338CA" }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.rowDivider} />

            {/* Sound & Haptic Feedback */}
            <View style={styles.settingRowWithIcon}>
              <View style={[styles.itemIconBox, { backgroundColor: "#EEF2FF" }]}>
                <Ionicons name="phone-portrait-outline" size={16} color="#4338CA" />
              </View>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingMainTitle}>Sound & Haptic Feedback</Text>
                <Text style={styles.settingSubtitle}>Subtle vibrations upon quiz scoring</Text>
              </View>
              <Switch
                value={hapticFeedback}
                onValueChange={setHapticFeedback}
                trackColor={{ false: "#E5E7EB", true: "#4338CA" }}
                thumbColor="#FFFFFF"
              />
            </View>


          </View>

          {/* SECTION: SUPPORT & LEGAL */}
          <Text style={styles.sectionHeaderTitle}>SUPPORT & LEGAL</Text>
          <View style={styles.settingsCard}>
            {/* Help Center */}
            <TouchableOpacity
              style={styles.settingRowWithIcon}
              onPress={() => Alert.alert("Help", "Opening Smarty AI Guide...")}
              activeOpacity={0.7}
            >
              <View style={[styles.itemIconBox, { backgroundColor: "#EEF2FF" }]}>
                <Ionicons name="help-circle-outline" size={16} color="#4338CA" />
              </View>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingMainTitle}>Help Center & Smarty AI Guide</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            {/* Privacy Policy */}
            <TouchableOpacity
              style={styles.settingRowWithIcon}
              onPress={() => Alert.alert("Privacy", "Opening Privacy Policy...")}
              activeOpacity={0.7}
            >
              <View style={[styles.itemIconBox, { backgroundColor: "#EEF2FF" }]}>
                <Ionicons name="shield-outline" size={16} color="#4338CA" />
              </View>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingMainTitle}>Privacy Policy & Terms of Service</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Log Out Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleSignOut}
            activeOpacity={0.85}
          >
            <Ionicons name="log-out-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          {/* Footer Brand Note */}
          <View style={styles.footerBrand}>
            <Text style={styles.footerBrandTitle}>Smarty AI</Text>
            <Text style={styles.footerBrandDesc}>Empowering Gemini Intelligent</Text>
          </View>
        </View>
      </ScrollView>

      {/* Persistent Bottom Navigation */}
      <BottomNav activeTab="Performance" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FBFBFE",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  headerLogo: {
    width: 26,
    height: 26,
    marginRight: 8,
  },
  headerBrandTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerRightLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginRight: 8,
  },
  profileAvatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#3E3ECB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3E3ECB",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
    overflow: "hidden",
  },
  profileAvatarMiniImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    borderColor: "#F1F2F6",
    padding: 16,
    marginTop: 6,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  profileHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  avatarWrapper: {
    position: "relative",
    marginRight: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3E3ECB",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  cameraIconBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#4338CA",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  profileInfoCol: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  goldScholarPill: {
    alignSelf: "flex-start",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 2,
    marginBottom: 2,
  },
  goldScholarText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#92400E",
  },
  userEmail: {
    fontSize: 11,
    color: "#6B7280",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  editText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EF4444",
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  metricBox: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  metricBoxPurple: {
    backgroundColor: "#F5F3FF",
  },
  metricBoxAmber: {
    backgroundColor: "#FEF3C7",
  },
  metricNum: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 1,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#6B7280",
  },
  fireBannerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  fireIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  fireTextCol: {
    flex: 1,
    paddingRight: 6,
  },
  fireTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 1,
  },
  fireSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 15,
  },
  sectionHeaderTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6B7280",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 4,
  },
  settingsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F2F6",
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  fieldTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  difficultyPillsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  diffPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  diffPillActive: {
    backgroundColor: "#4338CA",
  },
  diffPillInactive: {
    backgroundColor: "#F3F4F6",
  },
  diffPillText: {
    fontSize: 12,
  },
  diffPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  diffPillTextInactive: {
    color: "#4B5563",
    fontWeight: "600",
  },
  targetSection: {
    paddingTop: 6,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  targetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  targetLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  targetGoalText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4338CA",
  },
  targetProgressTrack: {
    height: 5,
    backgroundColor: "#F3F4F6",
    borderRadius: 2.5,
    overflow: "hidden",
    marginBottom: 6,
  },
  targetProgressFill: {
    height: "100%",
    backgroundColor: "#FDBA74",
    borderRadius: 2.5,
  },
  targetFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  targetSubLeft: {
    fontSize: 10,
    color: "#6B7280",
  },
  targetSubRight: {
    fontSize: 10,
    fontWeight: "700",
    color: "#374151",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  settingRowWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  itemIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  settingTextCol: {
    flex: 1,
  },
  settingMainTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  settingSubtitle: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 1,
  },
  arrowGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  fileCountText: {
    fontSize: 10,
    color: "#6B7280",
    marginRight: 4,
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 4,
  },
  logoutButton: {
    backgroundColor: "#FEE2E2",
    borderRadius: 14,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#DC2626",
  },
  footerBrand: {
    alignItems: "center",
    marginBottom: 20,
  },
  footerBrandTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#111827",
  },
  footerBrandDesc: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 1,
  },
});