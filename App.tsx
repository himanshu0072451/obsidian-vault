import React, { useEffect, useState, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import { View, Text, Pressable, StyleSheet, Platform, DevSettings } from "react-native";
import Animated, {
  FadeIn,
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { OnboardingProvider, useOnboarding } from "./hooks/useOnboarding";
import LockScreen from "./screens/LockScreen";
import CamouflageCalculator from "./screens/CamouflageCalculator";
import HomeScreen from "./screens/HomeScreen";
import SettingsScreen from "./screens/SettingsScreen";
import OnboardingIntro from "./screens/OnboardingIntro";
import { Colors, Typography, Spacing, Radius } from "./utils/design";
import { activate as activateScreenSecurity } from "./services/ScreenSecurityService";
import { setDevScreenshotMode } from "./modules/dev-screenshot-mode";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./global.css";

// ─── HomeRevealWrapper ──────────────────────────────────────────────────────
// Owns HomeScreen's entrance (scale 0.97→1, spring) entirely externally —
// HomeScreen itself receives no new props and is completely unaware this
// exists, so none of its own re-render behavior is affected. This is the
// "arriving with depth" half of the unlock choreography; LockScreen (as an
// overlay on top, see AppNavigator below) owns the "lifting away" half.
function HomeRevealWrapper({ children }: { children: React.ReactNode }) {
  const revealScale = useSharedValue(0.97);
  const revealOpacity = useSharedValue(0);

  useEffect(() => {
    revealScale.value = withSpring(1, { damping: 20, stiffness: 180 });
    revealOpacity.value = withTiming(1, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
    return () => {
      cancelAnimation(revealScale);
      cancelAnimation(revealOpacity);
    };
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: revealOpacity.value,
    transform: [{ scale: revealScale.value }],
  }));

  return <Animated.View style={[{ flex: 1 }, style]}>{children}</Animated.View>;
}

function AppNavigator() {
  const {
    isUnlocked,
    isLoading,
    biometricEnabled,
    biometricAvailability,
    enableBiometrics,
    skipBiometricOffer,
    skippedBiometricOffer,
    vaultContext,
    camouflageModeEnabled,
    isSetup,
  } = useAuth();
  const { loadingFlags, introSeen, markIntroSeen } = useOnboarding();

  const [showSettings, setShowSettings] = useState(false);
  const [indexRebuildKey, setIndexRebuildKey] = useState(0);
  // Kept mounted (as an overlay on top of HomeScreen) for the duration of
  // LockScreen's own exit choreography. Only ever set by LockScreen's two
  // callbacks below — never inferred from `isUnlocked` flipping, since that
  // also flips true for first-time setup, which intentionally does NOT get
  // the cinematic transition (see handleSetup in LockScreen.tsx).
  const [isUnlockTransitioning, setIsUnlockTransitioning] = useState(false);

  const handleOpenSettings = useCallback(() => setShowSettings(true), []);
  const handleCloseSettings = useCallback(() => setShowSettings(false), []);
  const handleIndexRebuilt = useCallback(() => {
    setIndexRebuildKey((k) => k + 1);
    setShowSettings(false);
  }, []);
  const handleUnlockTransitionStart = useCallback(
    () => setIsUnlockTransitioning(true),
    [],
  );
  const handleUnlockTransitionEnd = useCallback(
    () => setIsUnlockTransitioning(false),
    [],
  );

  useEffect(() => {
    if (!isUnlocked) {
      setShowSettings(false);
      // If the app re-locks (background timeout, etc.) while a transition
      // was somehow still in flight, don't leave the overlay stuck on.
      setIsUnlockTransitioning(false);
    }
  }, [isUnlocked]);

  if (isLoading || loadingFlags) {
    return <View style={styles.splash} />;
  }

  // First-ever launch (no passcode configured yet) and the intro hasn't
  // been dismissed — shown before passcode setup, not after, since it's
  // explaining what the app is in the first place.
  if (!isSetup && !introSeen) {
    return (
      <View style={styles.root}>
        <OnboardingIntro onDone={markIntroSeen} />
      </View>
    );
  }

  // Show biometric setup offer once after unlock if:
  //  - app is unlocked
  //  - the unlock reveal transition (if any) has finished
  //  - device has biometrics enrolled
  //  - user hasn't enabled it yet
  //  - user hasn't tapped "Not now" this session
  const showBiometricOffer =
    isUnlocked &&
    !isUnlockTransitioning &&
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
              {`Unlock Veilo with ${label} instead of entering your passcode each time.`}
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
      {/* Mounted the instant isUnlocked flips true — including during the
          transition, so it's already arriving underneath while LockScreen
          (below, as an overlay) is still lifting away on top of it. */}
      {isUnlocked && (
        <HomeRevealWrapper>
          <HomeScreen
            onOpenSettings={handleOpenSettings}
            indexRebuildKey={indexRebuildKey}
          />
        </HomeRevealWrapper>
      )}
      {/* Locked (normal case, fills the whole screen) OR mid-transition
          (overlaid on top of HomeScreen via absoluteFill, running its own
          exit choreography). Camouflage Mode swaps in the Calculator
          disguise instead of LockScreen — both share the identical
          onUnlockTransitionStart/End contract, so no other routing logic
          changes. */}
      {(!isUnlocked || isUnlockTransitioning) && (
        <View style={StyleSheet.absoluteFill}>
          {camouflageModeEnabled ? (
            <CamouflageCalculator
              onUnlockTransitionStart={handleUnlockTransitionStart}
              onUnlockTransitionEnd={handleUnlockTransitionEnd}
            />
          ) : (
            <LockScreen
              onUnlockTransitionStart={handleUnlockTransitionStart}
              onUnlockTransitionEnd={handleUnlockTransitionEnd}
            />
          )}
        </View>
      )}
      {isUnlocked && !isUnlockTransitioning && showSettings && vaultContext === "real" && (
        <SettingsScreen
          onClose={handleCloseSettings}
          onIndexRebuilt={handleIndexRebuilt}
        />
      )}
    </Animated.View>
  );
}

export default function App() {
  // Activate screen protection once at app startup.
  // Must be in App() — the stable root — not in AppNavigator which re-renders.
  useEffect(() => {
    return activateScreenSecurity();
  }, []);

  // DEV-only: adds a "Toggle Screenshot Mode" entry to React Native's dev
  // menu (shake the device, or Ctrl+M / Cmd+D) for hiding the status +
  // navigation bars while taking marketing screenshots — see
  // modules/dev-screenshot-mode. Entirely absent from production builds:
  // this whole block is skipped outside __DEV__, and DevSettings itself
  // doesn't exist in release builds either.
  useEffect(() => {
    if (!__DEV__ || Platform.OS !== "android") return;
    let screenshotModeOn = false;
    DevSettings.addMenuItem("Toggle Screenshot Mode (hide bars)", () => {
      screenshotModeOn = !screenshotModeOn;
      setDevScreenshotMode(screenshotModeOn);
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <OnboardingProvider>
            <StatusBar style="light" />
            <AppNavigator />
          </OnboardingProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
