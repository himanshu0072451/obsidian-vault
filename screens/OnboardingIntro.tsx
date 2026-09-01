// Gated on !isSetup in App.tsx — shown once, before passcode setup.

import React, { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, ViewStyle, TextStyle } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Colors, Typography, Spacing, Radius } from "../utils/design";
import { Button } from "../components/Button";

interface Slide {
  glyph: string;
  eyebrow: string;
  title: string;
  body: string;
  warning?: string;
  hint?: string;
}

const SLIDES: Slide[] = [
  {
    glyph: "⬡",
    eyebrow: "What is Veilo?",
    title: "Private photos. Actually private.",
    body: "Veilo keeps your personal photos separate from your regular gallery: encrypted on your phone, and only visible inside the app.",
  },
  {
    glyph: "⎋",
    eyebrow: "Make Photos Private",
    title: "Import it, and it's private",
    body: "When you add a photo, Veilo encrypts it right away and removes the original from your device gallery. The encrypted copy stays safe inside the app.",
    warning:
      "Heads up: if Google Photos backup is turned on, the original may still be sitting in your Google Account. Veilo can't reach into the cloud to remove it.",
  },
  {
    glyph: "⚙",
    eyebrow: "Your Vault, Your Way",
    title: "Unlock it however you like",
    body: "Use your passcode or your fingerprint or face to get in. Turn on Camouflage Mode and the app looks like an ordinary calculator until you type your real passcode. Everything stays encrypted on your device the whole time.",
    hint: "Need a second vault? Veilo can keep a separate decoy vault with its own password, tucked away in the app once you're set up.",
  },
];

interface OnboardingIntroProps {
  onDone: () => void;
}

export default function OnboardingIntro({ onDone }: OnboardingIntroProps) {
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  const handleContinue = useCallback(() => {
    if (isLast) {
      onDone();
    } else {
      setIndex((i) => i + 1);
    }
  }, [isLast, onDone]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>
        <Pressable
          onPress={onDone}
          hitSlop={8}
          style={styles.skipBtn}
          accessibilityRole="button"
          accessibilityLabel="Skip introduction"
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <Animated.View
        key={index}
        entering={FadeIn.duration(240)}
        exiting={FadeOut.duration(150)}
        style={styles.content}
      >
        <View style={styles.glyphWrap}>
          <Text style={styles.glyph}>{slide.glyph}</Text>
        </View>
        <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
        {slide.warning && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>{slide.warning}</Text>
          </View>
        )}
        {slide.hint && <Text style={styles.hintText}>{slide.hint}</Text>}
      </Animated.View>

      <View style={styles.footer}>
        <Button
          label={isLast ? "Get Started" : "Continue"}
          variant="primary"
          onPress={handleContinue}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing["2xl"],
    paddingBottom: Spacing.xl,
  } as ViewStyle,

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  } as ViewStyle,

  dots: {
    flexDirection: "row",
    gap: 6,
  } as ViewStyle,
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  } as ViewStyle,
  dotActive: {
    width: 18,
    backgroundColor: Colors.white,
  } as ViewStyle,

  skipBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  } as ViewStyle,
  skipText: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    letterSpacing: Typography.wide,
  } as TextStyle,

  content: {
    flex: 1,
    justifyContent: "center",
    gap: Spacing.sm,
  } as ViewStyle,

  glyphWrap: {
    width: 88,
    height: 88,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  } as ViewStyle,
  glyph: {
    fontSize: 40,
    color: Colors.text,
  } as TextStyle,

  eyebrow: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textMuted,
    letterSpacing: Typography.widest,
    textTransform: "uppercase",
  } as TextStyle,

  title: {
    fontSize: Typography["2xl"],
    fontWeight: Typography.bold,
    color: Colors.text,
    letterSpacing: Typography.tight,
    marginTop: 2,
  } as TextStyle,

  body: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginTop: Spacing.xs,
  } as TextStyle,

  warningBox: {
    marginTop: Spacing.md,
    backgroundColor: Colors.midDark,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gray,
    padding: Spacing.md,
  } as ViewStyle,
  warningText: {
    fontSize: Typography.sm,
    color: Colors.offWhite,
    lineHeight: 19,
  } as TextStyle,

  hintText: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    lineHeight: 19,
    marginTop: Spacing.md,
  } as TextStyle,

  footer: {
    paddingTop: Spacing.lg,
  } as ViewStyle,
});
