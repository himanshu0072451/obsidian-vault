import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, TextStyle, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  SharedValue,
  runOnJS,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { PasscodeInput } from "../components/PasscodeInput";
import { Typography } from "../utils/design";
import { useAuth } from "../hooks/useAuth";
import { UNLOCK_LAYER_WINDOWS, unlockLayerProgress } from "../utils/unlockLayers";

// 'biometric' = post-setup offer screen
type LockStep = "enter" | "setup" | "confirm" | "biometric";

interface LockScreenProps {
  /** Called the instant a real unlock (passcode or biometric) begins its
   * exit choreography — tells the parent to start rendering HomeScreen
   * underneath while this screen is still visible on top. Never called for
   * the setup/confirm flow — that keeps today's plain instant swap. */
  onUnlockTransitionStart: () => void;
  /** Called once the exit choreography's spring has fully settled — tells
   * the parent it's safe to unmount this screen. */
  onUnlockTransitionEnd: () => void;
}

const errorTextStyle: TextStyle = {
  height: 20,
  fontSize: Typography.sm,
  letterSpacing: Typography.wide,
  color: "rgba(255,255,255,0.6)",
};

// ─── AmbientBackground ──────────────────────────────────────────────────────
// Two large, very low-opacity radial-ish glows that drift slowly — meant to
// be felt more than seen. Small amplitude, long period, pure decoration
// (pointerEvents none) so it can never interfere with input. Also flares
// briefly during the unlock sequence's "glow" layer window.

