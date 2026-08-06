/**
 * ChangePasscodeSheet — full-screen overlay for changing the vault passcode.
 *
 * Three steps:
 *   1. verify  — current passcode (identity check)
 *   2. enter   — new passcode
 *   3. confirm — retype new passcode
 *
 * Reuses PasscodeInput from LockScreen.
 * Rendered as position:absolute (not Modal) — same pattern as TagSheet.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, { FadeIn, FadeOut, useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { PasscodeInput } from './PasscodeInput';
import { Colors, Typography, Spacing, Radius } from '../utils/design';

interface ChangePasscodeSheetProps {
  visible: boolean;
  onClose: () => void;
  onChangePasscode: (current: string, next: string) => Promise<'ok' | 'wrong_current'>;
}

type Step = 'verify' | 'enter' | 'confirm';

export function ChangePasscodeSheet({
  visible,
  onClose,
  onChangePasscode,
}: ChangePasscodeSheetProps) {
  const [step, setStep]                   = useState<Step>('verify');
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode]     = useState('');
  const [error, setError]                 = useState<string | null>(null);

  // This sheet has no unlock choreography of its own — PasscodeInput just
  // requires the shared value to exist. Stays at 0 forever, so it has no
  // visual effect (matches the prop's documented "harmless to always pass"
  // contract).
  const unlockProgress = useSharedValue(0);

  const reset = useCallback(() => {
    setStep('verify');
    setCurrentPasscode('');
    setNewPasscode('');
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleVerify = useCallback((entered: string) => {
    setCurrentPasscode(entered);
    setError(null);
    setStep('enter');
  }, []);

  const handleEnter = useCallback((entered: string) => {
    setNewPasscode(entered);
    setError(null);
    setStep('confirm');
  }, []);

  const handleConfirm = useCallback(async (entered: string) => {
    if (entered !== newPasscode) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError('Passcodes do not match. Try again.');
      setStep('enter');
      setNewPasscode('');
      return;
    }
    const result = await onChangePasscode(currentPasscode, newPasscode);
    if (result === 'wrong_current') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError('Current passcode is incorrect.');
      reset();
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    reset();
    onClose();
  }, [currentPasscode, newPasscode, onChangePasscode, reset, onClose]);

  if (!visible) return null;

  const config = {
    verify:  { label: 'Enter current passcode',  sublabel: 'Confirm your identity first',       onComplete: handleVerify  },
    enter:   { label: 'Enter new passcode',       sublabel: 'Choose a new 6-digit passcode',     onComplete: handleEnter   },
    confirm: { label: 'Confirm new passcode',     sublabel: 'Re-enter your new passcode',        onComplete: handleConfirm },
  }[step];

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      style={styles.overlay}
    >
      {/* Header bar */}
      <View style={styles.header}>
        <Pressable onPress={handleClose} style={styles.cancelBtn} accessibilityRole="button" accessibilityLabel="Cancel">
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.title}>Change Passcode</Text>
        {/* spacer to center the title */}
        <View style={styles.cancelBtn} />
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.inputArea}>
        <Text style={styles.stepLabel}>{config.label}</Text>
        <Text style={styles.stepSublabel}>{config.sublabel}</Text>
        <PasscodeInput
          onComplete={config.onComplete}
          unlockProgress={unlockProgress}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: Colors.background,
    zIndex: 9999,
    elevation: 9999,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  } as ViewStyle,
  title: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.text,
    letterSpacing: Typography.tight,
  } as TextStyle,
  cancelBtn: { width: 64 } as ViewStyle,
  cancelText: { fontSize: Typography.base, color: Colors.textSecondary } as TextStyle,
  errorBanner: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: Colors.midDark,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gray,
    padding: Spacing.md,
  } as ViewStyle,
  errorText: {
    fontSize: Typography.sm,
    color: Colors.lightGray,
    textAlign: 'center',
  } as TextStyle,
  inputArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  stepLabel: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.text,
    letterSpacing: Typography.tight,
    textAlign: 'center',
    marginBottom: 6,
  } as TextStyle,
  stepSublabel: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  } as TextStyle,
});
