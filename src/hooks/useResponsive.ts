import { useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const useResponsive = () => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isSmallScreen = width < 375;
  const isTablet = width >= 768;
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';

  const wp = (percentage: number): number => (percentage * width) / 100;
  const hp = (percentage: number): number => (percentage * height) / 100;

  const scaleFont = (size: number): number => {
    const scale = width / 390;
    const newSize = Math.round(size * Math.min(Math.max(scale, 0.85), 1.3));
    return newSize;
  };

  return {
    width,
    height,
    insets,
    isSmallScreen,
    isTablet,
    isIOS,
    isAndroid,
    wp,
    hp,
    scaleFont,
  };
};

export default useResponsive;
