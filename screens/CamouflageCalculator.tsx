/**
 * CamouflageCalculator — a genuine, working 4-function calculator that
 * silently unlocks the vault when your real (or decoy) passcode is typed.
 *
 * Secret detection: a rolling buffer of the last SECRET_LENGTH *digit*
 * presses only — operators, AC, decimal, sign, percent are all invisible to
 * it (they neither add to nor reset the buffer). After every digit press,
 * once the buffer is full, it's checked with useAuth's quickCheckPasscode —
 * a cheap, side-effect-free check (no session state changes) safe to call on
 * every digit press. Only once that returns true do we call the real
 * unlock() (the exact same function LockScreen calls) to actually establish
 * the session — so there is no separate secret store and no duplicated
 * authentication logic. This means the "secret PIN" is simply your actual
 * vault passcode, typed via calculator buttons instead of the passcode
 * dot-keypad — see the conversation record for why an independent secret
 * isn't possible (the passcode is also the AES key-derivation material, not
 * just a gate). This component never sees a hash or touches storage —
 * useAuth is the only layer that knows how passcodes are verified.
 *
 * Because operators never reset the buffer, the digits of your passcode can
 * be spread across an otherwise-ordinary-looking calculation (e.g.
 * "12+58-0=") and still be detected — which makes the disguise stronger,
 * not weaker, since no one has to watch you type a suspicious bare number.
 *
 * The unlock-trigger mechanism (unlockProgress, hasUnlockedRef,
 * isMountedShared, relock-reset effect) is shared with LockScreen via
 * useUnlockTransition — only the animation shape driving unlockProgress
 * (a plain fade here vs. LockScreen's layered spring) differs per screen.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useAuth } from "../hooks/useAuth";
import { useUnlockTransition } from "../hooks/useUnlockTransition";

type Operator = "+" | "−" | "×" | "÷";

const MAX_DISPLAY_LENGTH = 9;

// Vault passcodes are always exactly 6 digits (PasscodeInput's MAX_LENGTH) —
// this mirrors that constant so the rolling window is exactly as long as a
// real passcode, never shorter (would miss matches) or longer (would need
// the user to "overshoot" past their real passcode to trigger it).
const SECRET_LENGTH = 6;

interface CamouflageCalculatorProps {
  /** Called the instant the secret passcode is detected — tells the parent
   * to start rendering HomeScreen underneath while this screen is still
   * visible on top. Same contract LockScreen uses. */
  onUnlockTransitionStart: () => void;
  /** Called once the exit fade has fully settled — tells the parent it's
   * safe to unmount this screen. */
  onUnlockTransitionEnd: () => void;
}

function formatResult(value: number): string {
  if (!Number.isFinite(value)) return "Error";
  // Avoid runaway float noise (0.1 + 0.2 style) and overly long displays.
  let str = parseFloat(value.toPrecision(10)).toString();
  if (str.length > MAX_DISPLAY_LENGTH) {
    str = value.toExponential(3);
  }
  return str;
}

function calculate(first: number, second: number, operator: Operator): number {
  switch (operator) {
    case "+":
      return first + second;
    case "−":
      return first - second;
    case "×":
      return first * second;
    case "÷":
      return second === 0 ? NaN : first / second;
  }
}

