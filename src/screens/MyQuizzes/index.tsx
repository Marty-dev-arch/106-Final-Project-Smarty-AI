import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../types/navigation";
import { useQuiz } from "../../context/QuizContext";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import TopBar from "../../components/common/TopBar";
import BottomNav from "../../components/common/BottomNav";
import TabSlideWrapper from "../../components/common/TabSlideWrapper";
import { MyQuizzesSkeleton } from "../../components/common/SkeletonLoader";
import { triggerHaptic } from "../../utils/haptics";
import THEME from "../../config/theme";

export default function MyQuizzes() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, refreshUser } = useAuth();
  const { quizzes, mistakes, startQuiz, isLoading, refreshData } = useQuiz();
  const { colors, isDark } = useTheme();
  const [filter, setFilter] = useState<"all" | "inProgress" | "completed" | "unstarted">("all");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerHaptic.light();
    try {
      await Promise.all([refreshData(), refreshUser()]);
    } catch (e) {
      console.warn("MyQuizzes refresh error:", e);
    } finally {
      setRefreshing(false);
    }
  }, [refreshData, refreshUser]);

  const handleOpenQuiz = (quizId: string) => {
    triggerHaptic.medium();
    const q = quizzes.find((item) => item.id === quizId) || quizzes[0];
    if (q) {
      startQuiz(q);
      navigation.navigate("QuizTaking", { quizId: q.id });
    }
  };

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = q.title.toLowerCase().includes(query);
        const matchesCat = (q.category || "").toLowerCase().includes(query);
        if (!matchesTitle && !matchesCat) return false;
      }
      // Tab filter
      if (filter === "completed") {
        return q.bestScore !== undefined && q.bestScore > 0;
      }
      if (filter === "inProgress" || filter === "unstarted") {
        return !q.bestScore;
      }
      return true;
    });
  }, [quizzes, filter, searchQuery]);

  const quizzesDone = (user?.quizzesTaken ?? 0) === 0 || quizzes.length === 0 ? 0 : user?.quizzesTaken ?? 0;
  const streakPercent = Math.min(100, Math.round((quizzesDone / Math.max(1, quizzesDone + 2)) * 100));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar title="Quizzes" showLogo showActions />

      <TabSlideWrapper>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary, "#783CE8"]}
          />
        }
      >
        {isLoading ? (
          <MyQuizzesSkeleton />
        ) : (
          <>
            {/* Title Header with Search & Filter Icons */}
            <View style={styles.titleRow}>
              <Text style={[styles.pageTitle, { color: colors.text }]}>My quizzes</Text>
          <View style={styles.titleIconsRow}>
            <TouchableOpacity
              style={styles.iconBtn}
              activeOpacity={0.7}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Ionicons
                name={showSearch ? "close" : "search-outline"}
                size={22}
                color={colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              activeOpacity={0.7}
              onPress={() => {
                const nextFilter = filter === "all" ? "completed" : filter === "completed" ? "unstarted" : "all";
                setFilter(nextFilter);
              }}
            >
              <Ionicons name="options-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Optional Search Bar */}
        {showSearch && (
          <View style={[styles.searchBarWrapper, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchBarInput, { color: colors.text }]}
              placeholder="Search quizzes by title or category..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Weekly Streak Card */}
        <View style={styles.streakWrapper}>
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            colors={["#4F46E5", "#6366F1", "#7C3AED"]}
            style={styles.streakCard}
          >
            <Text style={styles.streakTag}>WEEKLY STREAK</Text>
            <Text style={styles.streakMainTitle}>
              {quizzesDone} {quizzesDone === 1 ? "Quiz Done" : "Quizzes Done"}
            </Text>
            <Text style={styles.streakSubtitle}>
              {user?.streak ? `${user.streak} day streak active!` : "Complete a quiz today to start your streak!"}
            </Text>

            <View style={styles.streakProgressRow}>
              <View style={styles.streakTrack}>
                <View style={[styles.streakFill, { width: `${streakPercent}%` }]} />
              </View>
              <Text style={styles.streakPercentText}>{streakPercent}%</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {[
            { key: "all", label: `All (${quizzes.length})` },
            { key: "mistakes", label: `Mistake Bank (${mistakes.length})` },
            { key: "inProgress", label: "In Progress" },
            { key: "completed", label: "Completed" },
            { key: "unstarted", label: "Unstarted" },
          ].map((item) => {
            const isSelected = filter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.filterPill,
                  { backgroundColor: isDark ? colors.card : "#F3F4F6", borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 },
                  isSelected && styles.filterPillActive,
                  item.key === "mistakes" && { borderColor: "#FCA5A5", backgroundColor: isDark ? "#3F1818" : "#FEF2F2", borderWidth: 1 },
                ]}
                onPress={() => {
                  if (item.key === "mistakes") {
                    navigation.navigate("MistakeBank");
                  } else {
                    setFilter(item.key as any);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: colors.textSecondary },
                    isSelected && styles.filterTextActive,
                    item.key === "mistakes" && { color: "#EF4444", fontWeight: "700" },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Dynamic Quizzes List */}
        {filteredQuizzes.length > 0 ? (
          filteredQuizzes.map((quiz) => {
            const hasScore = quiz.bestScore !== undefined && quiz.bestScore !== null;
            const diffMeta = (() => {
              const d = (quiz.difficulty || "medium").toLowerCase();
              if (d === "easy") {
                return {
                  label: "Easy",
                  bg: isDark ? "rgba(16, 185, 129, 0.18)" : "#ECFDF5",
                  color: isDark ? "#34D399" : "#059669",
                  borderColor: isDark ? "rgba(16, 185, 129, 0.35)" : "#A7F3D0",
                };
              } else if (d === "hard") {
                return {
                  label: "Hard",
                  bg: isDark ? "rgba(239, 68, 68, 0.18)" : "#FEF2F2",
                  color: isDark ? "#FCA5A5" : "#DC2626",
                  borderColor: isDark ? "rgba(239, 68, 68, 0.35)" : "#FCA5A5",
                };
              }
              return {
                label: "Medium",
                bg: isDark ? "rgba(99, 102, 241, 0.18)" : "#EEF2FF",
                color: isDark ? "#A5B4FC" : "#4F46E5",
                borderColor: isDark ? "rgba(99, 102, 241, 0.35)" : "#C7D2FE",
              };
            })();

            return (
              <TouchableOpacity
                key={quiz.id}
                style={[styles.quizCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => handleOpenQuiz(quiz.id)}
                activeOpacity={0.88}
              >
                <View style={styles.cardTopRow}>
                  <View style={[styles.iconBox, isDark && { backgroundColor: "#1E1B4B" }]}>
                    <Ionicons name="book-outline" size={20} color={THEME.colors.primary} />
                  </View>
                  <View style={styles.cardHeaderInfo}>
                    <View style={styles.nameBadgeRow}>
                      <Text style={[styles.quizName, { color: colors.text }]} numberOfLines={1}>
                        {quiz.title}
                      </Text>
                      <View style={styles.badgeGroup}>
                        <View style={[styles.difficultyBadge, { backgroundColor: diffMeta.bg, borderColor: diffMeta.borderColor }]}>
                          <Text style={[styles.difficultyText, { color: diffMeta.color }]}>{diffMeta.label}</Text>
                        </View>
                        {typeof quiz.savedProgressIndex === "number" && quiz.savedProgressIndex > 0 ? (
                          <View style={[styles.scoreBadge, { backgroundColor: isDark ? "#2E1065" : "#F5F3FF", borderColor: "#8B5CF6", borderWidth: 1 }]}>
                            <Text style={[styles.scoreBadgeText, { color: "#7C3AED", fontWeight: "800" }]}>
                              Resume Q{quiz.savedProgressIndex + 1}
                            </Text>
                          </View>
                        ) : hasScore ? (
                          <View style={[styles.scoreBadge, isDark && { backgroundColor: "#1E1B4B" }]}>
                            <Text style={styles.scoreBadgeText}>{quiz.bestScore}%</Text>
                            <Ionicons name="checkmark" size={12} color="#8B5CF6" style={{ marginLeft: 2 }} />
                          </View>
                        ) : (
                          <Text style={styles.newBadgeText}>Ready</Text>
                        )}
                      </View>
                    </View>
                    <Text style={[styles.quizMeta, { color: colors.textSecondary }]}>
                      {quiz.category || "General"} • {quiz.questions?.length || quiz.questionsCount || 4} questions
                    </Text>
                  </View>
                </View>

                <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
                <View style={styles.cardFooterRow}>
                  <View style={styles.footerLeft}>
                    <Ionicons
                      name={hasScore ? "stats-chart-outline" : "play-circle-outline"}
                      size={14}
                      color={hasScore ? "#8B5CF6" : colors.textSecondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[hasScore ? styles.masteredText : styles.completedText, { color: hasScore ? "#8B5CF6" : colors.textSecondary }]}>
                      {hasScore ? "Score Mastered" : "Tap to start quiz"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={44} color={colors.textMuted} style={{ marginBottom: 10 }} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No quizzes found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Try changing your filter or create a new quiz!</Text>
            <TouchableOpacity
              style={styles.createFirstBtn}
              onPress={() => navigation.navigate("UploadQuiz")}
              activeOpacity={0.85}
            >
              <Text style={styles.createFirstBtnText}>+ Create a Quiz</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom CTA Card: Generate New Quiz */}
        <View style={[styles.generateCtaCard, { backgroundColor: isDark ? colors.card : "#F8FAFC", borderColor: colors.cardBorder, borderWidth: 1 }]}>
          <Image
            source={require("../../../assets/illustrations/smarty_logo.png")}
            style={styles.ctaMascot}
            resizeMode="contain"
          />
          <View style={styles.ctaTextCol}>
            <Text style={[styles.ctaTitle, { color: colors.text }]}>Generate New Quiz</Text>
            <Text style={[styles.ctaSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              Turn notes or topics into a quiz in seconds
            </Text>
          </View>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => navigation.navigate("UploadQuiz")}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaBtnText}>Create</Text>
          </TouchableOpacity>
        </View>
        </>
        )}
      </ScrollView>
      </TabSlideWrapper>

      <BottomNav activeTab="Quizzes" />
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
    paddingTop: 10,
    paddingBottom: 24,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1B1931",
    letterSpacing: -0.3,
  },
  titleIconsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBtn: {
    padding: 6,
    marginLeft: 10,
  },
  streakWrapper: {
    width: "100%",
    marginBottom: 18,
    borderRadius: 20,
    shadowColor: "#4F46E5",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 8,
  },
  streakCard: {
    borderRadius: 20,
    padding: 20,
  },
  streakTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.85)",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  streakMainTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  streakSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.85)",
    marginBottom: 16,
  },
  streakProgressRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  streakTrack: {
    flex: 1,
    height: 7,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 4,
    marginRight: 12,
    overflow: "hidden",
  },
  streakFill: {
    height: "100%",
    backgroundColor: "#FFDDB5",
    borderRadius: 4,
  },
  streakPercentText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  filterScroll: {
    paddingBottom: 4,
    marginBottom: 18,
  },
  filterPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 9999,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: "#4648D4",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  filterTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  quizCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  difficultyBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  difficultyText: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  quizName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1B1931",
    flex: 1,
    marginRight: 8,
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  scoreBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4648D4",
  },
  inProgressFraction: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4648D4",
  },
  newBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  quizMeta: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  midProgressBarTrack: {
    width: "100%",
    height: 5,
    backgroundColor: "#EDE9FE",
    borderRadius: 3,
    marginTop: 12,
    overflow: "hidden",
  },
  midProgressBarFill: {
    height: "100%",
    backgroundColor: "#4648D4",
    borderRadius: 3,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginTop: 12,
  },
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  masteredText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4648D4",
  },
  remainingText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  recommendedText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EA580C",
  },
  completedText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  generateCtaCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F3FE",
    borderRadius: 18,
    padding: 14,
    marginTop: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EDE9FE",
  },
  ctaMascot: {
    width: 38,
    height: 38,
    marginRight: 10,
  },
  ctaTextCol: {
    flex: 1,
    marginRight: 8,
  },
  ctaTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1B1931",
    marginBottom: 2,
  },
  ctaSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  ctaBtn: {
    backgroundColor: "#4648D4",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 18,
  },
  ctaBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 14,
    color: "#1B1931",
    padding: 0,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: "#F9FAFB",
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    borderStyle: "dashed",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B1931",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
  },
  createFirstBtn: {
    backgroundColor: "#4648D4",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  createFirstBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});