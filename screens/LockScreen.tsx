import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ViewStyle,
  TextStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withSpring,
  FadeIn,
} from "react-native-reanimated";
import { PasscodeInput } from "../components/PasscodeInput";
import { Colors, Typography, Spacing, Radius } from "../utils/design";
import { useAuth } from "../hooks/useAuth";

// 'biometric' = post-setup offer screen
type LockStep = "enter" | "setup" | "confirm" | "biometric";

export default function LockScreen() {
  const {
    isSetup,
    unlock,
    setup,
    biometricEnabled,
    biometricAvailability,
    unlockWithBiometrics,
    enableBiometrics,
  } = useAuth();
  const [step, setStep] = useState<LockStep>(isSetup ? "enter" : "setup");
  const [firstCode, setFirstCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const logoScale = useSharedValue(1);
  const errorOpacity = useSharedValue(0);

  const showError = useCallback((msg: string) => {
    setErrorMsg(msg);
    errorOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(1, { duration: 1500 }),
      withTiming(0, { duration: 300 }),
    );
  }, []);

  const handleSetup = useCallback(
    async (code: string) => {
      if (step === "setup") {
        setFirstCode(code);
        setStep("confirm");
        return;
      }
      // Confirm step
      if (code !== firstCode) {
        showError("Passcodes do not match");
        setStep("setup");
        setFirstCode("");
        return;
      }
      logoScale.value = withSpring(1.05, { damping: 10 }, () => {
        logoScale.value = withSpring(1);
      });
      await setup(code);
      // Offer biometrics if hardware is available ΓÇö App.tsx will transition
      // to HomeScreen automatically once isUnlocked becomes true, so this
      // step only renders briefly if the user taps "Enable"
      if (biometricAvailability?.supported && biometricAvailability.enrolled) {
        setStep("biometric");
      }
    },
    [step, firstCode, setup, showError, biometricAvailability],
  );

  const handleBiometricUnlock = useCallback(async () => {
    const result = await unlockWithBiometrics();
    if (result) {
      logoScale.value = withSpring(1.08, { damping: 10 }, () => {
        logoScale.value = withSpring(1);
      });
    }
    // If null: user cancelled ΓÇö stay on LockScreen silently
  }, [unlockWithBiometrics]);

  // Auto-trigger biometrics on mount when enabled + enrolled
  useEffect(() => {
    if (
      step !== "enter" ||
      !biometricEnabled ||
      !biometricAvailability?.enrolled
    )
      return;
    const t = setTimeout(handleBiometricUnlock, 400);
    return () => clearTimeout(t);
    // Intentionally runs once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUnlock = useCallback(
    async (code: string) => {
      const result = await unlock(code);
      if (!result) {
        showError("Incorrect passcode");
        logoScale.value = withSequence(
          withTiming(0.95, { duration: 80 }),
          withTiming(1.02, { duration: 80 }),
          withTiming(1, { duration: 80 }),
        );
      } else {
        logoScale.value = withSpring(1.08, { damping: 10 }, () => {
          logoScale.value = withSpring(1);
        });
        // App.tsx handles the biometric offer after isUnlocked becomes true
      }
    },
    [unlock, showError],
  );

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const errorStyle = useAnimatedStyle(() => ({
    opacity: errorOpacity.value,
  }));

  const bioLabel = biometricAvailability?.label ?? "Biometrics";

  const label =
    step === "enter"
      ? "Enter Passcode"
      : step === "setup"
        ? "Create Passcode"
        : step === "confirm"
          ? "Confirm Passcode"
          : /* biometric */ `Enable ${bioLabel}?`;

  const sublabel =
    step === "setup"
      ? "6-digit code"
      : step === "confirm"
        ? "Re-enter to confirm"
        : step === "biometric"
          ? `Use ${bioLabel} to unlock instead of your passcode`
          : undefined;

  return (
    <SafeAreaView style={styles.root}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.inner}>
        {/* Logo */}
        <Animated.View style={[styles.logoArea, logoStyle]}>
          <View style={styles.logoMark}>
            <Text style={styles.logoIcon}>Γ¼í</Text>
          </View>
          <Text style={styles.appName}>IMAGE VAULT</Text>
          <Text style={styles.tagline}>
            {isSetup ? "Secured" : "Setup required"}
          </Text>
        </Animated.View>

        {/* Passcode input ΓÇö hidden during biometric offer */}
        {step !== "biometric" && (
          <View style={styles.inputArea}>
            <PasscodeInput
              label={label}
              sublabel={sublabel}
              onComplete={step === "enter" ? handleUnlock : handleSetup}
            />
          </View>
        )}

        {/* Biometric offer ΓÇö shown immediately after passcode setup */}
        {step === "biometric" && (
          <View style={styles.biometricOffer}>
            <Text style={styles.biometricTitle}>{`Enable ${bioLabel}?`}</Text>
            <Text style={styles.biometricSubtitle}>
              {`Use ${bioLabel} to unlock instead of your passcode`}
            </Text>
            <Pressable
              style={styles.biometricEnableBtn}
              onPress={async () => {
                await enableBiometrics();
                // isUnlocked is already true from setup(); App.tsx transitions automatically
              }}
              accessibilityRole="button"
            >
              <Text
                style={styles.biometricEnableBtnText}
              >{`Enable ${bioLabel}`}</Text>
            </Pressable>
            <Pressable
              style={styles.biometricSkipBtn}
              onPress={() => {
                // Return to enter step ΓÇö isUnlocked is already true so
                // App.tsx will immediately transition to HomeScreen
                setStep("enter");
              }}
              accessibilityRole="button"
            >
              <Text style={styles.biometricSkipText}>Not now</Text>
            </Pressable>
          </View>
        )}

        {/* Biometric unlock button ΓÇö shown on enter step when enrolled + enabled */}
        {step === "enter" &&
          biometricEnabled &&
          biometricAvailability?.enrolled && (
            <Pressable
              style={styles.biometricBtn}
              onPress={handleBiometricUnlock}
              accessibilityRole="button"
              accessibilityLabel={`Unlock with ${bioLabel}`}
            >
              <Text style={styles.biometricBtnText}>{`Use ${bioLabel}`}</Text>
            </Pressable>
          )}

        {/* Error message */}
        <Animated.Text style={[styles.error, errorStyle]}>
          {errorMsg}
        </Animated.Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  } as ViewStyle,
  inner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing["2xl"],
    paddingHorizontal: Spacing.xl,
  } as ViewStyle,
  logoArea: {
    alignItems: "center",
    marginTop: Spacing["2xl"],
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  logoIcon: {
    fontSize: 36,
    color: Colors.silver,
  },
  appName: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.text,
    letterSpacing: Typography.widest,
    marginBottom: 4,
  },
  tagline: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    letterSpacing: Typography.wider,
    textTransform: "uppercase",
  },
  inputArea: {
    width: "100%",
    alignItems: "center",
  },
  error: {
    fontSize: Typography.sm,
    color: Colors.lightGray,
    letterSpacing: Typography.wide,
    height: 20,
  },

  //Biometric offer (post-setup) 
  biometricOffer: {
    width: "100%",
    alignItems: "center",
    gap: Spacing.lg,
    paddingHorizontal: Spacing.md,
  } as ViewStyle,
  biometricTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.text,
    textAlign: "center",
    letterSpacing: Typography.tight,
  } as TextStyle,
  biometricSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  } as TextStyle,
  biometricEnableBtn: {
    width: "100%",
    height: 56,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  biometricEnableBtnText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.black,
    letterSpacing: Typography.wide,
  } as TextStyle,
  biometricSkipBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  } as ViewStyle,
  biometricSkipText: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    letterSpacing: Typography.wide,
  } as TextStyle,

  //Biometric unlock button (enter step)
  biometricBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  } as ViewStyle,
  biometricBtnText: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    color: Colors.textSecondary,
    letterSpacing: Typography.wide,
  } as TextStyle,
});
