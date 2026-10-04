import React from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../types/navigation";
import BottomNav from "../../components/common/BottomNav";
import ConfettiCannon from "../../components/common/ConfettiCannon";

export default function MedalDetails() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "MedalDetails">>();

  const medal = route.params?.medal;
  const medalName = medal?.title || "Achievement";
  const isUnlocked = Boolean(medal?.unlocked);

  const unlockedDate =
    medal?.unlockedDate ||
    (medal as any)?.earnedDate ||
    new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const progressCount = medal?.progress ?? (isUnlocked ? (medal?.totalRequired || 10) : 0);
  const totalRequired = medal?.totalRequired || 10;
  const progressPercent = Math.min(100, Math.round((progressCount / totalRequired) * 100));

  const handleShare = async () => {
    if (!isUnlocked) return;
    try {
      await Share.share({
        message: `I just unlocked the ${medalName} achievement on Smarty AI! 🏆`,
      });
    } catch (e) {
      // Ignored
    }
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
      {/* Confetti Cannon ONLY on Unlocked Medal */}
      {isUnlocked && <ConfettiCannon count={40} active={true} />}

      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Achievement Details</Text>

        <View style={styles.headerRightActions}>
          {isUnlocked && (
            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={handleShare}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="share-social-outline" size={20} color="#111827" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrapper}>
          {/* Hero Medal Showcase Card */}
          <LinearGradient
            colors={isUnlocked ? ["#FAF5FF", "#FFFBEB", "#FDF2F8"] : ["#F8FAFC", "#F1F5F9", "#E2E8F0"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, !isUnlocked && { borderColor: "#E2E8F0" }]}
          >
            {/* Medal Circle with EARNED / LOCKED badge */}
            <View style={styles.heroMedalWrapper}>
              <LinearGradient
                colors={
                  isUnlocked
                    ? ["#E5A93C", "#C2831B", "#8C5810"]
                    : ["#94A3B8", "#64748B", "#475569"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.heroGoldCircle, !isUnlocked && { shadowColor: "#64748B" }]}
              >
                <Ionicons
                  name={isUnlocked ? "ribbon" : "lock-closed"}
                  size={44}
                  color="#FFFFFF"
                />
              </LinearGradient>

              {isUnlocked ? (
                <View style={styles.earnedPill}>
                  <Ionicons name="checkmark" size={10} color="#FFFFFF" style={{ marginRight: 3 }} />
                  <Text style={styles.earnedPillText}>EARNED</Text>
                </View>
              ) : (
                <View style={[styles.earnedPill, { backgroundColor: "#334155" }]}>
                  <Ionicons name="lock-closed" size={10} color="#FFFFFF" style={{ marginRight: 3 }} />
                  <Text style={styles.earnedPillText}>LOCKED</Text>
                </View>
              )}
            </View>

            {/* Tag Badges */}
            <View style={styles.heroTagsRow}>
              <View style={[styles.goldTierBadge, !isUnlocked && { backgroundColor: "#E2E8F0" }]}>
                <Text style={[styles.goldTierText, !isUnlocked && { color: "#475569" }]}>
                  {medal?.subtitle?.toUpperCase() || (isUnlocked ? "GOLD TIER" : "LOCKED TIER")}
                </Text>
              </View>
              <View style={[styles.unlockedBadge, !isUnlocked && { backgroundColor: "#F1F5F9" }]}>
                <Text style={[styles.unlockedText, !isUnlocked && { color: "#64748B" }]}>
                  {isUnlocked ? "Unlocked" : "Locked"}
                </Text>
              </View>
            </View>

            {/* Title & Description */}
            <Text style={styles.heroTitle}>{medalName}</Text>
            <View style={styles.dateRow}>
              <Ionicons
                name={isUnlocked ? "calendar-outline" : "information-circle-outline"}
                size={13}
                color="#6B7280"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.dateText}>
                {isUnlocked
                  ? `Unlocked on ${unlockedDate}`
                  : "Criteria not met yet — complete study goals to unlock"}
              </Text>
            </View>
            <Text style={styles.heroDescription}>
              {medal?.description || "Complete study requirements and quizzes to earn this achievement badge."}
            </Text>
          </LinearGradient>

          {/* Achievement Progress Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons
                  name={isUnlocked ? "checkmark-circle" : "time-outline"}
                  size={16}
                  color={isUnlocked ? "#10B981" : "#6366F1"}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.sectionHeaderTitle}>Achievement Progress</Text>
              </View>
              <Text style={[styles.masteredFraction, !isUnlocked && { color: "#6366F1" }]}>
                {isUnlocked
                  ? `${totalRequired} / ${totalRequired} Mastered`
                  : `${progressCount} / ${totalRequired} Completed`}
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${isUnlocked ? 100 : progressPercent}%`,
                    backgroundColor: isUnlocked ? "#10B981" : "#6366F1",
                  },
                ]}
              />
            </View>

            {/* 2x2 Metric Grid */}
            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, { backgroundColor: "#F9FAFB" }]}>
                <Text style={styles.metricLabel}>Requirement Status</Text>
                <Text style={[styles.metricValue, { color: isUnlocked ? "#10B981" : "#F59E0B" }]}>
                  {isUnlocked ? "Achieved" : `${progressPercent}%`}
                </Text>
                <Text style={styles.metricSubGold}>
                  {isUnlocked ? "Full criteria met" : `${totalRequired - progressCount} remaining`}
                </Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: "#F5F3FF" }]}>
                <Text style={styles.metricLabel}>Category</Text>
                <Text style={styles.metricValue}>{medal?.category || "General"}</Text>
                <Text style={styles.metricSubBlue}>Study Track</Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: "#F9FAFB" }]}>
                <Text style={styles.metricLabel}>Reward</Text>
                <Text style={styles.metricValue}>+250 XP</Text>
                <Text style={styles.metricSubGray}>Profile XP bonus</Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: "#F5F3FF" }]}>
                <Text style={styles.metricLabel}>Status</Text>
                <Text
                  style={[
                    styles.metricValue,
                    { color: isUnlocked ? "#10B981" : "#64748B" },
                  ]}
                >
                  {isUnlocked ? "Unlocked" : "In Progress"}
                </Text>
                <Text style={styles.metricSubGray}>
                  {isUnlocked ? "Active badge" : "Pending completion"}
                </Text>
              </View>
            </View>
          </View>

          {/* Rewards & Perks Section */}
          <View style={styles.sectionCard}>
            <View style={styles.perksHeaderRow}>
              <Ionicons name="star" size={14} color="#D97706" style={{ marginRight: 6 }} />
              <Text style={styles.sectionHeaderTitle}>
                {isUnlocked ? "Rewards & Perks Unlocked" : "Locked Rewards & Perks"}
              </Text>
            </View>

            {/* Perk 1 */}
            <View style={styles.perkCard}>
              <Ionicons name="ribbon-outline" size={18} color="#111827" style={styles.perkIcon} />
              <View style={styles.perkInfo}>
                <Text style={styles.perkTitle}>+250 Experience Points</Text>
                <Text style={styles.perkSubtitle}>Added to Profile XP and leaderboard</Text>
              </View>
              <Text style={isUnlocked ? styles.perkRightGold : { color: "#94A3B8", fontSize: 11, fontWeight: "700" }}>
                {isUnlocked ? "+250 XP" : "Locked"}
              </Text>
            </View>

            {/* Perk 2 */}
            <View style={styles.perkCard}>
              <Ionicons name="shield-outline" size={18} color="#111827" style={styles.perkIcon} />
              <View style={styles.perkInfo}>
                <Text style={styles.perkTitle}>{medalName} Profile Badge</Text>
                <Text style={styles.perkSubtitle}>Exclusive achievement flair for profile showcase</Text>
              </View>
              <Text style={isUnlocked ? styles.perkRightGreen : { color: "#94A3B8", fontSize: 11, fontWeight: "700" }}>
                {isUnlocked ? "Active" : "Locked"}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          {isUnlocked ? (
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
              activeOpacity={0.88}
            >
              <Ionicons name="share-social-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.shareButtonText}>Share Achievement</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: "#6366F1" }]}
              onPress={() => navigation.navigate("UploadQuiz")}
              activeOpacity={0.88}
            >
              <Ionicons name="play-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.shareButtonText}>Take Quizzes to Unlock</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.backLinkButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back-outline" size={15} color="#4338CA" style={{ marginRight: 6 }} />
            <Text style={styles.backLinkButtonText}>Back to Achievements</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Persistent Bottom Navigation */}
      <BottomNav activeTab="Awards" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.2,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionIconBtn: {
    padding: 6,
    marginLeft: 6,
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
  heroCard: {
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F0FF",
  },
  heroMedalWrapper: {
    position: "relative",
    alignItems: "center",
    marginBottom: 14,
  },
  heroGoldCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#C2831B",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 5,
  },
  earnedPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#5A370A",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: -10,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  earnedPillText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  heroTagsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  goldTierBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
  },
  goldTierText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#92400E",
  },
  unlockedBadge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  unlockedText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#6D28D9",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 2,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  dateText: {
    fontSize: 11,
    color: "#6B7280",
  },
  heroDescription: {
    fontSize: 11,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 12,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F2F6",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  masteredFraction: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4338CA",
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 14,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4338CA",
    borderRadius: 3,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  metricCard: {
    width: "48%",
    borderRadius: 12,
    padding: 12,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
  },
  metricValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    marginVertical: 2,
  },
  metricSubGold: {
    fontSize: 9,
    fontWeight: "700",
    color: "#D97706",
  },
  metricSubBlue: {
    fontSize: 9,
    fontWeight: "700",
    color: "#4338CA",
  },
  metricSubGray: {
    fontSize: 9,
    color: "#6B7280",
  },
  perksHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  perkCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F6FF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  perkIcon: {
    marginRight: 10,
  },
  perkInfo: {
    flex: 1,
  },
  perkTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  perkSubtitle: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 1,
  },
  perkRightGold: {
    fontSize: 10,
    fontWeight: "800",
    color: "#D97706",
  },
  perkRightGreen: {
    fontSize: 10,
    fontWeight: "800",
    color: "#10B981",
  },
  perkRightPurple: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6D28D9",
  },
  relatedSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  relatedSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  viewAllLink: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4338CA",
  },
  relatedMedalsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F2F6",
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  relatedMedalItem: {
    alignItems: "center",
  },
  relatedGoldCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  relatedTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
  },
  relatedEarned: {
    fontSize: 9,
    fontWeight: "700",
    color: "#D97706",
  },
  shareButton: {
    backgroundColor: "#4338CA",
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#4338CA",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  shareButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  backLinkButton: {
    backgroundColor: "#EDE9FE",
    height: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  backLinkButtonText: {
    color: "#4338CA",
    fontSize: 13,
    fontWeight: "700",
  },
});