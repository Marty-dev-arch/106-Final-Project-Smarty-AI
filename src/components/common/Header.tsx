import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import THEME from '../../config/theme';
import { BellIcon } from './TopBar';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  showBell?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = true,
  onBackPress,
  rightComponent,
  rightIcon,
  onRightPress,
  showBell = false,
}) => {
  const navigation = useNavigation();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.leftContainer}>
        {showBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={24} color={THEME.colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.titleContainer}>
        {Boolean(title) && <Text style={styles.titleText}>{title}</Text>}
        {Boolean(subtitle) && <Text style={styles.subtitleText}>{subtitle}</Text>}
      </View>

      <View style={styles.rightContainer}>
        {rightComponent ? (
          rightComponent
        ) : showBell ? (
          <TouchableOpacity
            style={styles.rightButton}
            onPress={onRightPress}
            activeOpacity={0.7}
          >
            <BellIcon size={22} color={THEME.colors.textPrimary} />
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity
            style={styles.rightButton}
            onPress={onRightPress}
            activeOpacity={0.7}
          >
            <Ionicons name={rightIcon} size={22} color={THEME.colors.textPrimary} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  leftContainer: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  subtitleText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  rightContainer: {
    width: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rightButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0EBFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Header;
