// Collects and validates the passcode only — does not call setupDecoy()
// itself, that's the caller's responsibility once onConfirm fires.
// onConfirm reports back whether the caller accepted the passcode, so a
// same-as-real-vault collision can be shown inline instead of failing silently.

import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, Radius } from '../utils/design';
import { PasscodeInput } from './PasscodeInput';

// ─── Types ────────────────────────────────────────────────────────────────────

type DecoyStep = 'enter' | 'confirm';

interface DecoySetupSheetProps {
  visible: boolean;
  /** Called with the confirmed passcode once both entries match. Resolves
   *  to "collision" if the caller rejected it (e.g. same as the real vault
   *  passcode), so the sheet can show the reason and let the user retry. */
  onConfirm: (passcode: string) => Promise<"ok" | "collision">;
  onCancel: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DecoySetupSheet({
  visible,
  onConfirm,
  onCancel,
}: DecoySetupSheetProps) {
  const [step, setStep]           = useState<DecoyStep>('enter');
  const [firstCode, setFirstCode] = useState('');
  const [errorMsg, setErrorMsg]   = useState('');

  const sheetScale   = useSharedValue(0.92);
  const sheetOpacity = useSharedValue(0);
  const errorOpacity = useSharedValue(0);
  // No unlock choreography here — PasscodeInput just requires the shared
  // value to exist. Stays at 0 forever, so it has no visual effect.
  const unlockProgress = useSharedValue(0);

  // Reset internal state each time the sheet opens
  useEffect(() => {
    if (visible) {
      setStep('enter');
      setFirstCode('');
      setErrorMsg('');
      errorOpacity.value = 0;
      sheetScale.value   = withSpring(1, { damping: 22, stiffness: 240 });
      sheetOpacity.value = withTiming(1, { duration: 180 });
    } else {
      sheetScale.value   = 0.92;
      sheetOpacity.value = 0;
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sheetScale.value }],
    opacity: sheetOpacity.value,
  }));

  const errorStyle = useAnimatedStyle(() => ({
    opacity: errorOpacity.value,
  }));

  const showError = useCallback((msg: string) => {
    setErrorMsg(msg);
    errorOpacity.value = withSequence(
      withTiming(1, { duration: 120 }),
      withTiming(1, { duration: 1400 }),
      withTiming(0, { duration: 300 })
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  }, []);

  const handleComplete = useCallback(
    async (code: string) => {
      if (step === 'enter') {
        setFirstCode(code);
        setStep('confirm');
        return;
      }

      // Confirm step
      if (code !== firstCode) {
        showError('Passcodes do not match');
        setStep('enter');
        setFirstCode('');
        return;
      }

      const result = await onConfirm(code);
      if (result === 'collision') {
        showError("Choose a different password. It can't be the same as your main vault password.");
        setStep('enter');
        setFirstCode('');
      }
    },
    [step, firstCode, onConfirm, showError]
  );

  const label    = step === 'enter' ? 'Decoy Passcode' : 'Confirm Passcode';
  const sublabel = step === 'enter' ? '6-digit code'   : 'Re-enter to confirm';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onCancel}>
        {/* Inner Pressable stops backdrop tap passing through the sheet */}
        <Pressable onPress={() => {}} style={styles.sheetWrap}>
          <Animated.View style={[styles.sheet, sheetStyle]}>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Set Up Decoy Vault</Text>
              <Text style={styles.subtitle}>
                Choose a separate passcode. Entering it will open a completely
                independent vault.
              </Text>
            </View>

            {/* Passcode dots */}
            <View style={styles.inputArea}>
              <Text style={styles.stepLabel}>{label}</Text>
              <Text style={styles.stepSublabel}>{sublabel}</Text>
              <PasscodeInput
                key={step}   /* remount on step change to reset dot state */
                onComplete={handleComplete}
                unlockProgress={unlockProgress}
              />
            </View>

            {/* Mismatch error */}
            <Animated.Text style={[styles.error, errorStyle]}>
              {errorMsg}
            </Animated.Text>

            {/* Cancel link */}
            <Pressable
              onPress={onCancel}
              style={styles.cancelBtn}
              accessibilityRole="button"
              accessibilityLabel="Cancel decoy setup"
              hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,

  sheetWrap: {
    width: '100%',
    paddingHorizontal: Spacing.xl,
  } as ViewStyle,

  sheet: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
  } as ViewStyle,

  header: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  } as ViewStyle,

  title: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.text,
    letterSpacing: Typography.tight,
    textAlign: 'center',
  } as TextStyle,

  subtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  } as TextStyle,

  inputArea: {
    width: '100%',
    alignItems: 'center',
    paddingTop: Spacing.sm,
  } as ViewStyle,

  stepLabel: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.text,
    letterSpacing: Typography.tight,
    textAlign: 'center',
    marginBottom: 4,
  } as TextStyle,

  stepSublabel: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  } as TextStyle,

  error: {
    fontSize: Typography.sm,
    color: Colors.lightGray,
    letterSpacing: Typography.wide,
    minHeight: 18,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
  } as TextStyle,

  cancelBtn: {
    paddingVertical: Spacing.xs,
  } as ViewStyle,

  cancelText: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    letterSpacing: Typography.wide,
  } as TextStyle,
});
