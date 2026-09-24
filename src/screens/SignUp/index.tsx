import React, { useState } from 'react';
import { View, ScrollView, Image, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import InputField from '../../components/common/InputField';
import Header from '../../components/common/Header';
import THEME from '../../config/theme';

export default function SignUp() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('Marty Goboy');
  const [email, setEmail] = useState('marty.goboy@edu.com');
  const [password, setPassword] = useState('password123');
  const [confirmPassword, setConfirmPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await signUp(email.trim(), password, fullName.trim());
      // Navigate through onboarding to introduce user to features
      navigation.navigate('MainOnboard1');
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Header showBack title="" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.contentWrapper}>
          {/* Header */}
          <View style={styles.headerSection}>
            <Image
              source={require("../../../assets/illustrations/smarty_logo.png")}
              resizeMode="contain"
              style={styles.logoImage}
            />
            <Text style={styles.titleText}>Join Smarty AI</Text>
            <Text style={styles.subtitleText}>Create an account to save progress across devices.</Text>
          </View>

          {/* Form */}
          <View style={styles.formSection}>
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            <InputField
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your Name"
              autoCapitalize="words"
              leftIcon="person-outline"
            />

            <InputField
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="imu@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              leftIcon="mail-outline"
            />

            <InputField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              isPassword
              leftIcon="lock-closed-outline"
            />

            <InputField
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeat password"
              isPassword
              leftIcon="shield-checkmark-outline"
            />

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Switch to Sign In */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
              <Text style={styles.switchLink}>Sign in</Text>
            </TouchableOpacity>
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
    marginTop: 8,
    marginBottom: 24,
  },
  logoImage: {
    width: 60,
    height: 60,
    marginBottom: 12,
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
    marginBottom: 20,
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
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 8,
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
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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