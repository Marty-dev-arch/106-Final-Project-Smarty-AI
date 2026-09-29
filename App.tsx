import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { AuthProvider } from "./src/context/AuthContext";
import { QuizProvider } from "./src/context/QuizContext";
import { NotificationProvider } from "./src/context/NotificationContext";
import { ToastProvider } from "./src/context/ToastContext";
import { AppNavigator } from "./src/navigation/AppNavigator";

function AppMain() {
  const { isDark, colors } = useTheme();

  const content = (
    <SafeAreaProvider>
      <StatusBar style={isDark ? "light" : "dark"} />
      <AuthProvider>
        <NotificationProvider>
          <QuizProvider>
            <ToastProvider>
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
            </ToastProvider>
          </QuizProvider>
        </NotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );

  if (Platform.OS === "web") {
    return (
      <View style={[styles.webContainer, { backgroundColor: isDark ? "#050811" : "#EEF2F6" }]}>
        <View style={[styles.webFrame, { backgroundColor: colors.background }]}>
          {content}
        </View>
      </View>
    );
  }

  return content;
}

export default function App() {
  return (
    <ThemeProvider>
      <AppMain />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: "#EEF2F6",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  webFrame: {
    width: "100%",
    maxWidth: 460,
    height: "100%",
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 24,
    overflow: "hidden",
  },
});