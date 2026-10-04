import React, { useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ConfettiCannon from './ConfettiCannon';
import { triggerHaptic } from '../../utils/haptics';
import { playSound } from '../../utils/soundEffects';

const { width } = Dimensions.get('window');

export interface AchievementRewardData {
  title: string;
  subtitle?: string;
  tier?: string;
  category?: string;
  type?: 'Medal' | 'Ribbon' | 'Badge';
  iconName?: keyof typeof Ionicons.glyphMap;
  description: string;
  rewardXP?: number;
  colors?: [string, string, ...string[]];
}

interface Props {
  visible: boolean;
  achievement: AchievementRewardData | null;
  soundEnabled?: boolean;
  onClose: () => void;
}

export default function AchievementRewardModal({
  visible,
  achievement,
  soundEnabled = true,
  onClose,
}: Props) {
  useEffect(() => {
    if (visible && achievement) {
      triggerHaptic.success();
      playSound.reward(soundEnabled);
    }
  }, [visible, achievement, soundEnabled]);

  if (!achievement) return null;

  const type = achievement.type || 'Medal';
  const icon =
    achievement.iconName ||
    (type === 'Ribbon' ? 'ribbon' : type === 'Badge' ? 'shield-checkmark' : 'medal');
  const gradientColors: [string, string, ...string[]] =
    achievement.colors ||
    (type === 'Ribbon'
      ? ['#F59E0B', '#D97706', '#92400E']
      : type === 'Badge'
      ? ['#6366F1', '#4F46E5', '#3730A3']
      : ['#10B981', '#059669', '#047857']);

  const xpAmount = achievement.rewardXP || 150;

  const handleClaim = () => {
    triggerHaptic.medium();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Confetti Explosion */}
        <ConfettiCannon count={45} active={visible} />

        <View style={styles.card}>
          {/* Top Decorative Gradient Header */}
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="rgba(255, 255, 255, 0.85)" />
            </TouchableOpacity>

            {/* Glowing Medal / Ribbon Circle */}
            <View style={styles.iconCircleOuter}>
              <View style={styles.iconCircleInner}>
                <Ionicons name={icon} size={44} color="#FFFFFF" />
              </View>
            </View>

            {/* Ribbon Banner Tag */}
            <View style={styles.ribbonTag}>
              <Ionicons name="sparkles" size={13} color="#FBBF24" style={{ marginRight: 5 }} />
              <Text style={styles.ribbonTagText}>REWARD UNLOCKED</Text>
            </View>
          </LinearGradient>

          {/* Body Content */}
          <View style={styles.body}>
            <Text style={styles.tierText}>
              {achievement.tier || `${type.toUpperCase()} • SPECIAL REWARD`}
            </Text>

            <Text style={styles.titleText}>{achievement.title}</Text>

            <Text style={styles.descText}>{achievement.description}</Text>

            {/* Reward XP Banner */}
            <View style={styles.rewardPill}>
              <View style={styles.xpCircle}>
                <Ionicons name="flash" size={14} color="#6D44F2" />
              </View>
              <Text style={styles.rewardPillText}>
                +{xpAmount} XP REWARD GAINED
              </Text>
            </View>

            {/* Claim Action Button */}
            <TouchableOpacity
              style={styles.claimButton}
              onPress={handleClaim}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={['#6D44F2', '#5528DA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.claimGradient}
              >
                <Text style={styles.claimText}>Claim Reward & Continue</Text>
                <Ionicons
                  name="arrow-forward"
                  size={17}
                  color="#FFFFFF"
                  style={{ marginLeft: 6 }}
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  card: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  headerGradient: {
    width: '100%',
    paddingTop: 32,
    paddingBottom: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleOuter: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    marginBottom: 12,
  },
  iconCircleInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ribbonTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  ribbonTagText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    alignItems: 'center',
  },
  tierText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6D44F2',
    letterSpacing: 0.7,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  titleText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  descText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 6,
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 20,
  },
  xpCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  rewardPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7E22CE',
    letterSpacing: 0.5,
  },
  claimButton: {
    width: '100%',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#6D44F2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  claimGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  claimText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
