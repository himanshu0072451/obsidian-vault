import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import { PasscodeInput } from '../components/PasscodeInput';
import { Colors, Typography, Spacing } from '../utils/design';
import { useAuth } from '../hooks/useAuth';

type LockStep = 'enter' | 'setup' | 'confirm';

export default function LockScreen() {
  const { isSetup, unlock, setup } = useAuth();
  const [step, setStep] = useState<LockStep>(isSetup ? 'enter' : 'setup');
  const [firstCode, setFirstCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const logoScale = useSharedValue(1);
  const errorOpacity = useSharedValue(0);

  const showError = useCallback((msg: string) => {
    setErrorMsg(msg);
    errorOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(1, { duration: 1500 }),
      withTiming(0, { duration: 300 })
    );
  }, []);

  const handleSetup = useCallback(
    (code: string) => {
      if (step === 'setup') {
        setFirstCode(code);
        setStep('confirm');
        return;
      }
      // Confirm step
      if (code !== firstCode) {
        showError('Passcodes do not match');
        setStep('setup');
        setFirstCode('');
        return;
      }
      logoScale.value = withSpring(1.05, { damping: 10 }, () => {
        logoScale.value = withSpring(1);
      });
      setup(code);
    },
    [step, firstCode, setup, showError]
  );

  const handleUnlock = useCallback(
    async (code: string) => {
      const valid = await unlock(code);
      if (!valid) {
        showError('Incorrect passcode');
        logoScale.value = withSequence(
          withTiming(0.95, { duration: 80 }),
          withTiming(1.02, { duration: 80 }),
          withTiming(1, { duration: 80 })
        );
      } else {
        logoScale.value = withSpring(1.08, { damping: 10 }, () => {
          logoScale.value = withSpring(1);
        });
      }
    },
    [unlock, showError]
  );

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const errorStyle = useAnimatedStyle(() => ({
    opacity: errorOpacity.value,
  }));

  const label =
    step === 'enter'
      ? 'Enter Passcode'
      : step === 'setup'
      ? 'Create Passcode'
      : 'Confirm Passcode';

  const sublabel =
    step === 'setup'
      ? '6-digit code'
      : step === 'confirm'
      ? 'Re-enter to confirm'
      : undefined;

  return (
    <SafeAreaView style={styles.root}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.inner}>
        {/* Logo */}
        <Animated.View style={[styles.logoArea, logoStyle]}>
          <View style={styles.logoMark}>
            <Text style={styles.logoIcon}>⬡</Text>
          </View>
          <Text style={styles.appName}>IMAGE VAULT</Text>
          <Text style={styles.tagline}>
            {isSetup ? 'Secured' : 'Setup required'}
          </Text>
        </Animated.View>

        {/* Passcode input */}
        <View style={styles.inputArea}>
          <PasscodeInput
            label={label}
            sublabel={sublabel}
            onComplete={step === 'enter' ? handleUnlock : handleSetup}
          />
        </View>

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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
  } as ViewStyle,
  logoArea: {
    alignItems: 'center',
    marginTop: Spacing['2xl'],
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
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
    textTransform: 'uppercase',
  },
  inputArea: {
    width: '100%',
    alignItems: 'center',
  },
  error: {
    fontSize: Typography.sm,
    color: Colors.lightGray,
    letterSpacing: Typography.wide,
    height: 20,
  },
});
