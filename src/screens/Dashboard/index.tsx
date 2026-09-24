import React from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../types/navigation";
import { useAuth } from "../../context/AuthContext";
import { useQuiz } from "../../context/QuizContext";
import { Quiz } from "../../types/quiz";
import TopBar from "../../components/common/TopBar";
import BottomNav from "../../components/common/BottomNav";
import BlinkingMascot from "../../components/common/BlinkingMascot";
import TypewriterText from "../../components/common/TypewriterText";
import THEME from "../../config/theme";

export default function Dashboard() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { quizzes, startQuiz } = useQuiz();

  const featuredQuiz = quizzes[0];

  const handleStartStudy = (q?: Quiz) => {
    const targetQuiz = q || featuredQuiz;
    if (targetQuiz) {
      startQuiz(targetQuiz);
      navigation.navigate("QuizTaking", { quizId: targetQuiz.id });
    } else {
      navigation.navigate("UploadQuiz");
    }
  };

  return (
    <View style={styles.container}>
      <TopBar title="Home" showLogo={true} showActions={true} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting Header */}
        <Text style={styles.greetingText}>
          Good Morning, {user?.displayName?.split(" ")[0] || "Marty"}!
        </Text>

        {/* Companion Speech Bubble Card with Animated Blinking Mascot & Typing Text */}
        <View style={styles.companionCard}>
          <BlinkingMascot size={86} style={styles.mascotAvatar} />
          <View style={styles.speechBubbleWrapper}>
            <View style={styles.speechPointer} />
            <View style={styles.speechBubble}>
              <Text style={styles.speechTag}>SMARTY</Text>
              <TypewriterText
                text={"heyhey, how can i help you?\nupload any pptx, pdf, docs\nto start generate for you!"}
                style={styles.speechMessage}
                speed={30}
              />
            </View>
          </View>
        </View>

        {/* Primary Action Banner */}
        <TouchableOpacity
          onPress={() => navigation.navigate("UploadQuiz")}
          activeOpacity={0.9}
          style={styles.uploadBannerWrapper}
        >
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            colors={["#3D35D1", "#5844E8", "#783CE8"]}
            style={styles.uploadBanner}
          >
            <View style={styles.uploadLeft}>
              <Ionicons
                name="cloud-upload-outline"
                size={30}
                color="#FFFFFF"
                style={styles.cloudIcon}
              />
              <View style={styles.uploadTextGroup}>
                <Text style={styles.uploadTitle}>Upload a document</Text>
                <Text style={styles.uploadSubtitle}>
                  Turn a PDF or slide deck into a quiz
                </Text>
              </View>
            </View>
            <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* 3 Real Metrics Row */}
        <View style={styles.metricsRow}>
          <TouchableOpacity
            style={styles.metricItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("MyQuizzes")}
          >
            <Text style={styles.metricNumber}>{user?.quizzesTaken ?? 0}</Text>
            <Text style={styles.metricLabel}>QUIZZES</Text>
          </TouchableOpacity>

          <View style={styles.metricDivider} />

          <TouchableOpacity
            style={styles.metricItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("Performance")}
          >
            <Text style={styles.metricNumber}>
              {user?.avgScore !== undefined && user?.avgScore !== null ? `${user.avgScore}%` : "0%"}
            </Text>
            <Text style={styles.metricLabel}>AVG. SCORE</Text>
          </TouchableOpacity>

          <View style={styles.metricDivider} />

          <TouchableOpacity
            style={styles.metricItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("Achievements")}
          >
            <Text style={styles.metricNumber}>{user?.streak ?? 0}</Text>
            <Text style={styles.metricLabel}>DAY STREAK</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Achievements */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent achievements</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Achievements")}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.achievementsScroll}
        >
          <TouchableOpacity
            style={styles.achievementChip}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Achievements")}
          >
            <Text style={styles.achievementName}>Week Streak</Text>
            <Text style={styles.achievementDesc}>
              {user?.streak ? `${user.streak} days active` : "Start your streak"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.achievementChip}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Achievements")}
          >
            <Text style={styles.achievementName}>Average Score</Text>
            <Text style={styles.achievementDesc}>
              {user?.avgScore ? `${user.avgScore}% overall` : "No scores yet"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.achievementChip}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Achievements")}
          >
            <Text style={styles.achievementName}>Knowledge Rank</Text>
            <Text style={styles.achievementDesc}>{user?.tier || "Novice Scholar"}</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Available Quiz to Take (Real Data) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {featuredQuiz ? "Available quiz" : "Start studying"}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate("MyQuizzes")}>
            <Text style={styles.seeAllText}>All ({quizzes.length})</Text>
          </TouchableOpacity>
        </View>

        {featuredQuiz ? (
          <TouchableOpacity
            style={styles.studyCard}
            onPress={() => handleStartStudy(featuredQuiz)}
            activeOpacity={0.88}
          >
            <View style={styles.studyCardRow}>
              <View style={styles.studyIconBox}>
                <Ionicons name="book-outline" size={22} color={THEME.colors.primary} />
              </View>
              <View style={styles.studyInfoCol}>
                <Text style={styles.studyMetaText}>
                  {(featuredQuiz.category || "BIOLOGY").toUpperCase()} • {featuredQuiz.questions?.length || 4} QUESTIONS
                </Text>
                <Text style={styles.studyTitleText} numberOfLines={1}>
                  {featuredQuiz.title}
                </Text>
                {/* Real Progress / Score Bar */}
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: featuredQuiz.bestScore ? `${Math.min(100, featuredQuiz.bestScore)}%` : "100%" },
                    ]}
                  />
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.studyCard}
            onPress={() => navigation.navigate("UploadQuiz")}
            activeOpacity={0.88}
          >
            <View style={styles.studyCardRow}>
              <View style={styles.studyIconBox}>
                <Ionicons name="add-circle-outline" size={24} color={THEME.colors.primary} />
              </View>
              <View style={styles.studyInfoCol}>
                <Text style={styles.studyMetaText}>GET STARTED</Text>
                <Text style={styles.studyTitleText}>Create your first quiz now</Text>
                <Text style={styles.studyMetaText}>Upload a file or choose any topic</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        )}

        {/* Daily Smart Tip Card */}
        <TouchableOpacity
          style={styles.tipCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("UploadQuiz")}
        >
          <View style={styles.tipIconBox}>
            <Ionicons name="bulb-outline" size={22} color={THEME.colors.primary} />
          </View>
          <View style={styles.tipTextCol}>
            <Text style={styles.tipTag}>DAILY SMART TIP</Text>
            <Text style={styles.tipBody}>
              Quizzes generated directly from lecture notes boost memory retention by up to 34%. Tap to upload!
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <BottomNav activeTab="Home" />
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
    paddingTop: 14,
    paddingBottom: 24,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1B1931",
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  companionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  mascotAvatar: {
    width: 86,
    height: 90,
    marginRight: 8,
  },
  speechBubbleWrapper: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
  },
  speechPointer: {
    position: "absolute",
    left: -7,
    top: "38%",
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderTopColor: "transparent",
    borderBottomWidth: 7,
    borderBottomColor: "transparent",
    borderRightWidth: 8,
    borderRightColor: "#FFFFFF",
    zIndex: 3,
  },
  speechBubble: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 3,
  },
  speechTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FB7185",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  speechMessage: {
    fontSize: 12.5,
    color: "#374151",
    lineHeight: 17,
    fontWeight: "500",
  },
  uploadBannerWrapper: {
    width: "100%",
    marginBottom: 24,
    borderRadius: 20,
    shadowColor: "#3D35D1",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 8,
  },
  uploadBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  uploadLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cloudIcon: {
    marginRight: 14,
  },
  uploadTextGroup: {
    flex: 1,
  },
  uploadTitle: {
    fontSize: 17.5,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  uploadSubtitle: {
    fontSize: 12.5,
    color: "rgba(255, 255, 255, 0.85)",
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 4,
    marginBottom: 26,
  },
  metricItem: {
    alignItems: "center",
    flex: 1,
  },
  metricNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1B1931",
    marginBottom: 3,
  },
  metricLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.5,
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E5E7EB",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1B1931",
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.colors.primary,
  },
  inProgressBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  achievementsScroll: {
    paddingBottom: 4,
    marginBottom: 20,
  },
  achievementChip: {
    backgroundColor: "#F4F1FE",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 10,
  },
  achievementName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1B1931",
    marginBottom: 2,
  },
  achievementDesc: {
    fontSize: 12,
    color: "#6B7280",
  },
  studyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  studyCardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  studyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  studyInfoCol: {
    flex: 1,
    marginRight: 8,
  },
  studyMetaText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  studyTitleText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1B1931",
    marginBottom: 8,
  },
  progressBarTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EDE9FE",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: THEME.colors.primary,
    borderRadius: 3,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F6F3FE",
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EBE5FE",
  },
  tipIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  tipTextCol: {
    flex: 1,
  },
  tipTag: {
    fontSize: 11,
    fontWeight: "800",
    color: THEME.colors.primary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  tipBody: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
    fontWeight: "500",
  },
});