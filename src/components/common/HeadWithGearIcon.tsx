import React from "react";
import Svg, { Path, Circle } from "react-native-svg";

interface HeadWithGearIconProps {
  size?: number;
  color?: string;
}

export const HeadWithGearIcon: React.FC<HeadWithGearIconProps> = ({
  size = 28,
  color = "#111827",
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Human Head Profile facing right (matching Image 5) */}
    <Path
      d="M4.5 22V17C4.5 13 3 10.5 4.5 7C6.5 2.5 13.5 1.5 17.5 5.5C18.8 6.8 18 9 18 10.5L21.5 12.5L18 14.2C18.2 15.5 18.5 16.5 17.5 17.2C16.5 17.9 14.5 17.8 14.5 19V22"
      stroke={color}
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Gear Cog Center Hub */}
    <Circle
      cx="10.5"
      cy="10"
      r="2.2"
      stroke={color}
      strokeWidth={1.8}
    />
    {/* Gear Cog Outer Teeth ring */}
    <Circle
      cx="10.5"
      cy="10"
      r="3.5"
      stroke={color}
      strokeWidth={1.4}
      strokeDasharray="2.5 2"
    />
    {/* 6 Gear Cog Teeth */}
    <Path
      d="M10.5 5.5V7M10.5 13V14.5M6.6 7.8L7.9 8.5M13.1 11.5L14.4 12.2M6.6 12.2L7.9 11.5M13.1 8.5L14.4 7.8"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
    />
  </Svg>
);

export default HeadWithGearIcon;
