import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import { QuizProvider } from "./src/context/QuizContext";
import { AppNavigator } from "./src/navigation/AppNavigator";

export default function App() {
  const content = (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <QuizProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </QuizProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );

  if (Platform.OS === "web") {
    return (
      <View style={styles.webContainer}>
        <View style={styles.webFrame}>
          {content}
        </View>
      </View>
    );
  }

  return content;
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