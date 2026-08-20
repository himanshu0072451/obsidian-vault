import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp, TextInput } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius } from '../utils/design';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

interface StatCardProps {
  value: string | number;
  label: string;
  style?: StyleProp<ViewStyle>;
}

export function StatCard({ value, label, style }: StatCardProps) {
  return (
    <Card style={[styles.stat, style]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

// ─── HeroStat ───────────────────────────────────────────────────────────────
// Editorial-style dominant stat used at the top of the Home screen: one large
// count-up number carrying the eye, with a quiet caption beneath it.

interface HeroStatProps {
  eyebrow: string;
  value: number;
  caption: string;
}

export function HeroStat({ eyebrow, value, caption }: HeroStatProps) {
  const animated = useSharedValue(0);

  useEffect(() => {
    animated.value = withTiming(value, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [value]);

  const animatedProps = useAnimatedProps(() => ({
    text: `${Math.round(animated.value)}`,
    defaultValue: `${Math.round(animated.value)}`,
  }));

  return (
    <View style={styles.hero}>
      <Text style={styles.heroEyebrow}>{eyebrow}</Text>
      <AnimatedTextInput
        style={styles.heroValue}
        animatedProps={animatedProps}
        editable={false}
        pointerEvents="none"
        underlineColorAndroid="transparent"
        defaultValue={`${value}`}
      />
      <Text style={styles.heroCaption}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  } as ViewStyle,
  stat: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  } as ViewStyle,
  statValue: {
    fontSize: Typography['3xl'],
    fontWeight: Typography.bold,
    color: Colors.text,
    letterSpacing: Typography.tight,
  },
  statLabel: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 4,
    letterSpacing: Typography.widest,
    textTransform: 'uppercase',
  },

  hero: {
    alignItems: 'flex-start',
  } as ViewStyle,
  heroEyebrow: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textMuted,
    letterSpacing: Typography.widest,
    textTransform: 'uppercase',
  },
  heroValue: {
    fontSize: Typography['6xl'],
    fontWeight: Typography.bold,
    color: Colors.text,
    letterSpacing: Typography.tight,
    padding: 0,
    marginTop: 2,
    // Android TextInput defaults to a min-height + vertical padding that
    // pushes the huge display digits out of line with the eyebrow/caption.
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  heroCaption: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
