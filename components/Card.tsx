import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../utils/design';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

interface StatCardProps {
  value: string | number;
  label: string;
  style?: ViewStyle;
}

export function StatCard({ value, label, style }: StatCardProps) {
  return (
    <Card style={[styles.stat, style]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
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
});
