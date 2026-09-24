import React, { useEffect, useRef } from "react";
import { View, Image, Animated, StyleSheet, StyleProp, ViewStyle, ImageStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

interface BlinkingMascotProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

export const BlinkingMascot: React.FC<BlinkingMascotProps> = ({
  size = 90,
  style,
  imageStyle,
}) => {
  // blinkAnim: 0 = eyes open, 1 = eyes closed
  const blinkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const scheduleBlink = () => {
      // Blink every 2.5 to 4.5 seconds randomly
      const delay = Math.floor(Math.random() * 2000) + 2500;
      timeoutId = setTimeout(() => {
        if (!isMounted) return;

        // Perform blink
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.delay(90),
          Animated.timing(blinkAnim, {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (isMounted) {
            // 30% chance of a quick double-blink
            if (Math.random() < 0.3) {
              setTimeout(() => {
                if (!isMounted) return;
                Animated.sequence([
                  Animated.timing(blinkAnim, {
                    toValue: 1,
                    duration: 80,
                    useNativeDriver: true,
                  }),
                  Animated.delay(60),
                  Animated.timing(blinkAnim, {
                    toValue: 0,
                    duration: 100,
                    useNativeDriver: true,
                  }),
                ]).start(() => {
                  if (isMounted) scheduleBlink();
                });
              }, 120);
            } else {
              scheduleBlink();
            }
          }
        });
      }, delay);
    };

    scheduleBlink();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [blinkAnim]);

  // Height and width calculated from size
  const mascotWidth = size;
  const mascotHeight = size * (734 / 807);

  return (
    <View style={[{ width: mascotWidth, height: mascotHeight, position: "relative" }, style]}>
      <Image
        source={require("../../../assets/illustrations/smarty_companion_mascot.png")}
        style={[{ width: "100%", height: "100%" }, imageStyle]}
        resizeMode="contain"
      />

      {/* Left Eye Blink Overlay (Coordinates: left: 37%, top: 45%, width: 15%, height: 16%) */}
      <Animated.View
        style={[
          styles.eyelidOverlay,
          {
            left: "36.5%",
            top: "44.5%",
            width: "15.5%",
            height: "16.5%",
            opacity: blinkAnim,
            transform: [
              {
                scaleY: blinkAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.1, 1],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.eyelidSkin}>
          {/* Closed happy arc line */}
          <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
            <Path
              d="M4 14C7 8 17 8 20 14"
              stroke="#362127"
              strokeWidth={3.5}
              strokeLinecap="round"
            />
          </Svg>
        </View>
      </Animated.View>

      {/* Right Eye Blink Overlay (Coordinates: left: 68%, top: 45%, width: 16%, height: 16%) */}
      <Animated.View
        style={[
          styles.eyelidOverlay,
          {
            left: "67.5%",
            top: "44.5%",
            width: "16%",
            height: "16.5%",
            opacity: blinkAnim,
            transform: [
              {
                scaleY: blinkAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.1, 1],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.eyelidSkin}>
          {/* Closed happy arc line */}
          <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
            <Path
              d="M4 14C7 8 17 8 20 14"
              stroke="#362127"
              strokeWidth={3.5}
              strokeLinecap="round"
            />
          </Svg>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  eyelidOverlay: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  eyelidSkin: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F2C5CC",
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
});

export default BlinkingMascot;
