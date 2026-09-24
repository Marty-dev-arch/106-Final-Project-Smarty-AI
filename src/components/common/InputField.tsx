import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import THEME from '../../config/theme';

interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  leftIcon,
  isPassword = false,
  ...rest
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.container,
          isFocused && styles.focusedContainer,
          error ? styles.errorContainer : null,
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={isFocused ? THEME.colors.primary : '#9CA3AF'}
            style={styles.leftIcon}
          />
        )}
        <TextInput
          style={styles.input}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  focusedContainer: {
    borderColor: THEME.colors.primary,
    backgroundColor: '#FFFFFF',
    shadowColor: THEME.colors.primary,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  errorContainer: {
    borderColor: THEME.colors.error,
  },
  leftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: THEME.colors.textPrimary,
    paddingVertical: 8,
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: THEME.colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default InputField;
