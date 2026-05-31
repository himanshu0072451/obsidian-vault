import React from "react";
import { StatusBar } from "expo-status-bar";
import { View, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import LockScreen from "./screens/LockScreen";
import HomeScreen from "./screens/HomeScreen";
import { Colors } from "./utils/design";

function AppNavigator() {
  const { isUnlocked, isLoading } = useAuth();

  if (isLoading) {
    // Blank screen while checking secure store
    return <View style={styles.splash} />;
  }

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.root}>
      {isUnlocked ? <HomeScreen /> : <LockScreen />}
    </Animated.View>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  splash: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});


