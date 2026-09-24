import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import THEME from '../../config/theme';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'gradient';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const isGradient = variant === 'gradient' || variant === 'primary';

  if (isGradient) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={[styles.wrapper, style, disabled && styles.disabled]}
      >
        <LinearGradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          colors={THEME.colors.primaryGradient}
          style={styles.gradient}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={[styles.gradientText, textStyle]}>{title}</Text>
              {icon}
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const getVariantStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryButton;
      case 'outline':
        return styles.outlineButton;
      default:
        return styles.secondaryButton;
    }
  };

  const getVariantTextStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryText;
      case 'outline':
        return styles.outlineText;
      default:
        return styles.secondaryText;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[styles.button, getVariantStyle(), style, disabled && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? THEME.colors.primary : '#1B1931'} size="small" />
      ) : (
        <>
          <Text style={[styles.text, getVariantTextStyle(), textStyle]}>{title}</Text>
          {icon}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: THEME.colors.primary,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
    marginVertical: 6,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  gradientText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginRight: 6,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginVertical: 6,
  },
  secondaryButton: {
    backgroundColor: '#EAE5FF',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginRight: 6,
  },
  secondaryText: {
    color: '#1B1931',
  },
  outlineText: {
    color: THEME.colors.primary,
  },
  disabled: {
    opacity: 0.6,
  },
});

export default CustomButton;
