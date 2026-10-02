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

export default function SignUp() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signUp, signInWithGoogle } = useAuth();

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    setLoading(true);
    setError(null);
    try {
      await signUp(email.trim(), password, fullName.trim() || 'Smarty Scholar');
      triggerHaptic.success();
      navigation.navigate('MainOnboard1');
    } catch (err: any) {
      triggerHaptic.error();
      setError(err.message || 'Failed to create account.');
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

  const getPasswordStrength = () => {
    if (!password) return { label: '', color: 'transparent' };
    if (password.length < 6) return { label: 'Weak', color: '#EF4444' };
    if (password.length < 9) return { label: 'Medium', color: '#F59E0B' };
    return { label: '--- Strong', color: '#10B981' };
  };
  const strength = getPasswordStrength();

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
              else navigation.navigate('SignIn');
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

                <Text style={styles.mainHeading}>Get Started Free</Text>
                <Text style={styles.subHeading}>Free Forever. No Credit Card Needed</Text>
              </View>

              {/* ─── Error Notification Banner ───────────────────────────────── */}
              {error && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color="#FCA5A5" style={{ marginRight: 8 }} />
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              )}

              {/* ─── Transparent Form Container ────────────────────────────── */}
              <View style={styles.transparentFormContainer}>
                {/* Email Address Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Email Address</Text>
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
                      name="mail-outline"
                      size={18}
                      color={focusedField === 'email' ? '#60A5FA' : 'rgba(255, 255, 255, 0.7)'}
                      style={styles.fieldIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="yourname@gmail.com"
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
                    />
                  </LinearGradient>
                </View>

                {/* Your Name Input */}
                <View style={[styles.inputGroup, { marginTop: 14 }]}>
                  <Text style={styles.fieldLabel}>Your Name</Text>
                  <LinearGradient
                    colors={
                      focusedField === 'fullName'
                        ? ['rgba(59, 130, 246, 0.3)', 'rgba(37, 99, 235, 0.2)']
                        : ['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.05)']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.inputGradientContainer,
                      {
                        borderColor: focusedField === 'fullName' ? '#3B82F6' : 'rgba(255, 255, 255, 0.25)',
                      },
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={focusedField === 'fullName' ? '#60A5FA' : 'rgba(255, 255, 255, 0.7)'}
                      style={styles.fieldIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="@yourname"
                      placeholderTextColor="rgba(255, 255, 255, 0.45)"
                      value={fullName}
                      onChangeText={(t) => {
                        setFullName(t);
                        if (error) setError(null);
                      }}
                      onFocus={() => setFocusedField('fullName')}
                      onBlur={() => setFocusedField(null)}
                      autoCapitalize="words"
                    />
                  </LinearGradient>
                </View>

                {/* Password Input */}
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
                    {strength.label !== '' && (
                      <Text style={[styles.strengthIndicatorText, { color: strength.color }]}>
                        {strength.label}
                      </Text>
                    )}
                  </LinearGradient>
                </View>

                {/* ─── Gradient Submit Button (Dashboard Blue Theme) ───────── */}
                <TouchableOpacity
                  onPress={handleSignUp}
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
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.submitBtnText}>Sign up</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* ─── Divider: "Or sign up with" ──────────────────────────── */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Or sign up with</Text>
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
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <GoogleLogo size={20} />
                        <Text style={styles.googleBtnText}>Sign up with Google</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* ─── Switch back to Sign In ─────────────────────────────────── */}
              <View style={styles.switchRow}>
                <Text style={styles.switchText}>Already have an account? </Text>
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic.selection();
                    navigation.navigate('SignIn');
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.switchLink}>Sign in</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
    marginBottom: 16,
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
  fieldIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  strengthIndicatorText: {
    fontSize: 11.5,
    fontWeight: '700',
    marginLeft: 6,
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
});