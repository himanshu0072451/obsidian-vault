import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useAnimatedReaction,
  useSharedValue,
  withSequence,
  withTiming,
  withSpring,
  interpolate,
  interpolateColor,
  cancelAnimation,
  runOnJS,
  Easing,
  SharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Colors, Spacing } from "../utils/design";
import { UNLOCK_LAYER_WINDOWS, unlockLayerProgress } from "../utils/unlockLayers";

const MAX_LENGTH = 6;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "Γî½"];

// The point along the last dot's fill spring (0→1) at which it reads to the
// eye as "landed" — not full spring settle. The unlock handoff begins here,
// not at 100%, so the interaction never feels like it's waiting on an
// animation; the remaining ~15% of spring settle (including its small
// overshoot) plays out concurrently with the screen-level transition.
// Retuning the dot spring only ever requires touching this one constant.
const DOT_VISUALLY_SETTLED = 0.85;

interface PasscodeInputProps {
  onComplete: (passcode: string) => void;
  /** Drives the dots/keypad exit layers during the unlock transition.
   * Stays at 0 (no visual effect) outside of a successful "enter" unlock —
   * harmless to always pass, including during setup/confirm steps. */
  unlockProgress: SharedValue<number>;
}

export function PasscodeInput({
  onComplete,
  unlockProgress,
}: PasscodeInputProps) {
  const [code, setCode] = useState("");
  const shakeX = useSharedValue(0);

  // The completed code is captured here the instant the 6th digit is typed,
  // but onComplete() itself isn't called until the last dot's own fill
  // animation actually crosses DOT_VISUALLY_SETTLED — see PasscodeDot's
  // onSettle. This replaces a fixed setTimeout with a real animation signal.
  const pendingCodeRef = useRef<string | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const handleFinalDotSettle = useCallback(() => {
    const pending = pendingCodeRef.current;
    if (pending === null) return;
    pendingCodeRef.current = null;
    onComplete(pending);
  }, [onComplete]);

  const handleKey = useCallback(
    (key: string) => {
      if (key === "Γî½") {
        setCode((prev) => prev.slice(0, -1));
        return;
      }
      if (key === "") return;

      const next = code + key;
      setCode(next);

      if (next.length === MAX_LENGTH) {
        // Tiny haptic the instant the digit lands — independent of the
        // dot's own settle timing, which only gates when onComplete fires.
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        pendingCodeRef.current = next;
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => setCode(""), 600);
      }
    },
    [code],
  );

  const dotsRowStyle = useAnimatedStyle(() => {
    const layer = unlockLayerProgress(
      unlockProgress.value,
      UNLOCK_LAYER_WINDOWS.dots,
    );
    return {
      opacity: interpolate(layer, [0, 1], [1, 0]),
      transform: [
        { translateX: shakeX.value },
        { translateY: interpolate(layer, [0, 1], [0, -10]) },
      ],
    };
  });

  const keypadStyle = useAnimatedStyle(() => {
    const layer = unlockLayerProgress(
      unlockProgress.value,
      UNLOCK_LAYER_WINDOWS.keypad,
    );
    return {
      opacity: interpolate(layer, [0, 1], [1, 0]),
      transform: [
        { translateY: interpolate(layer, [0, 1], [0, 10]) },
        { scale: interpolate(layer, [0, 1], [1, 0.96]) },
      ],
    };
  });

  return (
    <View style={styles.container}>
      {/* Dots */}
      <Animated.View style={[styles.dots, dotsRowStyle]}>
        {Array.from({ length: MAX_LENGTH }).map((_, i) => (
          <PasscodeDot
            key={i}
            filled={i < code.length}
            onSettle={i === MAX_LENGTH - 1 ? handleFinalDotSettle : undefined}
          />
        ))}
      </Animated.View>

      {/* Keypad */}
      <Animated.View style={[styles.keypad, keypadStyle]}>
        {KEYS.map((key, idx) => (
          <KeyButton key={idx} value={key} onPress={() => handleKey(key)} />
        ))}
      </Animated.View>
    </View>
  );
}

// ─── PasscodeDot ────────────────────────────────────────────────────────────
// One dot, fully independent of its siblings. Fill and ripple both derive
// from a single `filled` boolean transition — no cross-dot coordination,
// no per-frame JS work; everything runs on the UI thread via shared values.

interface PasscodeDotProps {
  filled: boolean;
  /** Only provided for the last dot — fires once fillProgress crosses
   * DOT_VISUALLY_SETTLED on a landing (not on every render, not on backspace). */
  onSettle?: () => void;
}

