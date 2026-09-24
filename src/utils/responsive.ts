import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions from standard mobile design (iPhone 11 / 12 / 13 / 14 / 15 standard: ~390 x 844)
const baseWidth = 390;
const baseHeight = 844;

export const wp = (percentage: number): number => {
  return (percentage * SCREEN_WIDTH) / 100;
};

export const hp = (percentage: number): number => {
  return (percentage * SCREEN_HEIGHT) / 100;
};

export const scaleFont = (size: number): number => {
  const scale = SCREEN_WIDTH / baseWidth;
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
};

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isTablet = SCREEN_WIDTH >= 768;

export const responsive = {
  wp,
  hp,
  scaleFont,
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  isIOS,
  isAndroid,
  isTablet,
};

export default responsive;