function AmbientBackground({
  unlockProgress,
}: {
  unlockProgress: SharedValue<number>;
}) {
  const driftA = useSharedValue(0);
  const driftB = useSharedValue(0);

  useEffect(() => {
    driftA.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 9000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    driftB.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 12000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, []);

  const glowAStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: driftA.value * 24 - 12 },
      { translateY: driftA.value * -18 + 9 },
    ],
  }));

  const glowBStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: driftB.value * -20 + 10 },
      { translateY: driftB.value * 16 - 8 },
    ],
  }));

  // Glow layer: intensifies quickly then recedes as its window completes —
  // the "ambient glow gently intensifies" beat, first to react and first
  // to leave (front-most layer in the depth ordering).
  const flareStyle = useAnimatedStyle(() => {
    const p = unlockLayerProgress(
      unlockProgress.value,
      UNLOCK_LAYER_WINDOWS.glow,
    );
    return {
      // Intensify quickly (peak ~40% into this layer's own window), then
      // recede to fully gone by the window's end.
      opacity: interpolate(p, [0, 0.4, 1], [1, 1.6, 0]),
      transform: [{ scale: interpolate(p, [0, 1], [1, 1.12]) }],
    };
  });

  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
    >
      <Animated.View style={flareStyle}>
        <Animated.View style={[{ position: "absolute", top: -140, left: -100 }, glowAStyle]}>
          <LinearGradient
            colors={["rgba(180,180,180,0.10)", "rgba(180,180,180,0)"]}
            style={{ width: 420, height: 420, borderRadius: 210 }}
          />
        </Animated.View>
        <Animated.View style={[{ position: "absolute", bottom: -160, right: -120 }, glowBStyle]}>
          <LinearGradient
            colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0)"]}
            style={{ width: 460, height: 460, borderRadius: 230 }}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export default function LockScreen({
  onUnlockTransitionStart,
  onUnlockTransitionEnd,
}: LockScreenProps) {
  const {
    isSetup,
    isUnlocked,
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

  // ─── Unlock transition ──────────────────────────────────────────────────
  // Single spring drives the entire choreography; every layer (glow,
  // wordmark here, dots/keypad inside PasscodeInput) reads the same value
  // through its own UNLOCK_LAYER_WINDOWS slice, so they can stagger for
  // depth without ever drifting out of sync with each other.
  const unlockProgress = useSharedValue(0);
  // Guards against ever starting the sequence twice (rapid double-tap on
  // the biometric button, or any other double-invocation).
  const hasUnlockedRef = useRef(false);
  // Read from a UI-thread spring callback, so it must be a shared value,
  // not a plain ref — a ref's `.current` wouldn't reflect live JS-thread
  // state inside a worklet. Set false on unmount so a completion callback
  // arriving after this screen is gone can't call back into a dead parent.
  const isMountedShared = useSharedValue(true);

  useEffect(() => {
    return () => {
      isMountedShared.value = false;
      cancelAnimation(unlockProgress);
    };
  }, []);

  // If the app re-locks while this exact LockScreen instance is still
  // mounted (e.g. backgrounded mid-transition with "lock on background"
  // enabled, then relocked before onUnlockTransitionEnd ever fired) —
  // hasUnlockedRef and unlockProgress must reset, or the NEXT correct
  // passcode/biometric attempt would see hasUnlockedRef already true and
  // silently no-op forever, locking the user out until app restart.
  useEffect(() => {
    if (!isUnlocked) {
      hasUnlockedRef.current = false;
      cancelAnimation(unlockProgress);
      unlockProgress.value = 0;
    }
  }, [isUnlocked]);

  const runUnlockSequence = useCallback(() => {
    if (hasUnlockedRef.current) return; // never fire twice
    hasUnlockedRef.current = true;
    onUnlockTransitionStart();
    unlockProgress.value = withSpring(
      1,
      { damping: 20, stiffness: 180 },
      (finished) => {
        if (finished && isMountedShared.value) {
          runOnJS(onUnlockTransitionEnd)();
        }
      },
    );
  }, [onUnlockTransitionStart, onUnlockTransitionEnd]);

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
      // Deliberately does NOT call runUnlockSequence() — first-time setup
      // keeps today's plain instant swap (and the biometric-offer step
      // below, when applicable), not the cinematic reveal. That's reserved
      // for unlocking an already-set-up vault.
      // Offer biometrics if hardware is available — App.tsx will transition
      // to HomeScreen automatically once isUnlocked becomes true, so this
      // step only renders briefly if the user taps "Enable"
      if (biometricAvailability?.supported && biometricAvailability.enrolled) {
        setStep("biometric");
      }
    },
    [step, firstCode, setup, showError, biometricAvailability],
  );

  const handleBiometricUnlock = useCallback(async () => {
    if (hasUnlockedRef.current) return; // already mid-transition — ignore
    const result = await unlockWithBiometrics();
    if (result) {
      runUnlockSequence();
    }
    // If null: user cancelled — stay on LockScreen silently
  }, [unlockWithBiometrics, runUnlockSequence]);

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
      if (hasUnlockedRef.current) return; // already mid-transition — ignore
      const result = await unlock(code);
      if (!result) {
        // Authentication failed — the exit sequence must never start here.
        // unlockProgress is never touched on this path.
        showError("Incorrect passcode");
        logoScale.value = withSequence(
          withTiming(0.95, { duration: 80 }),
          withTiming(1.02, { duration: 80 }),
          withTiming(1, { duration: 80 }),
        );
      } else {
        runUnlockSequence();
      }
    },
    [unlock, showError, runUnlockSequence],
  );

  // Wordmark: its own press/error bump (logoScale, unrelated to the unlock
  // transition) combined with the wordmark exit layer in ONE style — style
  // arrays don't merge `transform` element-wise (the later entry's array
  // wins entirely), so both concerns must be read together here rather
  // than composed via separate Animated.View wrappers.
  const wordmarkStyle = useAnimatedStyle(() => {
    const layer = unlockLayerProgress(
      unlockProgress.value,
      UNLOCK_LAYER_WINDOWS.wordmark,
    );
    return {
      opacity: interpolate(layer, [0, 1], [1, 0]),
      transform: [
        { scale: logoScale.value },
        { translateY: interpolate(layer, [0, 1], [0, -16]) },
      ],
    };
  });

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
    <View className="flex-1 bg-black">
      <AmbientBackground unlockProgress={unlockProgress} />

      <View className="flex-1 px-8 pb-12 pt-24">
        {/* Main cluster — vertically centered rather than stretched
            edge-to-edge; that's what creates the negative space, not a
            spacer element. */}
        <View className="flex-1 items-center justify-center">
          {/* Hero text — outer Animated.View carries only the animated
              scale/exit (no className: NativeWind doesn't auto-intercept
              Animated.View, only plain View/Text/Pressable/etc — see
              components.ts registry). Static layout/typography lives on the
              plain View/Text inside. */}
          <Animated.View style={wordmarkStyle}>
            <Animated.View entering={FadeInDown.duration(500).springify().damping(18)}>
              <View className="mb-12 items-center">
                {/* Tiny eyebrow IS the branding — no logo mark needed. */}
                <Text className="mb-5 text-[11px] font-semibold uppercase tracking-[6px] text-white/35">
                  VAULT
                </Text>
                {/* Large editorial heading — the hero element. Skipped
                    during the biometric-offer step, which renders its own
                    (see below), so the two never duplicate each other. */}
                {step !== "biometric" && (
                  <>
                    <Text className="text-center text-[40px] font-bold leading-[44px] tracking-tight text-white">
                      {label}
                    </Text>
                    {sublabel && (
                      <Text className="mt-3 text-sm tracking-wide text-white/45">
                        {sublabel}
                      </Text>
                    )}
                  </>
                )}
              </View>
            </Animated.View>
          </Animated.View>

          {/* Passcode input — hidden during biometric offer. No label/
              sublabel passed anymore — the hero heading above now carries
              that text; PasscodeInput's own label/sublabel props are
              optional and simply don't render when omitted, so this needed
              no changes to that component at all. */}
          {step !== "biometric" && (
            <Animated.View
              entering={FadeInDown.delay(80).duration(500).springify().damping(18)}
            >
              <View className="w-full items-center">
                <PasscodeInput
                  onComplete={step === "enter" ? handleUnlock : handleSetup}
                  unlockProgress={unlockProgress}
                />
              </View>
            </Animated.View>
          )}

          {/* Biometric offer — shown immediately after passcode setup */}
          {step === "biometric" && (
            <View className="w-full items-center gap-6 px-4">
              <Text className="text-center text-[32px] font-bold leading-[36px] tracking-tight text-white">
                {`Enable ${bioLabel}?`}
              </Text>
              <Text className="max-w-[260px] text-center text-sm leading-5 text-white/50">
                {`Use ${bioLabel} to unlock instead of your passcode`}
              </Text>
              <Pressable
                className="mt-4 h-14 w-full items-center justify-center rounded-xl bg-white active:opacity-80"
                onPress={async () => {
                  await enableBiometrics();
                  // isUnlocked is already true from setup(); App.tsx transitions automatically
                }}
                accessibilityRole="button"
              >
                <Text className="text-base font-semibold tracking-wide text-black">
                  {`Enable ${bioLabel}`}
                </Text>
              </Pressable>
              <Pressable
                className="px-6 py-2 active:opacity-60"
                onPress={() => {
                  // Return to enter step — isUnlocked is already true so
                  // App.tsx will immediately transition to HomeScreen
                  setStep("enter");
                }}
                accessibilityRole="button"
              >
                <Text className="text-sm tracking-wide text-white/50">
                  Not now
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Footer — small, secondary biometric button + error message. */}
        <View className="items-center gap-4">
          {step === "enter" &&
            biometricEnabled &&
            biometricAvailability?.enrolled && (
              <Pressable
                className="items-center gap-2 active:opacity-60"
                onPress={handleBiometricUnlock}
                accessibilityRole="button"
                accessibilityLabel={`Unlock with ${bioLabel}`}
              >
                <View className="h-12 w-12 items-center justify-center rounded-full bg-white/[0.06]">
                  <View className="h-2 w-2 rounded-full bg-white/70" />
                </View>
                <Text className="text-[10px] uppercase tracking-[3px] text-white/35">
                  {bioLabel}
                </Text>
              </Pressable>
            )}

          {/* Error message — Animated.Text isn't NativeWind-registered
              either, same reasoning as above: animation on the wrapper,
              className on a plain Text isn't an option here since the
              opacity must apply to the text itself, so this one keeps a
              plain style object. */}
          <Animated.Text style={[errorStyle, errorTextStyle]}>
            {errorMsg}
          </Animated.Text>
        </View>
      </View>
    </View>
  );
}