function PasscodeDot({ filled, onSettle }: PasscodeDotProps) {
  const fillProgress = useSharedValue(filled ? 1 : 0);
  // Quick landing pop — separate from fillProgress so it never replays in
  // reverse on backspace; backspace should only shrink+fade, never "un-pop."
  const popScale = useSharedValue(1);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);
  // Guards onSettle so it fires exactly once per landing, even though the
  // spring's own slight overshoot means fillProgress can hover around the
  // threshold briefly. Reset on every new landing (see effect below).
  const hasSettled = useSharedValue(false);

  useEffect(() => {
    if (filled) {
      hasSettled.value = false;

      // damping:22 (was 14) — the previous value was underdamped enough
      // (ζ≈0.43) to overshoot and take ~550-600ms to fully settle, which
      // risked visible wobble stacking up across dots during fast entry.
      // ζ≈0.68 here settles in ~350ms with only a few percent overshoot —
      // still alive, no longer bouncy. The fill is the hero animation, so
      // it needs to read as decisive, not springy.
      fillProgress.value = withSpring(1, { damping: 22, stiffness: 260 });

      popScale.value = withSequence(
        withTiming(1.12, { duration: 80, easing: Easing.out(Easing.cubic) }),
        withSpring(1, { damping: 20, stiffness: 300 }),
      );

      // Landing ripple — hardware feedback, not a notification pulse: very
      // low peak opacity, thin ring, short ease-out. Cancel any in-flight
      // ripple first so rapid typing can never stack overlapping rings on
      // the same dot.
      cancelAnimation(rippleScale);
      cancelAnimation(rippleOpacity);
      rippleScale.value = 0.75;
      rippleOpacity.value = 0.1;
      rippleScale.value = withTiming(1.5, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
      rippleOpacity.value = withTiming(0, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      // Backspace — smooth shrink + fade back to the outline. No pop, no
      // ripple; the fill animation stays the hero, this is its quiet reverse.
      // Resetting hasSettled here means a rapid delete-then-retype on the
      // last dot correctly re-arms the settle trigger for the new landing.
      hasSettled.value = false;
      fillProgress.value = withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [filled]);

  // Fires the unlock handoff at ~85% of the fill, not at 100% — see
  // DOT_VISUALLY_SETTLED. Only meaningful for the last dot (onSettle is
  // undefined for the others, so this is a no-op for them).
  useAnimatedReaction(
    () => fillProgress.value,
    (current, previous) => {
      if (
        !onSettle ||
        hasSettled.value ||
        previous === null ||
        previous >= DOT_VISUALLY_SETTLED ||
        current < DOT_VISUALLY_SETTLED
      ) {
        return;
      }
      hasSettled.value = true;
      runOnJS(onSettle)();
    },
  );

  useEffect(() => {
    return () => {
      cancelAnimation(fillProgress);
      cancelAnimation(popScale);
      cancelAnimation(rippleScale);
      cancelAnimation(rippleOpacity);
    };
  }, []);

  const dotStyle = useAnimatedStyle(() => {
    const restScale = interpolate(fillProgress.value, [0, 1], [0.7, 1]);
    return {
      backgroundColor: interpolateColor(
        fillProgress.value,
        [0, 1],
        ["transparent", Colors.white],
      ),
      borderColor: interpolateColor(
        fillProgress.value,
        [0, 1],
        [Colors.gray, Colors.white],
      ),
      transform: [{ scale: restScale * popScale.value }],
    };
  });

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: rippleOpacity.value,
    transform: [{ scale: rippleScale.value }],
  }));

  return (
    <View style={styles.dotSlot}>
      <Animated.View style={[styles.ripple, rippleStyle]} />
      <Animated.View style={[styles.dot, dotStyle]} />
    </View>
  );
}

function KeyButton({ value, onPress }: { value: string; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (value === "") {
    return <View className="h-20 w-20" />;
  }

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.88, { damping: 15, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 300 });
        }}
        onPress={onPress}
        className="h-20 w-20 items-center justify-center rounded-[11px] bg-white/[0.06]"
        style={styles.keySoftShadow}
      >
        <Text
          className={
            value === "Γî½"
              ? "text-xl text-white/50"
              : "text-xl font-medium text-white"
          }
        >
          {value}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: "100%",
  },
  dots: {
    flexDirection: "row",
    gap: 20,
    marginBottom: Spacing["3xl"],
  },
  // Larger, more intentional — was 14px in a 22px slot.
  dotSlot: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
  },
  ripple: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: Colors.white,
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 280,
    gap: 12,
    justifyContent: "center",
  },
  // Soft surface, no border — the shadow (iOS only; Android's elevation
  // can't render a light-colored glow, only a dark one, which is invisible
  // against a near-black background, so this is intentionally iOS-only
  // rather than a broken Android approximation) gives just enough depth to
  // read as "lit from within" rather than a flat filled square.
  keySoftShadow: {
    shadowColor: "#ffffff",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
});
