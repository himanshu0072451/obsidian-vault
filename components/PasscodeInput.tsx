import React, { useState, useCallback, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Vibration } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { Colors, Typography, Spacing, Radius } from "../utils/design";

const MAX_LENGTH = 6;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "Γî½"];

interface PasscodeInputProps {
  onComplete: (passcode: string) => void;
  onError?: () => void; // Called to trigger shake
  label?: string;
  sublabel?: string;
}

export function PasscodeInput({
  onComplete,
  onError,
  label,
  sublabel,
}: PasscodeInputProps) {
  const [code, setCode] = useState("");
  const shakeX = useSharedValue(0);
  const dotsOpacity = useSharedValue(1);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  // Trigger shake animation from parent
  useEffect(() => {
    if (onError) {
      // Reset code and shake
    }
  }, [onError]);

  const shake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(-12, { duration: 60 }),
      withTiming(12, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
    Vibration.vibrate(200);
  }, []);

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
        onComplete(next);
        // Reset after a brief delay
        setTimeout(() => setCode(""), 600);
      }
    },
    [code, onComplete],
  );

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}

      {/* Dots */}
      <Animated.View style={[styles.dots, shakeStyle]}>
        {Array.from({ length: MAX_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i < code.length && styles.dotFilled]}
          />
        ))}
      </Animated.View>

      {/* Keypad */}
      <View style={styles.keypad}>
        {KEYS.map((key, idx) => (
          <KeyButton key={idx} value={key} onPress={() => handleKey(key)} />
        ))}
      </View>
    </View>
  );
}

function KeyButton({ value, onPress }: { value: string; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (value === "") {
    return <View style={styles.keyPlaceholder} />;
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
        style={styles.key}
      >
        <Text style={value === "Γî½" ? styles.backspace : styles.keyText}>
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
  label: {
    fontSize: Typography["2xl"],
    fontWeight: Typography.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    letterSpacing: Typography.tight,
  },
  sublabel: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing["2xl"],
    letterSpacing: Typography.wide,
    textTransform: "uppercase",
  },
  dots: {
    flexDirection: "row",
    gap: 16,
    marginBottom: Spacing["3xl"],
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: Colors.gray,
    backgroundColor: "transparent",
  },
  dotFilled: {
    backgroundColor: Colors.white,
    borderColor: Colors.white,
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 280,
    gap: 12,
    justifyContent: "center",
  },
  key: {
    width: 80,
    height: 80,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  keyPlaceholder: {
    width: 80,
    height: 80,
  },
  keyText: {
    fontSize: Typography.xl,
    fontWeight: Typography.medium,
    color: Colors.text,
  },
  backspace: {
    fontSize: Typography.xl,
    color: Colors.textSecondary,
  },
});
