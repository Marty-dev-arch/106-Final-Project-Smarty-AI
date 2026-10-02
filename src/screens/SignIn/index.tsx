import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { RootStackParamList } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { triggerHaptic } from '../../utils/haptics';
import BlinkingMascot from '../../components/common/BlinkingMascot';
import VideoBackground from '../../components/common/VideoBackground';
import Svg, { Path } from 'react-native-svg';

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

export default function SignIn() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signIn, signInWithGoogle, resetPassword } = useAuth();

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

  // Focus Trackers
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Entrance Animations
  const cardScale = useSharedValue(0.96);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    cardScale.value = withSpring(1, { damping: 18, stiffness: 200 });
    cardOpacity.value = withTiming(1, { duration: 450 });
  }, []);

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const handleSignIn = async () => {
    triggerHaptic.medium();
    if (!email.trim() || !password.trim()) {
      triggerHaptic.error();
      setError('Please enter your email/username and password.');
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
        msg = 'Incorrect username or password. Please try again';
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
      setError(err.message || 'Failed to sign in with Google.');
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
      setResetError(err.message || 'Failed to send reset link.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <VideoBackground overlayOpacity={0.3}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* ─── Top Navigation Header ───────────────────────────────────────── */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.navBackBtn}
            onPress={() => {
              triggerHaptic.light();
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate('Welcome');
            }}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
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
              {/* ─── Mascot 3D Avatar Header ───────────────────────────────── */}
              <View style={styles.heroHeader}>
                <View style={styles.mascotHaloContainer}>
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB', '#1D4ED8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.mascotHaloGlow}
                  />
                  <View style={styles.mascotPlate}>
                    <BlinkingMascot size={72} style={styles.mascotAvatar} />
                  </View>
                </View>

                <Text style={styles.mainHeading}>Welcome Back!</Text>
                <Text style={styles.subHeading}>welcome back we missed you</Text>
              </View>

              {/* ─── Transparent Form Container ────────────────────────────── */}
              <View style={styles.transparentFormContainer}>
                {/* Username Input with Gradient Backdrop */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Username</Text>
                  <LinearGradient
                    colors={
                      focusedField === 'email'
                        ? ['rgba(59, 130, 246, 0.3)', 'rgba(37, 99, 235, 0.2)']
                        : ['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.05)']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.inputGradientContainer,
                      {
                        borderColor: focusedField === 'email' ? '#3B82F6' : 'rgba(255, 255, 255, 0.25)',
                      },
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={focusedField === 'email' ? '#60A5FA' : 'rgba(255, 255, 255, 0.7)'}
                      style={styles.fieldIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Username or email"
                      placeholderTextColor="rgba(255, 255, 255, 0.45)"
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
                  </LinearGradient>
                </View>

                {/* Password Input with Gradient Backdrop */}
                <View style={[styles.inputGroup, { marginTop: 14 }]}>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <LinearGradient
                    colors={
                      focusedField === 'password'
                        ? ['rgba(59, 130, 246, 0.3)', 'rgba(37, 99, 235, 0.2)']
                        : ['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.05)']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.inputGradientContainer,
                      {
                        borderColor: focusedField === 'password' ? '#3B82F6' : 'rgba(255, 255, 255, 0.25)',
                      },
                    ]}
                  >
                    <Ionicons
                      name="key-outline"
                      size={18}
                      color={focusedField === 'password' ? '#60A5FA' : 'rgba(255, 255, 255, 0.7)'}
                      style={styles.fieldIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="••••••••••••"
                      placeholderTextColor="rgba(255, 255, 255, 0.45)"
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
                        size={18}
                        color="rgba(255, 255, 255, 0.7)"
                      />
                    </TouchableOpacity>
                  </LinearGradient>

                  {/* Forgot Password Link */}
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
                    <Text style={styles.forgotLinkText}>Forgot Password?</Text>
                  </TouchableOpacity>

                  {/* ─── Error Notification Banner (Below Password) ───────── */}
                  {error && (
                    <View style={styles.errorBanner}>
                      <Ionicons name="alert-circle" size={16} color="#FCA5A5" style={{ marginRight: 6 }} />
                      <Text style={styles.errorBannerText}>{error}</Text>
                    </View>
                  )}
                </View>

                {/* ─── Gradient Submit Button (Dashboard Blue Theme) ───────── */}
                <TouchableOpacity
                  onPress={handleSignIn}
                  disabled={loading}
                  activeOpacity={0.88}
                  style={styles.submitBtnWrapper}
                >
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB', '#1D4ED8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientSubmitBtn}
                  >
                    {loading ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                        <Text style={styles.submitBtnText}>Signing in...</Text>
                      </View>
                    ) : (
                      <Text style={styles.submitBtnText}>Sign in</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* ─── Divider: "Or continue with" ─────────────────────────── */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Or continue with</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* ─── Google Sign In Button ───────────────────────────────── */}
                <TouchableOpacity
                  style={styles.googleGlassBtn}
                  onPress={handleGoogleSignIn}
                  disabled={googleLoading}
                  activeOpacity={0.82}
                >
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0.06)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.googleGlassGradient}
                  >
                    {googleLoading ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                        <Text style={styles.googleBtnText}>Signing in...</Text>
                      </View>
                    ) : (
                      <>
                        <GoogleLogo size={20} />
                        <Text style={styles.googleBtnText}>Sign in with Google</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* ─── Switch to Register / Sign Up ─────────────────────────── */}
              <View style={styles.switchRow}>
                <Text style={styles.switchText}>Don't have an account? </Text>
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic.selection();
                    navigation.navigate('SignUp');
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.switchLink}>Sign up</Text>
                </TouchableOpacity>
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
          <View style={styles.modalCard}>
            {/* Modal Close Button */}
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowForgotModal(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>

            {resetSuccess ? (
              <View style={styles.modalSuccessBody}>
                <View style={styles.modalSuccessIconCircle}>
                  <Ionicons name="checkmark-circle" size={44} color="#10B981" />
                </View>
                <Text style={[styles.modalTitle, { marginTop: 12 }]}>
                  Reset Link Sent!
                </Text>
                <Text style={styles.modalSubTitle}>
                  We've sent password reset instructions to{' '}
                  <Text style={{ fontWeight: '700', color: '#60A5FA' }}>
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
                    colors={['#3B82F6', '#2563EB', '#1D4ED8']}
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
                  <Ionicons name="key" size={26} color="#3B82F6" />
                </View>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <Text style={styles.modalSubTitle}>
                  Enter your registered email address and we'll send you instructions to reset your password.
                </Text>

                {resetError && (
                  <View style={styles.modalErrorBanner}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={styles.modalErrorText}>{resetError}</Text>
                  </View>
                )}

                <View style={[styles.inputGroup, { marginTop: 16 }]}>
                  <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color="rgba(255,255,255,0.6)"
                      style={styles.fieldIcon}
                    />
                    <TextInput
                      style={[styles.textInput, { color: '#FFFFFF' }]}
                      placeholder="name@university.edu"
                      placeholderTextColor="rgba(255,255,255,0.35)"
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
                    colors={['#3B82F6', '#2563EB', '#1D4ED8']}
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
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </VideoBackground>
  );
}

const styles = StyleSheet.create({
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
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },

  // Hero Header & Mascot Avatar
  heroHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  mascotHaloContainer: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  mascotHaloGlow: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    opacity: 0.5,
  },
  mascotPlate: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(20, 16, 40, 0.65)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotAvatar: {
    marginTop: 0,
  },
  mainHeading: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subHeading: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 10,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#FCA5A5',
  },

  // Completely Transparent Form Container
  transparentFormContainer: {
    width: '100%',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  inputGroup: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  inputGradientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
  },
  fieldIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Forgot Password Link Below Input
  forgotBtnBelow: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotLinkText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
  },

  // Submit Button
  submitBtnWrapper: {
    width: '100%',
    borderRadius: 18,
    marginTop: 24,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 10,
  },
  gradientSubmitBtn: {
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.75)',
    paddingHorizontal: 14,
  },

  // Google Sign In Glass Button
  googleGlassBtn: {
    width: '100%',
    height: 52,
    borderRadius: 18,
    overflow: 'hidden',
  },
  googleGlassGradient: {
    width: '100%',
    height: '100%',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 12,
  },

  // Switch Link
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  switchText: {
    fontSize: 14.5,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  switchLink: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#60A5FA',
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    backgroundColor: '#0F172A',
    padding: 24,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
    position: 'relative',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalKeyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalSuccessIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
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
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  modalSubTitle: {
    fontSize: 13.5,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  modalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
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
    borderRadius: 18,
    marginTop: 20,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 6,
  },
  modalPrimaryBtn: {
    height: 50,
    borderRadius: 18,
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
    color: 'rgba(255, 255, 255, 0.65)',
  },
});