import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Quiz, QuizAttempt } from "../../types/quiz";
import { exportService, ExportFormat } from "../../utils/exportService";
import { useToast } from "../../context/ToastContext";
import { useTheme } from "../../context/ThemeContext";
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

  const handleExport = (format: ExportFormat) => {
    try {
      exportService.exportQuiz(quiz, format, attempt);
      onClose();
      showToast({
        type: "success",
        title: "Export Ready ✨",
        message: `"${quiz.title}" exported as .${format === "ppt" ? "pptx" : format}!`,
      });
    } catch (e: any) {
      showToast({
        type: "error",
        title: "Export Notice",
        message: e.message || "Failed to export quiz file.",
      });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
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
                    <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Select format to download</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Quiz Title Banner */}
              <View style={[styles.quizTitleBox, { backgroundColor: isDark ? "#1E293B" : "#F5F3FF" }]}>
                <Ionicons name="document-text-outline" size={16} color="#6366F1" style={{ marginRight: 6 }} />
                <Text style={[styles.quizTitleText, { color: colors.text }]} numberOfLines={1}>{quiz.title}</Text>
              </View>

              {/* Format Options */}
              <View style={styles.optionsList}>
                {/* PDF Document */}
                <TouchableOpacity
                  style={[styles.formatItem, { backgroundColor: isDark ? "#1E293B" : "#F8FAFC", borderColor: colors.cardBorder }]}
                  onPress={() => handleExport("pdf")}
                  activeOpacity={0.8}
                >
                  <View style={[styles.formatIconCircle, { backgroundColor: isDark ? "#7F1D1D" : "#FEE2E2" }]}>
                    <MaterialCommunityIcons name="file-pdf-box" size={24} color="#EF4444" />
                  </View>
                  <View style={styles.formatTextCol}>
                    <Text style={[styles.formatTitle, { color: colors.text }]}>PDF Study Guide (.pdf)</Text>
                    <Text style={[styles.formatDesc, { color: colors.textSecondary }]}>Print-ready questions & answer keys</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>

                {/* DOCX */}
                <TouchableOpacity
                  style={[styles.formatItem, { backgroundColor: isDark ? "#1E293B" : "#F8FAFC", borderColor: colors.cardBorder }]}
                  onPress={() => handleExport("docx")}
                  activeOpacity={0.8}
                >
                  <View style={[styles.formatIconCircle, { backgroundColor: isDark ? "#1E3A8A" : "#DBEAFE" }]}>
                    <MaterialCommunityIcons name="file-word-box" size={24} color="#2563EB" />
                  </View>
                  <View style={styles.formatTextCol}>
                    <Text style={[styles.formatTitle, { color: colors.text }]}>Word Document (.docx)</Text>
                    <Text style={[styles.formatDesc, { color: colors.textSecondary }]}>Editable Microsoft Word sheet</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>

                {/* PPT / PPTX */}
                <TouchableOpacity
                  style={[styles.formatItem, { backgroundColor: isDark ? "#1E293B" : "#F8FAFC", borderColor: colors.cardBorder }]}
                  onPress={() => handleExport("ppt")}
                  activeOpacity={0.8}
                >
                  <View style={[styles.formatIconCircle, { backgroundColor: isDark ? "#7C2D12" : "#FFEDD5" }]}>
                    <MaterialCommunityIcons name="file-powerpoint-box" size={24} color="#F97316" />
                  </View>
                  <View style={styles.formatTextCol}>
                    <Text style={[styles.formatTitle, { color: colors.text }]}>Slide Deck (.pptx)</Text>
                    <Text style={[styles.formatDesc, { color: colors.textSecondary }]}>Flashcard slides for presentation</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
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
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 390,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    elevation: 8,
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
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
    marginTop: 1,
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
    marginBottom: 16,
  },
  quizTitleText: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  optionsList: {
    gap: 10,
  },
  formatItem: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
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
  formatTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  formatDesc: {
    fontSize: 12,
  },
});
