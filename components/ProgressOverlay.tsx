import React, { useEffect } from "react";
import { View, Text, StyleSheet, Modal, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { Colors, Typography, Spacing, Radius } from "../utils/design";
import { Button } from "./Button";

export type OperationStatus = "idle" | "running" | "success" | "error";

interface ProgressOverlayProps {
  visible: boolean;
  status: OperationStatus;
  progress: number;
  message: string;
  error: string | null;
  onDismiss: () => void;
}

export function ProgressOverlay({
  visible,
  status,
  progress,
  message,
  error,
  onDismiss,
}: ProgressOverlayProps) {
  const barWidth = useSharedValue(0);
  const contentScale = useSharedValue(0.9);
  const contentOpacity = useSharedValue(0);

  // console.log("ProgressOverlay", visible, status);

  useEffect(() => {
    if (visible) {
      contentScale.value = withSpring(1, { damping: 20, stiffness: 200 });
      contentOpacity.value = withTiming(1, { duration: 200 });
    } else {
      contentScale.value = 0.9;
      contentOpacity.value = 0;
    }
  }, [visible]);

  useEffect(() => {
    barWidth.value = withTiming(progress, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value * 100}%`,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: contentScale.value }],
    opacity: contentOpacity.value,
  }));

  const isDone = status === "success" || status === "error";
  if (!visible) return null;
  return (
    // <Modal transparent visible={visible} animationType="fade">
    <View
      style={[
        StyleSheet.absoluteFillObject,
        {
          backgroundColor: "rgba(0,0,0,0.85)",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
        },
      ]}
    >
      <View style={styles.backdrop}>
        <Animated.View style={[styles.sheet, contentStyle]}>
          {/* Icon area */}
          <View style={styles.iconArea}>
            {status === "running" && (
              <View style={styles.spinnerRing}>
                <Text style={styles.iconText}>⚙</Text>
              </View>
            )}
            {status === "success" && (
              <Text style={[styles.statusIcon, styles.successIcon]}>✓</Text>
            )}
            {status === "error" && (
              <Text style={[styles.statusIcon, styles.errorIcon]}>✕</Text>
            )}
          </View>

          {/* Message */}
          <Text style={styles.message}>
            {status === "error" ? error : message}
          </Text>

          {/* Progress bar */}
          {status === "running" && (
            <View style={styles.track}>
              <Animated.View style={[styles.bar, barStyle]} />
            </View>
          )}

          {/* Dismiss button when done */}
          {isDone && (
            <Button
              label="Done"
              onPress={onDismiss}
              variant={status === "success" ? "primary" : "secondary"}
              style={styles.doneButton}
              fullWidth
            />
          )}
        </Animated.View>
      </View>
    </View>
    // {/* </Modal> */}
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  } as ViewStyle,
  sheet: {
    width: "100%",
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  } as ViewStyle,
  iconArea: {
    marginBottom: Spacing.lg,
  },
  spinnerRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 28,
    color: Colors.textSecondary,
  },
  statusIcon: {
    fontSize: 40,
    fontWeight: Typography.bold,
  },
  successIcon: {
    color: Colors.silver,
  },
  errorIcon: {
    color: Colors.lightGray,
  },
  message: {
    fontSize: Typography.md,
    color: Colors.text,
    fontWeight: Typography.medium,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  track: {
    width: "100%",
    height: 3,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: Spacing.md,
  } as ViewStyle,
  bar: {
    height: "100%",
    backgroundColor: Colors.silver,
    borderRadius: 2,
  } as ViewStyle,
  doneButton: {
    marginTop: Spacing.md,
  } as ViewStyle,
});
