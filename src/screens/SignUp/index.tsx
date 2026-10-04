import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';

import { RootStackParamList } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { triggerHaptic } from '../../utils/haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Floating Ambient Glow Orb ───────────────────────────────────────────────
const AmbientGlowOrb: React.FC<{
  size: number;
  colors: [string, string, ...string[]];
  initialPosition: { top?: number; left?: number; right?: number; bottom?: number };
  duration?: number;
}> = ({ size, colors, initialPosition, duration = 4000 }) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-16, { duration, easing: Easing.inOut(Easing.quad) }),
        withTiming(14, { duration: duration * 1.1, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: duration * 0.9, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    translateX.value = withRepeat(
      withSequence(
        withTiming(12, { duration: duration * 1.2, easing: Easing.inOut(Easing.quad) }),
        withTiming(-10, { duration: duration * 0.9, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: duration * 1.1, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: duration * 1.4, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.92, { duration: duration * 1.3, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: duration * 1.2, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: 0.35,
          overflow: 'hidden',
          ...initialPosition,
        },
        animStyle,
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
};

export default function SignUp() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const { colors, isDark } = useTheme();

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Focus Trackers
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Entrance animations
  const cardScale = useSharedValue(0.95);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(18);

  useEffect(() => {
    cardScale.value = withSpring(1, { damping: 18, stiffness: 220 });
    cardOpacity.value = withTiming(1, { duration: 420 });
    cardTranslateY.value = withSpring(0, { damping: 16, stiffness: 200 });
  }, []);

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }, { translateY: cardTranslateY.value }],
  }));

  const handleSignUp = async () => {
    triggerHaptic.medium();
    if (!email.trim() || !password.trim()) {
      triggerHaptic.error();
      setError('Please enter your email and password.');
      return;
    }
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email.trim())) {
      triggerHaptic.error();
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      triggerHaptic.error();
      setError('Password must be at least 6 characters.');
      return;
    }
    if (confirmPassword && password !== confirmPassword) {
      triggerHaptic.error();
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await signUp(email.trim(), password, fullName.trim() || 'Marty Goboy');
      triggerHaptic.success();
      navigation.navigate('MainOnboard1');
    } catch (err: any) {
      triggerHaptic.error();
      let msg = err?.message || 'Failed to create account.';
      const code = (err?.code || '').toLowerCase();
      const raw = (err?.message || '').toLowerCase();

      if (code.includes('email-already-in-use') || raw.includes('email-already-in-use')) {
        msg = 'This email address is already in use. Please sign in instead.';
      } else if (code.includes('weak-password') || raw.includes('weak-password')) {
        msg = 'Password should be at least 6 characters long.';
      } else if (code.includes('invalid-email') || raw.includes('invalid-email')) {
        msg = 'Please enter a valid email address.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#090814' : '#F8FAFC' }]}>
      {/* ─── Ambient iOS Subtle Glow Orbs ────────────────────────────────────── */}
      <AmbientGlowOrb
        size={SCREEN_WIDTH * 0.85}
        colors={isDark ? ['#5B21B6', '#312E81', '#1E1B4B'] : ['#E0E7FF', '#EEF2FF', '#F1F5F9']}
        initialPosition={{ top: -60, right: -60 }}
        duration={4200}
      />
      <AmbientGlowOrb
        size={SCREEN_WIDTH * 0.7}
        colors={isDark ? ['#4338CA', '#3730A3', '#1E1B4B'] : ['#EDE9FE', '#F5F3FF', '#EEF2FF']}
        initialPosition={{ top: SCREEN_HEIGHT * 0.4, left: -80 }}
        duration={4800}
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* ─── Top Navigation Bar ─────────────────────────────────────────────── */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={[
              styles.navBackBtn,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
              },
            ]}
            onPress={() => {
              triggerHaptic.light();
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate('SignIn');
            }}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={20} color={isDark ? '#F1F5F9' : '#1E293B'} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={[styles.cardWrapper, animatedCardStyle]}>
              {/* ─── Star Logo & Brand Header (Left Aligned - Image 3) ─── */}
              <View style={styles.heroHeader}>
                <View style={styles.logoSquircle}>
                  <Image
                    source={require('../../../assets/illustrations/smarty_logo.png')}
                    style={styles.starLogoImage}
                    resizeMode="contain"
                  />
                </View>

                <Text style={[styles.mainHeading, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                  Join Smarty AI
                </Text>
                <Text style={[styles.subHeading, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  Create an account to save progress across devices.
                </Text>
              </View>

              {/* ─── Form Card ────────────────────────────────────── */}
              <View
                style={[
                  styles.glassFormCard,
                  {
                    backgroundColor: isDark ? '#161F30' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#F1F5F9',
                    shadowColor: isDark ? '#000000' : '#64748B',
                  },
                ]}
              >
                {/* Full Name Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                    Full Name
                  </Text>
                  <View
                    style={[
                      styles.iosInputContainer,
                      {
                        backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                        borderColor:
                          focusedField === 'name'
                            ? '#4F46E5'
                            : isDark
                            ? 'rgba(255,255,255,0.1)'
                            : '#E2E8F0',
                      },
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={focusedField === 'name' ? '#4F46E5' : isDark ? '#64748B' : '#94A3B8'}
                      style={styles.fieldLeftIcon}
                    />
                    <TextInput
                      style={[styles.iosTextInput, { color: isDark ? '#FFFFFF' : '#0F172A' }]}
                      placeholder="Marty Goboy"
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      value={fullName}
                      onChangeText={(t) => {
                        setFullName(t);
                        if (error) setError(null);
                      }}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Email Address Input */}
                <View style={[styles.inputGroup, { marginTop: 14 }]}>
                  <Text style={[styles.fieldLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                    Email Address
                  </Text>
                  <View
                    style={[
                      styles.iosInputContainer,
                      {
                        backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                        borderColor:
                          focusedField === 'email'
                            ? '#4F46E5'
                            : isDark
                            ? 'rgba(255,255,255,0.1)'
                            : '#E2E8F0',
                      },
                    ]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={focusedField === 'email' ? '#4F46E5' : isDark ? '#64748B' : '#94A3B8'}
                      style={styles.fieldLeftIcon}
                    />
                    <TextInput
                      style={[styles.iosTextInput, { color: isDark ? '#FFFFFF' : '#0F172A' }]}
                      placeholder="imu@email.com"
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      value={email}
                      onChangeText={(t) => {
                        setEmail(t);
                        if (error) setError(null);
                      }}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoCorrect={false}
                    />
                    {email.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setEmail('')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle" size={18} color={isDark ? '#64748B' : '#CBD5E1'} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Password Input */}
                <View style={[styles.inputGroup, { marginTop: 14 }]}>
                  <View style={styles.passwordLabelRow}>
                    <Text style={[styles.fieldLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                      Password
                    </Text>
                    <Text style={[styles.passwordHintText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                      6+ or more characters
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.iosInputContainer,
                      {
                        backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                        borderColor:
                          focusedField === 'password'
                            ? '#4F46E5'
                            : isDark
                            ? 'rgba(255,255,255,0.1)'
                            : '#E2E8F0',
                      },
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={focusedField === 'password' ? '#4F46E5' : isDark ? '#64748B' : '#94A3B8'}
                      style={styles.fieldLeftIcon}
                    />
                    <TextInput
                      style={[styles.iosTextInput, { color: isDark ? '#FFFFFF' : '#0F172A' }]}
                      placeholder="At least 6 characters"
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      value={password}
                      onChangeText={(t) => {
                        setPassword(t);
                        if (error) setError(null);
                      }}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => {
                        triggerHaptic.selection();
                        setShowPassword(!showPassword);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                        size={20}
                        color={isDark ? '#94A3B8' : '#64748B'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password Input */}
                <View style={[styles.inputGroup, { marginTop: 14 }]}>
                  <Text style={[styles.fieldLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                    Confirm Password
                  </Text>
                  <View
                    style={[
                      styles.iosInputContainer,
                      {
                        backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                        borderColor:
                          focusedField === 'confirmPassword'
                            ? '#4F46E5'
                            : isDark
                            ? 'rgba(255,255,255,0.1)'
                            : '#E2E8F0',
                      },
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={focusedField === 'confirmPassword' ? '#4F46E5' : isDark ? '#64748B' : '#94A3B8'}
                      style={styles.fieldLeftIcon}
                    />
                    <TextInput
                      style={[styles.iosTextInput, { color: isDark ? '#FFFFFF' : '#0F172A' }]}
                      placeholder="Confirm password"
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      value={confirmPassword}
                      onChangeText={(t) => {
                        setConfirmPassword(t);
                        if (error) setError(null);
                      }}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onBlur={() => setFocusedField(null)}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => {
                        triggerHaptic.selection();
                        setShowConfirmPassword(!showConfirmPassword);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                        size={20}
                        color={isDark ? '#94A3B8' : '#64748B'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* ─── Realtime Backup Info Callout ─────────────────────────── */}
                <View
                  style={[
                    styles.infoCallout,
                    {
                      backgroundColor: isDark ? 'rgba(79, 70, 229, 0.12)' : '#F5F3FF',
                      borderColor: isDark ? 'rgba(99, 102, 241, 0.25)' : '#EDE9FE',
                    },
                  ]}
                >
                  <Ionicons name="shield-checkmark" size={18} color="#4F46E5" style={{ marginRight: 9 }} />
                  <Text style={[styles.infoCalloutText, { color: isDark ? '#C7D2FE' : '#3730A3' }]}>
                    Your dynamic questionnaire checkpoints will be backed up seamlessly in real time.
                  </Text>
                </View>

                {/* ─── Error Notification Banner ─────────────────────────── */}
                {error && (
                  <View
                    style={[
                      styles.errorBanner,
                      {
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEF2F2',
                        borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FCA5A5',
                      },
                    ]}
                  >
                    <Ionicons name="alert-circle" size={17} color="#EF4444" style={{ marginRight: 8 }} />
                    <Text style={styles.errorBannerText}>{error}</Text>
                  </View>
                )}

                {/* ─── Gradient Submit Button ──────────────────────────────── */}
                <TouchableOpacity
                  onPress={handleSignUp}
                  disabled={loading}
                  activeOpacity={0.88}
                  style={styles.submitBtnWrapper}
                >
                  <LinearGradient
                    colors={['#4F46E5', '#4338CA', '#3730A3']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientSubmitBtn}
                  >
                    {loading ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                        <Text style={styles.submitBtnText}>Creating account...</Text>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.submitBtnText}>Create account</Text>
                        <View style={styles.submitArrowCircle}>
                          <Ionicons name="arrow-forward" size={15} color="#4F46E5" />
                        </View>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* ─── Switch to Sign In ─────────────────────────────────────── */}
              <View style={styles.switchRow}>
                <Text style={[styles.switchText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  Already have an account?{' '}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic.selection();
                    navigation.navigate('SignIn');
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.switchLink, { color: isDark ? '#818CF8' : '#4F46E5' }]}>
                    Sign in
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    zIndex: 10,
  },
  navBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 36,
    alignItems: 'center',
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },

  // Hero Header & Star Logo (Left-aligned - Image 3)
  heroHeader: {
    width: '100%',
    alignItems: 'flex-start',
    marginTop: 10,
    marginBottom: 24,
  },
  logoSquircle: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  starLogoImage: {
    width: 52,
    height: 52,
  },
  mainHeading: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: 6,
    textAlign: 'left',
  },
  subHeading: {
    fontSize: 14.5,
    textAlign: 'left',
    lineHeight: 21,
    fontWeight: '400',
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 10,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
    lineHeight: 18,
  },

  // Minimalist Form Card
  glassFormCard: {
    width: '100%',
  },
  inputGroup: {
    width: '100%',
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  passwordHintText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
  },
  infoCalloutText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '500',
    lineHeight: 18,
  },
  iosInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
  },
  fieldLeftIcon: {
    marginRight: 10,
  },
  iosTextInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 8,
  },

  // Submit Button
  submitBtnWrapper: {
    width: '100%',
    borderRadius: 16,
    marginTop: 20,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 6,
  },
  gradientSubmitBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginRight: 10,
  },
  submitArrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Switch Link
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  switchText: {
    fontSize: 14,
    fontWeight: '500',
  },
  switchLink: {
    fontSize: 14,
    fontWeight: '800',
  },

  // Security Note
  footerNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  footerNoteText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
});