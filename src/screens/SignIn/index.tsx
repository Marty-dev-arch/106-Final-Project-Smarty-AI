import React, { useState } from 'react';
import { View, ScrollView, Image, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import InputField from '../../components/common/InputField';
import Header from '../../components/common/Header';
import THEME from '../../config/theme';

export default function SignIn() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signIn, guestSignIn } = useAuth();

  const [email, setEmail] = useState('imu@email.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      navigation.navigate('Dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    await guestSignIn();
    navigation.navigate('Dashboard');
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Header showBack title="" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.contentWrapper}>
          {/* Header Illustration & Welcome */}
          <View style={styles.headerSection}>
            <Image
              source={require("../../../assets/illustrations/smarty_logo.png")}
              resizeMode="contain"
              style={styles.logoImage}
            />
            <Text style={styles.titleText}>Welcome back</Text>
            <Text style={styles.subtitleText}>Sign in to reach your quizzes and progress.</Text>
          </View>

          {/* Form */}
          <View style={styles.formSection}>
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            <InputField
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="name@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              leftIcon="mail-outline"
            />

            <InputField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              isPassword
              leftIcon="lock-closed-outline"
            />

            <TouchableOpacity style={styles.forgotButton} onPress={() => alert('Password reset link sent to ' + email)}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Sign in</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Social / Guest / SignUp footer */}
          <View style={styles.footerSection}>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.guestButton} onPress={handleGuest}>
              <Text style={styles.guestButtonText}>Continue as guest</Text>
            </TouchableOpacity>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.switchLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 28,
  },
  logoImage: {
    width: 64,
    height: 64,
    marginBottom: 16,
  },
  titleText: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  subtitleText: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  formSection: {
    width: '100%',
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: THEME.colors.errorLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    color: THEME.colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -8,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: THEME.colors.primary,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  arrowIcon: {
    width: 14,
    height: 14,
    tintColor: '#FFFFFF',
  },
  footerSection: {
    alignItems: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  guestButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 24,
  },
  guestButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
  },
  switchLink: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
});