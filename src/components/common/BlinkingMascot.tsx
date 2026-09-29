import React from 'react';
import SmartyMascot, { MascotMood } from './SmartyMascot';
import { StyleProp, ViewStyle, ImageStyle } from 'react-native';

export { MascotMood, SmartyMascot };

interface BlinkingMascotProps {
  size?: number;
  mood?: MascotMood;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  onPress?: () => void;
}

export const BlinkingMascot: React.FC<BlinkingMascotProps> = (props) => {
  return <SmartyMascot {...props} />;
};

export default BlinkingMascot;
