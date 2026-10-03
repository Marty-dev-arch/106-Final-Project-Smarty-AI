import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Modal,
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
import BlinkingMascot from '../../components/common/BlinkingMascot';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Authentic Google Logo SVG ───────────────────────────────────────────────
const GoogleLogo: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </Svg>
);

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

export default function SignIn() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { signIn, signInWithGoogle, resetPassword } = useAuth();
  const { colors, isDark } = useTheme();

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Active focus trackers for iOS glowing inputs
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Entrance animations shared values
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

  const handleSignIn = async () => {
    triggerHaptic.medium();
    if (!email.trim() || !password.trim()) {
      triggerHaptic.error();
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      triggerHaptic.success();
      navigation.navigate('Dashboard');
    } catch (err: any) {
      triggerHaptic.error();
      let msg = err?.message || 'Failed to sign in.';
      const code = (err?.code || '').toLowerCase();
      const raw = (err?.message || '').toLowerCase();

      if (
        code.includes('invalid-credential') ||
        code.includes('wrong-password') ||
        code.includes('user-not-found') ||
        raw.includes('invalid-credential') ||
        raw.includes('wrong-password') ||
        raw.includes('user-not-found')
      ) {
        msg = 'Incorrect username or password. Please try again.';
      } else if (code.includes('too-many-requests') || raw.includes('too-many-requests')) {
        msg = 'Too many failed attempts. Please reset your password or try again later.';
      } else if (code.includes('invalid-email') || raw.includes('invalid-email')) {
        msg = 'Please enter a valid email address.';
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    triggerHaptic.medium();
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      triggerHaptic.success();
      navigation.navigate('Dashboard');
    } catch (err: any) {
      triggerHaptic.error();
      setError(err?.message || 'Failed to sign in with Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSendPasswordReset = async () => {
    triggerHaptic.medium();
    if (!resetEmail.trim()) {
      triggerHaptic.error();
      setResetError('Please enter your email address.');
      return;
    }
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(resetEmail.trim())) {
      triggerHaptic.error();
      setResetError('Please enter a valid email address.');
      return;
    }

    setResetLoading(true);
    setResetError(null);
    try {
      await resetPassword(resetEmail.trim());
      triggerHaptic.success();
      setResetSuccess(true);
    } catch (err: any) {
      triggerHaptic.error();
      setResetError(err?.message || 'Failed to send reset link. Please check your email and try again.');
    } finally {
      setResetLoading(false);
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
        {/* ─── Top iOS Navigation Bar ─────────────────────────────────────────── */}
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
              else navigation.navigate('Welcome');
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
              {/* ─── Mascot & Brand Header ───────────────────────────────────── */}
              <View style={styles.heroHeader}>
                <View style={styles.mascotHaloContainer}>
                  <LinearGradient
                    colors={['#6366F1', '#4F46E5', '#4338CA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.mascotHaloGlow}
                  />
                  <View
                    style={[
                      styles.mascotPlate,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255,255,255,0.16)' : '#E2E8F0',
                      },
                    ]}
                  >
                    <BlinkingMascot size={64} style={styles.mascotAvatar} />
                  </View>
                </View>

                <Text style={[styles.mainHeading, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                  Welcome to Smarty
                </Text>
                <Text style={[styles.subHeading, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  Sign in to access your quizzes, progress, and streaks.
                </Text>
              </View>

              {/* ─── Minimalist Form Card ────────────────────────────────────── */}
              <View
                style={[
                  styles.glassFormCard,
                  {
                    backgroundColor: isDark ? '#161F30' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
                    shadowColor: isDark ? '#000000' : '#64748B',
                  },
                ]}
              >
                {/* Email Address Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, { color: isDark ? '#CBD5E1' : '#475569' }]}>
                    EMAIL OR USERNAME
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
                      placeholder="name@example.com"
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
                  <Text style={[styles.fieldLabel, { color: isDark ? '#CBD5E1' : '#475569' }]}>
                    PASSWORD
                  </Text>

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
                      placeholder="••••••••••••"
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
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={isDark ? '#94A3B8' : '#64748B'}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* ─── Forgot Password Link ───────────────────────────────── */}
                  <TouchableOpacity
                    onPress={() => {
                      triggerHaptic.light();
                      setResetEmail(email.trim());
                      setResetSuccess(false);
                      setResetError(null);
                      setShowForgotModal(true);
                    }}
                    style={styles.forgotBtnBelow}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.forgotLinkText, { color: isDark ? '#818CF8' : '#4F46E5' }]}>
                      Forgot password?
                    </Text>
                  </TouchableOpacity>

                  {/* ─── Error Notification Banner (Below Password) ───────── */}
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
                </View>

                {/* ─── Gradient Submit Button ──────────────────────────────── */}
                <TouchableOpacity
                  onPress={handleSignIn}
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
                        <Text style={styles.submitBtnText}>Signing in...</Text>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.submitBtnText}>Sign In</Text>
                        <View style={styles.submitArrowCircle}>
                          <Ionicons name="arrow-forward" size={15} color="#4F46E5" />
                        </View>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* ─── Divider: "OR CONNECT WITH" ─────────────────────────────── */}
              <View style={styles.dividerRow}>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' },
                  ]}
                />
                <Text style={[styles.dividerText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                  OR CONNECT WITH
                </Text>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' },
                  ]}
                />
              </View>

              {/* ─── Clean Google Sign In Button ────────────────────────────── */}
              <View style={styles.socialButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.googleSignInBtn,
                    {
                      backgroundColor: isDark ? '#161F30' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
                    },
                  ]}
                  onPress={handleGoogleSignIn}
                  disabled={googleLoading}
                  activeOpacity={0.82}
                >
                  {googleLoading ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ActivityIndicator color={isDark ? '#FFFFFF' : '#4285F4'} size="small" style={{ marginRight: 8 }} />
                      <Text style={[styles.googleSignInText, { color: isDark ? '#FFFFFF' : '#1E293B' }]}>
                        Connecting...
                      </Text>
                    </View>
                  ) : (
                    <>
                      <GoogleLogo size={20} />
                      <Text style={[styles.googleSignInText, { color: isDark ? '#FFFFFF' : '#1E293B' }]}>
                        Sign in with Google
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* ─── Switch to Register / Sign Up ─────────────────────────── */}
              <View style={styles.switchRow}>
                <Text style={[styles.switchText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  Don't have an account?{' '}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic.selection();
                    navigation.navigate('SignUp');
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.switchLink, { color: isDark ? '#818CF8' : '#4F46E5' }]}>
                    Sign up
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ─── Security Footer Note ───────────────────────────────────── */}
              <View style={styles.footerNoteRow}>
                <Ionicons name="shield-checkmark" size={14} color="#10B981" style={{ marginRight: 6 }} />
                <Text style={[styles.footerNoteText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                  Protected with Firebase 256-bit Cloud Security
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ─── Modern iOS Forgot Password Modal ────────────────────────────── */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowForgotModal(false)}
          />
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? '#161F30' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
              },
            ]}
          >
            {/* Modal Close Button */}
            <TouchableOpacity
              style={[
                styles.modalCloseBtn,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' },
              ]}
              onPress={() => setShowForgotModal(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>

            {resetSuccess ? (
              <View style={styles.modalSuccessBody}>
                <View style={styles.modalSuccessIconCircle}>
                  <Ionicons name="checkmark-circle" size={44} color="#10B981" />
                </View>
                <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#0F172A', marginTop: 12 }]}>
                  Reset Link Sent!
                </Text>
                <Text style={[styles.modalSubTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  We've sent password reset instructions to{' '}
                  <Text style={{ fontWeight: '700', color: isDark ? '#818CF8' : '#4F46E5' }}>
                    {resetEmail.trim()}
                  </Text>
                  . Please check your inbox and spam folder.
                </Text>

                <TouchableOpacity
                  style={styles.modalPrimaryBtnWrap}
                  onPress={() => {
                    triggerHaptic.light();
                    setShowForgotModal(false);
                  }}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={['#4F46E5', '#4338CA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalPrimaryBtn}
                  >
                    <Text style={styles.modalPrimaryBtnText}>Back to Sign In</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.modalFormBody}>
                <View style={styles.modalKeyIconCircle}>
                  <Ionicons name="key" size={26} color="#4F46E5" />
                </View>
                <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                  Reset Password
                </Text>
                <Text style={[styles.modalSubTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  Enter your registered email address and we'll send you instructions to reset your password.
                </Text>

                {resetError && (
                  <View style={styles.modalErrorBanner}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={styles.modalErrorText}>{resetError}</Text>
                  </View>
                )}

                <View style={[styles.inputGroup, { marginTop: 16 }]}>
                  <Text style={[styles.fieldLabel, { color: isDark ? '#CBD5E1' : '#475569' }]}>
                    EMAIL ADDRESS
                  </Text>
                  <View
                    style={[
                      styles.iosInputContainer,
                      {
                        backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                      },
                    ]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={isDark ? '#64748B' : '#94A3B8'}
                      style={styles.fieldLeftIcon}
                    />
                    <TextInput
                      style={[styles.iosTextInput, { color: isDark ? '#FFFFFF' : '#0F172A' }]}
                      placeholder="name@example.com"
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      value={resetEmail}
                      onChangeText={(t) => {
                        setResetEmail(t);
                        if (resetError) setResetError(null);
                      }}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.modalPrimaryBtnWrap}
                  onPress={handleSendPasswordReset}
                  disabled={resetLoading}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={['#4F46E5', '#4338CA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalPrimaryBtn}
                  >
                    {resetLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.modalPrimaryBtnText}>Send Reset Link</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowForgotModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalCancelText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  // Hero Header & Mascot
  heroHeader: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  mascotHaloContainer: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  mascotHaloGlow: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    opacity: 0.35,
  },
  mascotPlate: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  mascotAvatar: {
    marginTop: 0,
  },
  mainHeading: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  subHeading: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
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
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 18,
    elevation: 4,
  },
  inputGroup: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
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

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    paddingHorizontal: 12,
  },

  // Social Google Sign In Button
  socialButtonsRow: {
    width: '100%',
  },
  googleSignInBtn: {
    width: '100%',
    height: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  googleSignInText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginLeft: 10,
  },

  // Switch Link
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  switchText: {
    fontSize: 14,
    fontWeight: '500',
  },
  switchLink: {
    fontSize: 14,
    fontWeight: '800',
  },

  // Forgot Password Link Below Input
  forgotBtnBelow: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  forgotLinkText: {
    fontSize: 12.5,
    fontWeight: '700',
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

  // ─── Forgot Password Modal Styles ──────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
    position: 'relative',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalKeyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalSuccessIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalSuccessBody: {
    alignItems: 'center',
    paddingTop: 8,
  },
  modalFormBody: {
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  modalSubTitle: {
    fontSize: 13.5,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  modalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 14,
  },
  modalErrorText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#EF4444',
  },
  modalPrimaryBtnWrap: {
    width: '100%',
    borderRadius: 16,
    marginTop: 20,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 6,
  },
  modalPrimaryBtn: {
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  modalCancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
});