import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications, AppNotification } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { RootStackParamList } from '../../types/navigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatRelativeTime = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const getNotificationIconConfig = (type: AppNotification['type']) => {
  switch (type) {
    case 'streak_milestone':
      return { iconName: 'flame' as const, bg: '#FEF3C7', color: '#D97706', darkBg: '#78350F' };
    case 'achievement':
      return { iconName: 'trophy' as const, bg: '#FEF9C3', color: '#CA8A04', darkBg: '#713F12' };
    case 'quiz_completed':
      return { iconName: 'checkmark-circle' as const, bg: '#EEF2FF', color: '#4F46E5', darkBg: '#312E81' };
    case 'study_tip':
      return { iconName: 'bulb' as const, bg: '#F3E8FF', color: '#9333EA', darkBg: '#581C87' };
    case 'system':
    default:
      return { iconName: 'sparkles' as const, bg: '#E0F2FE', color: '#0284C7', darkBg: '#075985' };
  }
};

export const NotificationDropdown: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const {
    notifications,
    unreadCount,
    isDropdownOpen,
    closeDropdown,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const scale = useSharedValue(0.92);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-10);

  useEffect(() => {
    if (isDropdownOpen) {
      scale.value = withSpring(1, { damping: 16, stiffness: 280 });
      opacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });
      translateY.value = withSpring(0, { damping: 16, stiffness: 280 });
    } else {
      scale.value = withTiming(0.94, { duration: 140 });
      opacity.value = withTiming(0, { duration: 140 });
      translateY.value = withTiming(-8, { duration: 140 });
    }
  }, [isDropdownOpen]);

  const animatedDropdownStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  if (!isDropdownOpen) return null;

  const handleNotificationPress = (notif: AppNotification) => {
    markAsRead(notif.id);
    closeDropdown();

    if (notif.actionScreen) {
      if (notif.actionScreen === 'UploadQuiz') navigation.navigate('UploadQuiz');
      else if (notif.actionScreen === 'Achievements') navigation.navigate('Achievements');
      else if (notif.actionScreen === 'Performance') navigation.navigate('Performance');
      else if (notif.actionScreen === 'MyQuizzes') navigation.navigate('MyQuizzes');
      else if (notif.actionScreen === 'Dashboard') navigation.navigate('Dashboard');
    }
  };

  return (
    <Modal
      transparent
      visible={isDropdownOpen}
      animationType="none"
      onRequestClose={closeDropdown}
    >
      <TouchableWithoutFeedback onPress={closeDropdown}>
        <View style={styles.backdropOverlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.dropdownCard,
                {
                  top: Math.max(insets.top + 54, 60),
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  shadowColor: isDark ? '#000000' : '#4F46E5',
                },
                animatedDropdownStyle,
              ]}
            >
              {/* Header */}
              <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
                <View style={styles.headerTitleGroup}>
                  <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
                  {unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{unreadCount} new</Text>
                    </View>
                  )}
                </View>

                {unreadCount > 0 && (
                  <TouchableOpacity
                    style={styles.markAllBtn}
                    onPress={markAllAsRead}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="checkmark-done" size={16} color="#6366F1" style={{ marginRight: 4 }} />
                    <Text style={styles.markAllText}>Mark all read</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Notification List */}
              <ScrollView
                style={styles.scrollList}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {notifications.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#1E293B' : '#EEF2FF' }]}>
                      <Ionicons name="notifications-off-outline" size={32} color={colors.textSecondary} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>All Caught Up!</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                      You have no new notifications right now.
                    </Text>
                  </View>
                ) : (
                  notifications.map((notif) => {
                    const iconConfig = getNotificationIconConfig(notif.type);
                    return (
                      <TouchableOpacity
                        key={notif.id}
                        style={[
                          styles.notifItem,
                          {
                            backgroundColor: notif.read
                              ? 'transparent'
                              : isDark
                              ? 'rgba(99, 102, 241, 0.08)'
                              : 'rgba(99, 102, 241, 0.05)',
                            borderBottomColor: colors.border,
                          },
                        ]}
                        onPress={() => handleNotificationPress(notif)}
                        activeOpacity={0.75}
                      >
                        {/* Type Icon */}
                        <View
                          style={[
                            styles.iconBox,
                            {
                              backgroundColor: isDark ? iconConfig.darkBg : iconConfig.bg,
                            },
                          ]}
                        >
                          <Ionicons
                            name={iconConfig.iconName}
                            size={18}
                            color={iconConfig.color}
                          />
                        </View>

                        {/* Content */}
                        <View style={styles.contentCol}>
                          <View style={styles.itemHeaderRow}>
                            <Text
                              style={[
                                styles.notifTitle,
                                { color: colors.text },
                                !notif.read && styles.notifTitleUnread,
                              ]}
                              numberOfLines={1}
                            >
                              {notif.title}
                            </Text>
                            <Text style={[styles.timeText, { color: colors.textMuted }]}>
                              {formatRelativeTime(notif.createdAt)}
                            </Text>
                          </View>

                          <Text
                            style={[
                              styles.notifMessage,
                              { color: colors.textSecondary },
                            ]}
                            numberOfLines={2}
                          >
                            {notif.message}
                          </Text>
                        </View>

                        {/* Unread Dot or Delete Button */}
                        {!notif.read ? (
                          <View style={styles.unreadDot} />
                        ) : (
                          <TouchableOpacity
                            onPress={() => deleteNotification(notif.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={styles.deleteBtn}
                          >
                            <Ionicons name="close" size={14} color={colors.textMuted} />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdropOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'flex-end',
    paddingRight: 16,
  },
  dropdownCard: {
    width: Math.min(SCREEN_WIDTH * 0.85, 320),
    maxHeight: 380,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  unreadBadge: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366F1',
  },
  scrollList: {
    maxHeight: 380,
  },
  scrollContent: {
    paddingVertical: 4,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentCol: {
    flex: 1,
    marginRight: 8,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 6,
  },
  notifTitleUnread: {
    fontWeight: '800',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  notifMessage: {
    fontSize: 12,
    lineHeight: 16,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
  deleteBtn: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default NotificationDropdown;
