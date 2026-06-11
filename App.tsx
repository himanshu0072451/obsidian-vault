import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import LockScreen from "./screens/LockScreen";
import HomeScreen from "./screens/HomeScreen";
import { Colors, Typography, Spacing, Radius } from "./utils/design";
import { activate as activateScreenSecurity } from "./services/ScreenSecurityService";
import { GestureHandlerRootView } from "react-native-gesture-handler";

function AppNavigator() {
  const {
    isUnlocked,
    isLoading,
    biometricEnabled,
    biometricAvailability,
    enableBiometrics,
    skipBiometricOffer,
    skippedBiometricOffer,
  } = useAuth();

  if (isLoading) {
    return <View style={styles.splash} />;
  }

  // Show biometric setup offer once after unlock if:
  //  - app is unlocked
  //  - device has biometrics enrolled
  //  - user hasn't enabled it yet
  //  - user hasn't tapped "Not now" this session
  const showBiometricOffer =
    isUnlocked &&
    !biometricEnabled &&
    !skippedBiometricOffer &&
    biometricAvailability?.enrolled === true;

  if (showBiometricOffer) {
    const label = biometricAvailability!.label;
    return (
      <Animated.View entering={FadeIn.duration(300)} style={styles.root}>
        <View style={styles.offerContainer}>
          <View style={styles.offerCard}>
            <Text style={styles.offerTitle}>{`Enable ${label}?`}</Text>
            <Text style={styles.offerSubtitle}>
              {`Unlock Image Vault with ${label} instead of entering your passcode each time.`}
            </Text>
            <Pressable
              style={styles.enableBtn}
              onPress={enableBiometrics}
              accessibilityRole="button"
              accessibilityLabel={`Enable ${label} unlock`}
            >
              <Text style={styles.enableBtnText}>{`Enable ${label}`}</Text>
            </Pressable>
            <Pressable
              style={styles.skipBtn}
              onPress={skipBiometricOffer}
              accessibilityRole="button"
              accessibilityLabel="Skip biometric setup"
            >
              <Text style={styles.skipText}>Not now</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.root}>
      {isUnlocked ? <HomeScreen /> : <LockScreen />}
    </Animated.View>
  );
}

export default function App() {
  // Activate screen protection once at app startup.
  // Must be in App() — the stable root — not in AppNavigator which re-renders.
  useEffect(() => {
    return activateScreenSecurity();
  }, []);
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
  offerContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  offerCard: {
    width: "100%",
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.lg,
  },
  offerTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.text,
    textAlign: "center",
    letterSpacing: Typography.tight,
  },
  offerSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  enableBtn: {
    width: "100%",
    height: 56,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  enableBtnText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.black,
    letterSpacing: Typography.wide,
  },
  skipBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  skipText: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    letterSpacing: Typography.wide,
  },
});
