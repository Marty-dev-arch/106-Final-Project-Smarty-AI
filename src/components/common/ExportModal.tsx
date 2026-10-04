import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Switch,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Quiz, QuizAttempt } from "../../types/quiz";
import { exportService, ExportFormat, ExportOptions } from "../../utils/exportService";
import { useToast } from "../../context/ToastContext";
import { useTheme } from "../../context/ThemeContext";
import { triggerHaptic } from "../../utils/haptics";
import THEME from "../../config/theme";

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
  quiz: Quiz;
  attempt?: QuizAttempt | null;
}

export default function ExportModal({ visible, onClose, quiz, attempt }: ExportModalProps) {
  const { showToast } = useToast();
  const { colors, isDark } = useTheme();

  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [includeAnswerKey, setIncludeAnswerKey] = useState<boolean>(true);
  const [includeStudentScore, setIncludeStudentScore] = useState<boolean>(true);

  const handleExport = async (format: ExportFormat) => {
    if (exportingFormat) return;

    triggerHaptic.selection();
    setExportingFormat(format);

    try {
      const options: ExportOptions = {
        includeAnswerKey,
        includeStudentScore: attempt ? includeStudentScore : false,
      };

      await exportService.exportQuiz(quiz, format, attempt, options);

      triggerHaptic.success();
      onClose();
      showToast({
        type: "success",
        title: "Export Ready ✨",
        message: `"${quiz.title}" exported as .${format}!`,
      });
    } catch (e: any) {
      console.error("[ExportModal] Export failed:", e);
      triggerHaptic.warning();
      showToast({
        type: "error",
        title: "Export Notice",
        message: e?.message || "Failed to export quiz file. Please try again.",
      });
    } finally {
      setExportingFormat(null);
    }
  };

  const isBusy = exportingFormat !== null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!isBusy) onClose();
      }}
    >
      <TouchableWithoutFeedback onPress={() => !isBusy && onClose()}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  shadowColor: isDark ? "#000000" : "#0F172A",
                },
              ]}
            >
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.headerLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: isDark ? "#312E81" : "#EEF2FF" }]}>
                    <Ionicons name="download-outline" size={20} color={THEME.colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Export & Study Guide</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                      Select format to download or share
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  disabled={isBusy}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Quiz Title Banner */}
              <View style={[styles.quizTitleBox, { backgroundColor: isDark ? "#1E293B" : "#F5F3FF" }]}>
                <Ionicons name="document-text-outline" size={16} color="#6366F1" style={{ marginRight: 8 }} />
                <Text style={[styles.quizTitleText, { color: colors.text }]} numberOfLines={1}>
                  {quiz.title}
                </Text>
              </View>

              {/* Customization Options */}
              <View style={[styles.optionsContainer, { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor: colors.cardBorder }]}>
                <Text style={[styles.optionsHeading, { color: colors.textSecondary }]}>EXPORT CUSTOMIZATIONS</Text>
                
                {/* Toggle: Answer Key */}
                <View style={styles.toggleRow}>
                  <View style={styles.toggleTextCol}>
                    <Text style={[styles.toggleLabel, { color: colors.text }]}>Include Answer Key & Solutions</Text>
                    <Text style={[styles.toggleSubLabel, { color: colors.textSecondary }]}>Adds instructor key at the end</Text>
                  </View>
                  <Switch
                    value={includeAnswerKey}
                    onValueChange={(val) => {
                      triggerHaptic.selection();
                      setIncludeAnswerKey(val);
                    }}
                    disabled={isBusy}
                    trackColor={{ false: isDark ? "#334155" : "#E2E8F0", true: "#818CF8" }}
                    thumbColor={includeAnswerKey ? "#4F46E5" : "#FFFFFF"}
                  />
                </View>

                {/* Toggle: Student Score (if attempt provided) */}
                {attempt && (
                  <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: isDark ? "#1E293B" : "#E2E8F0", paddingTop: 8, marginTop: 4 }]}>
                    <View style={styles.toggleTextCol}>
                      <Text style={[styles.toggleLabel, { color: colors.text }]}>Include Quiz Score & Results</Text>
                      <Text style={[styles.toggleSubLabel, { color: colors.textSecondary }]}>
                        Shows your {attempt.percentage}% score banner
                      </Text>
                    </View>
                    <Switch
                      value={includeStudentScore}
                      onValueChange={(val) => {
                        triggerHaptic.selection();
                        setIncludeStudentScore(val);
                      }}
                      disabled={isBusy}
                      trackColor={{ false: isDark ? "#334155" : "#E2E8F0", true: "#818CF8" }}
                      thumbColor={includeStudentScore ? "#4F46E5" : "#FFFFFF"}
                    />
                  </View>
                )}
              </View>

              {/* Format Options */}
              <View style={styles.optionsList}>
                {/* PDF Document */}
                <TouchableOpacity
                  style={[
                    styles.formatItem,
                    { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: colors.cardBorder },
                    exportingFormat === "pdf" && styles.formatItemActive,
                  ]}
                  onPress={() => handleExport("pdf")}
                  disabled={isBusy}
                  activeOpacity={0.8}
                >
                  <View style={[styles.formatIconCircle, { backgroundColor: isDark ? "#7F1D1D" : "#FEE2E2" }]}>
                    <MaterialCommunityIcons name="file-pdf-box" size={26} color="#EF4444" />
                  </View>
                  <View style={styles.formatTextCol}>
                    <View style={styles.formatTitleRow}>
                      <Text style={[styles.formatTitle, { color: colors.text }]}>PDF Study Guide (.pdf)</Text>
                      <View style={[styles.badgePill, { backgroundColor: isDark ? "#371B1B" : "#FEE2E2" }]}>
                        <Text style={[styles.badgeText, { color: "#EF4444" }]}>Print Ready</Text>
                      </View>
                    </View>
                    <Text style={[styles.formatDesc, { color: colors.textSecondary }]}>
                      Clean student worksheet with questions & answer keys
                    </Text>
                  </View>
                  {exportingFormat === "pdf" ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  )}
                </TouchableOpacity>

                {/* DOCX Word Document */}
                <TouchableOpacity
                  style={[
                    styles.formatItem,
                    { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: colors.cardBorder },
                    exportingFormat === "docx" && styles.formatItemActive,
                  ]}
                  onPress={() => handleExport("docx")}
                  disabled={isBusy}
                  activeOpacity={0.8}
                >
                  <View style={[styles.formatIconCircle, { backgroundColor: isDark ? "#1E3A8A" : "#DBEAFE" }]}>
                    <MaterialCommunityIcons name="file-word-box" size={26} color="#2563EB" />
                  </View>
                  <View style={styles.formatTextCol}>
                    <View style={styles.formatTitleRow}>
                      <Text style={[styles.formatTitle, { color: colors.text }]}>Word Document (.docx)</Text>
                      <View style={[styles.badgePill, { backgroundColor: isDark ? "#172554" : "#DBEAFE" }]}>
                        <Text style={[styles.badgeText, { color: "#2563EB" }]}>Editable</Text>
                      </View>
                    </View>
                    <Text style={[styles.formatDesc, { color: colors.textSecondary }]}>
                      Fully editable Microsoft Word & Google Docs format
                    </Text>
                  </View>
                  {exportingFormat === "docx" ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    elevation: 12,
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  quizTitleBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  quizTitleText: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  optionsContainer: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  optionsHeading: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  toggleTextCol: {
    flex: 1,
    marginRight: 10,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  toggleSubLabel: {
    fontSize: 11,
    marginTop: 1,
  },
  optionsList: {
    gap: 10,
  },
  formatItem: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  formatItemActive: {
    borderColor: "#6366F1",
    borderWidth: 1.5,
  },
  formatIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  formatTextCol: {
    flex: 1,
  },
  formatTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginRight: 8,
    marginBottom: 2,
  },
  formatTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  formatDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
});
