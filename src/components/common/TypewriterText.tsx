import React, { useState, useEffect } from "react";
import { Text, TextStyle, StyleProp, StyleSheet } from "react-native";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  style?: StyleProp<TextStyle>;
  cursorColor?: string;
  showCursor?: boolean;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 35,
  style,
  cursorColor = "#FB7185",
  showCursor = true,
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    let index = 0;
    setDisplayedText("");

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  // Cursor blink effect
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 500);

    return () => clearInterval(blinkInterval);
  }, []);

  const isFinished = displayedText.length >= text.length;

  return (
    <Text style={style}>
      {displayedText}
      {showCursor && !isFinished && (
        <Text style={{ color: cursorColor, opacity: cursorVisible ? 1 : 0 }}>|</Text>
      )}
    </Text>
  );
};

export default TypewriterText;
