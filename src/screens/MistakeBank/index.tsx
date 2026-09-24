import React, { useState } from "react";
import {
  View,
  ScrollView,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../types/navigation";
import { useQuiz } from "../../context/QuizContext";
import TopBar from "../../components/common/TopBar";
import BottomNav from "../../components/common/BottomNav";

interface MistakeItemData {
  id: string;
  category: string;
  subject: "Biology" | "Chemistry" | "History";
  failedCount: number;
  missedTime: string;
  prompt: string;
  yourAnswer: string;
  correctAnswer: string;
  explanation: string;
  isMastered?: boolean;
}

const INITIAL_MISTAKES: MistakeItemData[] = [
  {
    id: "m_1",
    category: "Biology • Cell Biology Ch. 4",
    subject: "Biology",
    failedCount: 2,
    missedTime: "Missed 2 hrs ago",
    prompt: "The cell membrane is completely impermeable to all molecules.",
    yourAnswer: "True",
    correctAnswer: "False — selectively permeable",
    explanation:
      "Cell membranes are selectively permeable, allowing non-polar molecules like O2 and CO2 to diffuse freely while regulated channels control water and ions.",
  },
  {
    id: "m_2",
    category: "Chemistry • Reaction Mechanisms",
    subject: "Chemistry",
    failedCount: 1,
    missedTime: "Missed Yesterday",
    prompt: "What is the rate-determining step in an SN1 nucleophilic substitution reaction?",
    yourAnswer: "Nucleophilic attack",
    correctAnswer: "Formation of the carbocation intermediate",
    explanation:
      "In SN1 reactions, unimolecular loss of the leaving group to form a stable carbocation intermediate is the slowest and rate-limiting step.",
  },
  {
    id: "m_3",
    category: "History • World War II",
    subject: "History",
    failedCount: 1,
    missedTime: "Missed 3 days ago",
    prompt: "In which year did the Battle of Stalingrad conclude?",
    yourAnswer: "1941",
    correctAnswer: "February 1943",
    explanation:
      "The Battle of Stalingrad concluded in February 1943 with the surrender of the German Sixth Army, turning the tide on the Eastern Front.",
  },
];

export default function MistakeBank() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { startMistakePractice } = useQuiz();

  const [activeFilter, setActiveFilter] = useState<string>("All (14)");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    m_1: false,
    m_2: false,
    m_3: false,
  });
  const [mistakesList, setMistakesList] = useState<MistakeItemData[]>(INITIAL_MISTAKES);

  const toggleAccordion = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleMarkMastered = (id: string) => {
    setMistakesList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isMastered: !item.isMastered } : item
      )
    );
  };

  const handlePracticeSingle = () => {
    startMistakePractice();
    navigation.navigate("QuizTaking", { isMistakePractice: true });
  };

  const handlePracticeAll = () => {
    startMistakePractice();
    navigation.navigate("QuizTaking", { isMistakePractice: true });
  };

  const filterOptions = [
    { label: "All (14)", value: "All (14)" },
    { label: "Biology (6)", value: "Biology" },
    { label: "Chemistry (5)", value: "Chemistry" },
    { label: "History (3)", value: "History" },
  ];

  const visibleMistakes = mistakesList.filter((m) => {
    if (activeFilter === "All (14)") return true;
    return m.subject === activeFilter;
  });

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.container}>
      <TopBar
        title="Mistake Bank"
        showBack={true}
        onBack={() => navigation.goBack()}
        showLogo={false}
        showBell
        showActions
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrapper}>
          {/* Header Subtitle Row */}
          <View style={styles.heroHeader}>
            <View style={styles.heroLeftCol}>
              <View style={styles.tagsRow}>
                <View style={styles.needsPracticePill}>
                  <Text style={styles.needsPracticeText}>Needs Practice</Text>
                </View>
                <Text style={styles.spacedRepetitionText}>Spaced Repetition</Text>
              </View>

              <Text style={styles.heroTitle}>14 Questions to Master</Text>
              <Text style={styles.heroSubtitle}>
                Turn recent stumbles into permanent recall points
              </Text>
            </View>

            <Image
              source={require("../../../assets/illustrations/smarty_logo.png")}
              style={styles.heroMascot}
              resizeMode="contain"
            />
          </View>

          {/* Adaptive Session Banner Card */}
          <LinearGradient
            colors={["#4648D4", "#6063EE", "#8455EF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.adaptiveCard}
          >
            <View style={styles.adaptiveHeaderRow}>
              <Ionicons name="sparkles" size={13} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.adaptiveTag}>ADAPTIVE SESSION</Text>
            </View>

            <Text style={styles.adaptiveTitle}>Smart Review Session</Text>
            <Text style={styles.adaptiveDesc}>
              Practice your 14 mistakes in spaced repetition to turn weak spots into masteries.
            </Text>

            <TouchableOpacity
              style={styles.practiceAllButton}
              onPress={handlePracticeAll}
              activeOpacity={0.88}
            >
              <Ionicons name="play" size={13} color="#4338CA" style={{ marginRight: 6 }} />
              <Text style={styles.practiceAllButtonText}>Practice All Missed (14)</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* 3 Metric Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statTopRow}>
                <Text style={[styles.statValue, { color: "#DC2626" }]}>! 14</Text>
              </View>
              <Text style={styles.statLabel}>Needs Review</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statTopRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 4 }} />
                <Text style={[styles.statValue, { color: "#10B981" }]}>32</Text>
              </View>
              <Text style={styles.statLabel}>Cleared</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statTopRow}>
                <Ionicons name="trending-up" size={16} color="#059669" style={{ marginRight: 4 }} />
                <Text style={[styles.statValue, { color: "#059669" }]}>68%</Text>
              </View>
              <Text style={styles.statLabel}>Retention</Text>
            </View>
          </View>

          {/* Filter Chips Row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {filterOptions.map((opt) => {
              const isActive = activeFilter === opt.value;
              return (
                <TouchableOpacity
                  key={opt.label}
                  style={[
                    styles.filterChip,
                    isActive ? styles.filterChipActive : styles.filterChipInactive,
                  ]}
                  onPress={() => setActiveFilter(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isActive ? styles.filterChipTextActive : styles.filterChipTextInactive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Mistake Cards */}
          {visibleMistakes.map((item) => {
            const isExpanded = !!expandedIds[item.id];
            return (
              <View key={item.id} style={styles.mistakeCard}>
                {/* Card Top Category & Failed count */}
                <View style={styles.mistakeTopRow}>
                  <View style={styles.categoryPill}>
                    <Ionicons name="flask-outline" size={12} color="#4338CA" style={{ marginRight: 4 }} />
                    <Text style={styles.categoryPillText}>{item.category}</Text>
                  </View>
                  <Text style={styles.failedCountText}>Failed {item.failedCount}x</Text>
                </View>

                {/* Missed Time Tag */}
                <View style={styles.timeTag}>
                  <Text style={styles.timeTagText}>{item.missedTime}</Text>
                </View>

                {/* Question Prompt */}
                <Text style={styles.promptText}>{item.prompt}</Text>

                {/* Your Answer Box */}
                <View style={styles.wrongAnswerBox}>
                  <Ionicons name="close-circle-outline" size={15} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={styles.wrongAnswerLabel}>Your Answer: </Text>
                  <Text style={styles.wrongAnswerValue}>{item.yourAnswer} ✕</Text>
                </View>

                {/* Correct Answer Box */}
                <View style={styles.correctAnswerBox}>
                  <Ionicons name="checkmark-circle-outline" size={15} color="#15803D" style={{ marginRight: 6 }} />
                  <Text style={styles.correctAnswerLabel}>Correct: </Text>
                  <Text style={styles.correctAnswerValue}>{item.correctAnswer} ✓</Text>
                </View>

                {/* AI Micro-Explanation Accordion */}
                <TouchableOpacity
                  style={styles.microAccordionHeader}
                  onPress={() => toggleAccordion(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.microAccordionHeaderLeft}>
                    <Ionicons name="bulb-outline" size={14} color="#D97706" style={{ marginRight: 6 }} />
                    <Text style={styles.microAccordionTitle}>AI Micro-Explanation</Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={14}
                    color="#4338CA"
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.microExplanationBody}>
                    <Text style={styles.microExplanationText}>{item.explanation}</Text>
                  </View>
                )}

                {/* Action Buttons Row */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.practiceNowButton}
                    onPress={handlePracticeSingle}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh-outline" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.practiceNowText}>Practice Now</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.masteredButton,
                      item.isMastered && styles.masteredButtonActive,
                    ]}
                    onPress={() => handleMarkMastered(item.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={item.isMastered ? "checkmark-circle" : "checkmark"}
                      size={14}
                      color="#059669"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.masteredText}>
                      {item.isMastered ? "Mastered" : "Mark as Mastered"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {/* AI Learning Tip Card */}
          <View style={styles.aiTipCard}>
            <View style={styles.aiTipIconBox}>
              <Ionicons name="bulb" size={20} color="#6366F1" />
            </View>
            <View style={styles.aiTipTextCol}>
              <Text style={styles.aiTipHeader}>💡 AI LEARNING TIP</Text>
              <Text style={styles.aiTipDescription}>
                Practicing mistakes within 48 hours boosts long-term retention by up to{" "}
                <Text style={styles.aiTipHighlight}>80%</Text>.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Persistent Bottom Nav */}
      <BottomNav activeTab="Quizzes" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 16,
  },
  heroLeftCol: {
    flex: 1,
    paddingRight: 10,
  },
  tagsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  needsPracticePill: {
    backgroundColor: "#FEE2E2",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  needsPracticeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#DC2626",
  },
  spacedRepetitionText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E1B4B",
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 3,
    lineHeight: 16,
  },
  heroMascot: {
    width: 44,
    height: 44,
  },
  adaptiveCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#4338CA",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  adaptiveHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  adaptiveTag: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFFCC",
    letterSpacing: 0.8,
  },
  adaptiveTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 2,
    marginBottom: 4,
  },
  adaptiveDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: "#FFFFFFEE",
    marginBottom: 16,
  },
  practiceAllButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  practiceAllButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4338CA",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F2F6",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginHorizontal: 3,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  statTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterScroll: {
    paddingBottom: 14,
  },
  filterChip: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#4338CA",
  },
  filterChipInactive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  filterChipTextInactive: {
    color: "#4B5563",
  },
  mistakeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F2F6",
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 1,
  },
  mistakeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4338CA",
  },
  failedCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B91C1C",
  },
  timeTag: {
    alignSelf: "flex-start",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 8,
  },
  timeTagText: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
  },
  promptText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 20,
    marginBottom: 10,
  },
  wrongAnswerBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  wrongAnswerLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B91C1C",
  },
  wrongAnswerValue: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
  },
  correctAnswerBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  correctAnswerLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },
  correctAnswerValue: {
    fontSize: 12,
    color: "#16A34A",
    fontWeight: "600",
  },
  microAccordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F6FF",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  microAccordionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  microAccordionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4338CA",
  },
  microExplanationBody: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  microExplanationText: {
    fontSize: 11,
    lineHeight: 16,
    color: "#4B5563",
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  practiceNowButton: {
    flex: 1,
    backgroundColor: "#4338CA",
    borderRadius: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  practiceNowText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  masteredButton: {
    flex: 1,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  masteredButtonActive: {
    backgroundColor: "#D1FAE5",
  },
  masteredText: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "700",
  },
  aiTipCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
    marginBottom: 20,
  },
  aiTipIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  aiTipTextCol: {
    flex: 1,
  },
  aiTipHeader: {
    fontSize: 10,
    fontWeight: "800",
    color: "#D97706",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  aiTipDescription: {
    fontSize: 11,
    color: "#4B5563",
    lineHeight: 16,
  },
  aiTipHighlight: {
    color: "#4338CA",
    fontWeight: "800",
  },
});