export default function CamouflageCalculator({
  onUnlockTransitionStart,
  onUnlockTransitionEnd,
}: CamouflageCalculatorProps) {
  const { isUnlocked, unlock, quickCheckPasscode } = useAuth();
  const [display, setDisplay] = useState("0");
  const [firstOperand, setFirstOperand] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [waitingForSecondOperand, setWaitingForSecondOperand] =
    useState(false);

  // ─── Secret detection ───────────────────────────────────────────────────
  // Plain ref, not state — this is a background security check, not part
  // of any visible UI, so it doesn't need to trigger re-renders.
  const digitBufferRef = useRef<string[]>([]);

  // Single clean fade — a calculator has no wordmark/dots/keypad-style
  // regions to choreograph, so this is the only screen-specific piece;
  // the guard/mount/relock-reset lifecycle lives in useUnlockTransition
  // (shared with LockScreen).
  const driveProgress = useCallback(
    (progress: SharedValue<number>, onFinished: (finished?: boolean) => void) => {
      progress.value = withTiming(1, { duration: 260 }, onFinished);
    },
    [],
  );
  const { unlockProgress, hasUnlockedRef, runUnlockSequence } =
    useUnlockTransition({
      onUnlockTransitionStart,
      onUnlockTransitionEnd,
      driveProgress,
    });

  // Screen-specific reset that useUnlockTransition doesn't know about —
  // the secret-detection buffer must never survive a relock, same reason
  // hasUnlockedRef doesn't.
  useEffect(() => {
    if (!isUnlocked) {
      digitBufferRef.current = [];
    }
  }, [isUnlocked]);

  // Only ever called from inputDigit — operators/AC/decimal/sign/percent
  // never touch the buffer at all, so the passcode's digits can be spread
  // across an otherwise-normal-looking calculation and still be caught.
  const checkSecretBuffer = useCallback(
    (digit: string) => {
      if (hasUnlockedRef.current) return; // already unlocking — stop checking
      const next = [...digitBufferRef.current, digit].slice(-SECRET_LENGTH);
      digitBufferRef.current = next;
      if (next.length < SECRET_LENGTH) return;

      const candidate = next.join("");
      // Cheap advisory check first — only escalates to the real unlock()
      // (which commits session state) on a likely match.
      quickCheckPasscode(candidate)
        .then((likely) => {
          if (!likely || hasUnlockedRef.current) return;
          return unlock(candidate).then((result) => {
            if (result) runUnlockSequence();
          });
        })
        .catch(() => {
          // Never let a verification error surface here — this must be
          // indistinguishable from a normal wrong-number calculator moment.
        });
    },
    [quickCheckPasscode, unlock, runUnlockSequence],
  );

  const inputDigit = useCallback(
    (digit: string) => {
      checkSecretBuffer(digit);
      if (waitingForSecondOperand) {
        setDisplay(digit);
        setWaitingForSecondOperand(false);
        return;
      }
      setDisplay((prev) => {
        if (prev === "0") return digit;
        if (prev.replace("-", "").replace(".", "").length >= MAX_DISPLAY_LENGTH) {
          return prev;
        }
        return prev + digit;
      });
    },
    [waitingForSecondOperand, checkSecretBuffer],
  );

  const inputDecimal = useCallback(() => {
    if (waitingForSecondOperand) {
      setDisplay("0.");
      setWaitingForSecondOperand(false);
      return;
    }
    setDisplay((prev) => (prev.includes(".") ? prev : prev + "."));
  }, [waitingForSecondOperand]);

  const clear = useCallback(() => {
    setDisplay("0");
    setFirstOperand(null);
    setOperator(null);
    setWaitingForSecondOperand(false);
  }, []);

  const toggleSign = useCallback(() => {
    setDisplay((prev) =>
      prev === "0" ? prev : prev.startsWith("-") ? prev.slice(1) : "-" + prev,
    );
  }, []);

  const inputPercent = useCallback(() => {
    setDisplay((prev) => formatResult(parseFloat(prev) / 100));
  }, []);

  const performOperator = useCallback(
    (nextOperator: Operator) => {
      const inputValue = parseFloat(display);

      if (operator && waitingForSecondOperand) {
        // Just swapping which operator is pending — e.g. "5 +" then "×".
        setOperator(nextOperator);
        return;
      }

      if (firstOperand === null) {
        setFirstOperand(inputValue);
      } else if (operator) {
        const result = calculate(firstOperand, inputValue, operator);
        setDisplay(formatResult(result));
        setFirstOperand(result);
      }

      setWaitingForSecondOperand(true);
      setOperator(nextOperator);
    },
    [display, firstOperand, operator, waitingForSecondOperand],
  );

  const performEquals = useCallback(() => {
    const inputValue = parseFloat(display);

    if (operator === null || firstOperand === null) return;

    const result = calculate(firstOperand, inputValue, operator);
    setDisplay(formatResult(result));
    setFirstOperand(null);
    setOperator(null);
    setWaitingForSecondOperand(false);
  }, [display, firstOperand, operator]);

  // Single clean fade — no multi-layer stagger. A calculator has no
  // wordmark/dots/keypad-style regions to choreograph, and a plain, quiet
  // fade is a better fit for "nothing suspicious just happened" than an
  // elaborate reveal would be.
  const rootStyle = useAnimatedStyle(() => ({
    opacity: 1 - unlockProgress.value,
  }));

  return (
    <Animated.View style={[{ flex: 1 }, rootStyle]}>
      <View className="flex-1 justify-end bg-black px-3 pb-8">
      <View className="mb-6 items-end px-4">
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.4}
          className="text-[80px] font-light text-white"
        >
          {display}
        </Text>
      </View>

      <View className="gap-3">
        <View className="flex-row gap-3">
          <CalcButton label="C" variant="function" onPress={clear} />
          <CalcButton label="+/-" variant="function" onPress={toggleSign} />
          <CalcButton label="%" variant="function" onPress={inputPercent} />
          <CalcButton
            label="÷"
            variant="operator"
            active={operator === "÷" && waitingForSecondOperand}
            onPress={() => performOperator("÷")}
          />
        </View>
        <View className="flex-row gap-3">
          <CalcButton label="7" variant="digit" onPress={() => inputDigit("7")} />
          <CalcButton label="8" variant="digit" onPress={() => inputDigit("8")} />
          <CalcButton label="9" variant="digit" onPress={() => inputDigit("9")} />
          <CalcButton
            label="×"
            variant="operator"
            active={operator === "×" && waitingForSecondOperand}
            onPress={() => performOperator("×")}
          />
        </View>
        <View className="flex-row gap-3">
          <CalcButton label="4" variant="digit" onPress={() => inputDigit("4")} />
          <CalcButton label="5" variant="digit" onPress={() => inputDigit("5")} />
          <CalcButton label="6" variant="digit" onPress={() => inputDigit("6")} />
          <CalcButton
            label="−"
            variant="operator"
            active={operator === "−" && waitingForSecondOperand}
            onPress={() => performOperator("−")}
          />
        </View>
        <View className="flex-row gap-3">
          <CalcButton label="1" variant="digit" onPress={() => inputDigit("1")} />
          <CalcButton label="2" variant="digit" onPress={() => inputDigit("2")} />
          <CalcButton label="3" variant="digit" onPress={() => inputDigit("3")} />
          <CalcButton
            label="+"
            variant="operator"
            active={operator === "+" && waitingForSecondOperand}
            onPress={() => performOperator("+")}
          />
        </View>
        <View className="flex-row gap-3">
          <CalcButton
            label="0"
            variant="digit"
            wide
            onPress={() => inputDigit("0")}
          />
          <CalcButton label="." variant="digit" onPress={inputDecimal} />
          <CalcButton label="=" variant="operator" onPress={performEquals} />
        </View>
      </View>
      </View>
    </Animated.View>
  );
}

// ─── CalcButton ─────────────────────────────────────────────────────────────

interface CalcButtonProps {
  label: string;
  variant: "digit" | "function" | "operator";
  active?: boolean;
  wide?: boolean;
  onPress: () => void;
}

const VARIANT_CLASSES: Record<CalcButtonProps["variant"], string> = {
  digit: "bg-[#333333]",
  function: "bg-[#a5a5a5]",
  operator: "bg-[#ff9f0a]",
};

const VARIANT_TEXT_CLASSES: Record<CalcButtonProps["variant"], string> = {
  digit: "text-white",
  function: "text-black",
  operator: "text-white",
};

function CalcButton({ label, variant, active, wide, onPress }: CalcButtonProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, []);

  return (
    <Animated.View style={[{ flex: wide ? 2.15 : 1 }, animStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className={`h-20 items-center justify-center rounded-full ${
          active ? "bg-white" : VARIANT_CLASSES[variant]
        } ${wide ? "flex-row justify-start pl-8" : ""}`}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text
          className={`text-[32px] font-normal ${
            active ? "text-[#ff9f0a]" : VARIANT_TEXT_CLASSES[variant]
          }`}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
