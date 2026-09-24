import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';
import { RootStackParamList } from '../../types/navigation';
import { useResponsive } from '../../hooks/useResponsive';

export type TabKey = 'Home' | 'Quizzes' | 'Create' | 'Awards' | 'Performance';

interface BottomNavProps {
  activeTab: TabKey;
}

// 1. Home Icon matching user-provided Image 1 (House with central doorway cutout)
const HomeIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 10.5L12 3.2L21 10.5V20.5C21 21.05 20.55 21.5 20 21.5H15V13.8H9V21.5H4C3.45 21.5 3 21.05 3 20.5V10.5Z"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 2. Quizzes Clipboard Icon with Checkmark matching user-provided Image 4
const QuizzesIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Clipboard rounded body */}
    <Rect
      x="4"
      y="4.5"
      width="16"
      height="16.5"
      rx="3.5"
      stroke={color}
      strokeWidth={2.4}
    />
    {/* Top clip bracket */}
    <Path
      d="M9 4.5V2.5C9 1.95 9.45 1.5 10 1.5H14C14.55 1.5 15 1.95 15 2.5V4.5"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Thick checkmark */}
    <Path
      d="M8.5 13L11.2 15.8L15.8 10"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 3. Create Sparkles Icon matching user-provided Image 2 (Large star with center diamond cutout + 2 solid stars)
const CreateSparklesIcon: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
    {/* Large primary 4-pointed star with diamond cutout */}
    <Path
      d="M10 2 C10 6 13.5 9.5 17.5 9.5 C13.5 9.5 10 13 10 17 C10 13 6.5 9.5 2.5 9.5 C6.5 9.5 10 6 10 2 Z M10 7.2 L12 9.5 L10 11.8 L8 9.5 Z"
      fill="#FFFFFF"
      fillRule="evenodd"
    />
    {/* Upper-right solid 4-pointed star */}
    <Path
      d="M19 1.5 C19 3.5 20.2 4.6 22 4.6 C20.2 4.6 19 5.7 19 7.7 C19 5.7 17.8 4.6 16 4.6 C17.8 4.6 19 3.5 19 1.5 Z"
      fill="#FFFFFF"
    />
    {/* Lower-right solid 4-pointed star */}
    <Path
      d="M19 13.5 C19 15.3 20.2 16.4 22 16.4 C20.2 16.4 19 17.5 19 19.5 C19 17.5 17.8 16.4 16 16.4 C17.8 16.4 19 15.3 19 13.5 Z"
      fill="#FFFFFF"
    />
  </Svg>
);

// 4. Awards Military/Honor Ribbon Medal + Hanging Star matching user-provided Image 3
const AwardsIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Ribbon banner outer shape */}
    <Path
      d="M5 2.5H19V11L12 14.5L5 11V2.5Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Two vertical stripes inside ribbon */}
    <Path
      d="M9.5 2.5V12M14.5 2.5V12"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    {/* Hanging solid 5-pointed star medal */}
    <Path
      d="M12 14.5L13.3 17.2L16.2 17.4L14 19.3L14.7 22L12 20.4L9.3 22L10 19.3L7.8 17.4L10.7 17.2Z"
      fill={color}
      stroke={color}
      strokeWidth={0.8}
      strokeLinejoin="round"
    />
  </Svg>
);

// 5. Performance Zigzag Trendline Icon matching screenshot
const PerformanceIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3.5 16.5L8.5 11L13 15L20.5 6.5"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { insets } = useResponsive();

  const handleTabPress = (tab: TabKey) => {
    switch (tab) {
      case 'Home':
        navigation.navigate('Dashboard');
        break;
      case 'Quizzes':
        navigation.navigate('MyQuizzes');
        break;
      case 'Create':
        navigation.navigate('UploadQuiz');
        break;
      case 'Awards':
        navigation.navigate('Achievements');
        break;
      case 'Performance':
        navigation.navigate('Performance');
        break;
    }
  };

  const tabs: {
    key: TabKey;
    label: string;
    isFab?: boolean;
    renderIcon: (color: string) => React.ReactNode;
  }[] = [
    {
      key: 'Home',
      label: 'Home',
      renderIcon: (color) => <HomeIcon color={color} size={24} />,
    },
    {
      key: 'Quizzes',
      label: 'Quizzes',
      renderIcon: (color) => <QuizzesIcon color={color} size={24} />,
    },
    {
      key: 'Create',
      label: 'Create',
      isFab: true,
      renderIcon: () => <CreateSparklesIcon size={30} />,
    },
    {
      key: 'Awards',
      label: 'Awards',
      renderIcon: (color) => <AwardsIcon color={color} size={24} />,
    },
    {
      key: 'Performance',
      label: 'Performance',
      renderIcon: (color) => <PerformanceIcon color={color} size={24} />,
    },
  ];

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      <View style={styles.navRow}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const activeColor = '#4648D4';
          const inactiveColor = '#464554';
          const itemColor = isActive ? activeColor : inactiveColor;

          if (tab.isFab) {
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.fabTabItem}
                onPress={() => handleTabPress(tab.key)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  colors={['#4F46E5', '#6D44F2', '#7C3AED']}
                  style={styles.fabCircle}
                >
                  {tab.renderIcon('#FFFFFF')}
                </LinearGradient>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => handleTabPress(tab.key)}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrapper}>
                {tab.renderIcon(itemColor)}
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* iOS Home Indicator Bar */}
      <View style={styles.homeIndicator} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 2,
    minHeight: 52,
  },
  fabTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 2,
    minHeight: 52,
  },
  iconWrapper: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  fabCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#464554',
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    color: '#4648D4',
    fontWeight: '800',
  },
  homeIndicator: {
    width: 134,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 2,
  },
});

export default BottomNav;
