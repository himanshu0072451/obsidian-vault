// onRemoveTag is undefined in batch mode — that's the signal this
// component uses to tell single-file vs. batch apart, not a separate flag.
// Normalisation (Title Case, dedup) happens in VaultStorage, not here.

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
} from "react-native";
import Animated, {
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors, Typography, Spacing, Radius } from "../utils/design";
import { Button } from "./Button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TagSheetProps {
  visible: boolean;
  targetLabel: string;
  /** Tags currently applied to this file (empty for batch mode). */
  currentTags: string[];
  existingTags: string[];
  onAddTag: (tag: string) => void;
  /** Called when the user taps the remove affordance on a current-tag
   * chip. Undefined for batch mode — also doubles as this component's
   * signal for "single-file mode" (see isSingleFileMode below). */
  onRemoveTag?: (tag: string) => void;
  onDone: () => void;
}

const PREDEFINED_TAGS = [
  "ID",
  "Passport",
  "Banking",
  "Receipt",
  "Certificate",
  "Medical",
  "Insurance",
  "Travel",
  "Ticket",
  "Education",
  "Work",
  "Family",
  "Personal",
  "Important",
  "Private",
];

// ─── Component ────────────────────────────────────────────────────────────────

export function TagSheet({
  visible,
  targetLabel,
  currentTags,
  existingTags,
  onAddTag,
  onRemoveTag,
  onDone,
}: TagSheetProps) {
  const [inputValue, setInputValue] = useState("");

  const sheetScale = useSharedValue(0.92);
  const sheetOpacity = useSharedValue(0);
  const [backdropEnabled, setBackdropEnabled] = useState(false);
  const { height: windowHeight } = useWindowDimensions();
  // Bounds the WHOLE card (header + scroll region + Done button), not
  // just one section — see the `list` style comment for why that
  // distinction matters. Self-corrects when the keyboard is open too:
  // KeyboardAvoidingView already shrinks the actual available flex space
  // above the keyboard, and maxHeight only ever caps growth — it never
  // forces the sheet to be taller than what's actually available.
  const sheetMaxHeight = windowHeight * 0.82;

  useEffect(() => {
    if (visible) {
      setBackdropEnabled(false);
      sheetScale.value = 0.92;
      sheetOpacity.value = withTiming(1, { duration: 180 });

      // Backdrop taps enable once the entrance spring actually settles,
      // rather than a fixed guess at how long that takes.
      sheetScale.value = withSpring(
        1,
        { damping: 22, stiffness: 240 },
        (finished) => {
          if (finished) runOnJS(setBackdropEnabled)(true);
        },
      );
    } else {
      setBackdropEnabled(false);
      sheetScale.value = 0.92;
      sheetOpacity.value = 0;
      setInputValue("");
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [
      { scale: sheetScale.value },
      { translateY: (1 - sheetScale.value) * 32 },
    ],
  }));

  const handleAddFromInput = useCallback(() => {
    const value = inputValue.trim();
    if (value.length === 0) return;
    Haptics.selectionAsync().catch(() => {});
    onAddTag(value);
    setInputValue("");
  }, [inputValue, onAddTag]);

  const handleChipAdd = useCallback(
    (tag: string) => {
      onAddTag(tag);
    },
    [onAddTag],
  );

  const handleRemoveTag = useCallback(
    (tag: string) => {
      Haptics.selectionAsync().catch(() => {});
      onRemoveTag?.(tag);
    },
    [onRemoveTag],
  );

  // onRemoveTag is only ever passed for a single file (see the prop's own
  // doc comment) — reusing that as the "is this batch mode" signal avoids
  // needing a new prop just for this display decision.
  const isSingleFileMode = onRemoveTag !== undefined;
  const currentTagsSet = new Set(currentTags);
  const yourTags = existingTags.filter((tag) => !PREDEFINED_TAGS.includes(tag));

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          style={styles.backdrop}
          onPress={backdropEnabled ? onDone : undefined}
        >
          <Pressable style={styles.sheetPressable} onPress={() => {}}>
            <Animated.View
              style={[styles.sheet, sheetStyle, { maxHeight: sheetMaxHeight }]}
            >
              {/* Header */}
              <View className="shrink-0 border-b border-white/[0.08] px-5 pb-4 pt-5">
                <Text className="text-[17px] font-semibold tracking-tight text-white">
                  Add Tags
                </Text>
                <Text
                  className="mt-1 text-[13px] text-white/45"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {targetLabel}
                </Text>
              </View>

              {/* Scrollable middle — the only flexible piece. */}
              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                {isSingleFileMode && (
                  <View className="mb-5">
                    <SectionLabel>Current Tags</SectionLabel>
                    {currentTags.length > 0 ? (
                      <View className="flex-row flex-wrap gap-2">
                        {currentTags.map((tag) => (
                          <CurrentTagChip
                            key={tag}
                            tag={tag}
                            onRemove={handleRemoveTag}
                          />
                        ))}
                      </View>
                    ) : (
                      <Text className="text-[13px] text-white/35">
                        No tags yet — add one below.
                      </Text>
                    )}
                  </View>
                )}

                <View className="mb-5">
                  <SectionLabel>Add a Tag</SectionLabel>
                  <View className="flex-row gap-2">
                    <TextInput
                      style={styles.input}
                      value={inputValue}
                      onChangeText={setInputValue}
                      placeholder="New tag"
                      placeholderTextColor={Colors.textMuted}
                      maxLength={30}
                      autoCapitalize="words"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleAddFromInput}
                      selectionColor={Colors.silver}
                    />
                    <AddButton
                      disabled={inputValue.trim().length === 0}
                      onPress={handleAddFromInput}
                    />
                  </View>
                </View>

                <View className="mb-5">
                  <SectionLabel>Suggested Tags</SectionLabel>
                  <View className="flex-row flex-wrap gap-2">
                    {PREDEFINED_TAGS.map((tag) => (
                      <TagChip
                        key={tag}
                        tag={tag}
                        active={currentTagsSet.has(tag)}
                        onPress={handleChipAdd}
                      />
                    ))}
                  </View>
                </View>

                {yourTags.length > 0 && (
                  <View>
                    <SectionLabel>Your Tags</SectionLabel>
                    <View className="flex-row flex-wrap gap-2">
                      {yourTags.map((tag) => (
                        <TagChip
                          key={tag}
                          tag={tag}
                          active={currentTagsSet.has(tag)}
                          onPress={handleChipAdd}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Footer */}
              <View className="shrink-0 border-t border-white/[0.08] px-5 py-4">
                <Button label="Done" variant="primary" onPress={onDone} fullWidth />
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── SectionLabel ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-2 text-[11px] font-semibold uppercase tracking-[2px] text-white/35">
      {children}
    </Text>
  );
}

// ─── TagChip ────────────────────────────────────────────────────────────────
// Suggested/existing tags — tap to add. `active` (already applied to this
// file) gets a tinted background + check glyph, purely derived from
// currentTags — no new state or logic, just a display of what's already
// true.

interface TagChipProps {
  tag: string;
  active: boolean;
  onPress: (tag: string) => void;
}

function TagChip({ tag, active, onPress }: TagChipProps) {
  const scale = useSharedValue(1);
  const pulse = useSharedValue(0);

  const chipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const highlightStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, { damping: 18, stiffness: 320 });
  }, []);
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 18, stiffness: 320 });
  }, []);

  const handlePress = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    // Quick confirmation pulse before handing off — same pattern as
    // MoveFileSheet's album cards, just snappier since this sheet stays
    // open and tapping several chips in a row shouldn't feel sluggish.
    pulse.value = withSequence(
      withTiming(1, { duration: 70 }),
      withTiming(0, { duration: 100 }, (finished) => {
        if (finished) runOnJS(onPress)(tag);
      }),
    );
  }, [onPress, tag]);

  return (
    <Animated.View style={chipStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className={`max-w-[220px] flex-row items-center gap-1.5 rounded-full border px-3 py-2 ${
          active
            ? "border-white/30 bg-white/[0.12]"
            : "border-white/[0.08] bg-white/[0.04]"
        }`}
        accessibilityRole="button"
        accessibilityLabel={active ? `${tag}, already added` : `Add tag ${tag}`}
      >
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.chipHighlight, highlightStyle]}
        />
        {active && (
          <Feather name="check" size={12} color="rgba(255,255,255,0.7)" />
        )}
        <Text
          className={`text-[13px] ${active ? "text-white" : "text-white/75"}`}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {tag}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── CurrentTagChip ─────────────────────────────────────────────────────────
// Applied tags on this file — tap the × to remove. Fades out on removal
// via Reanimated's built-in exiting animation (currentTags shrinking
// unmounts this chip, which is exactly what `exiting` intercepts).

function CurrentTagChip({
  tag,
  onRemove,
}: {
  tag: string;
  onRemove: (tag: string) => void;
}) {
  const scale = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, { damping: 18, stiffness: 320 });
  }, []);
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 18, stiffness: 320 });
  }, []);

  return (
    <Animated.View style={cardStyle} exiting={FadeOut.duration(150)}>
      <Pressable
        onPress={() => onRemove(tag)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className="max-w-[220px] flex-row items-center gap-1.5 rounded-full border border-white/25 bg-white/[0.08] py-1.5 pl-3 pr-1.5"
        accessibilityRole="button"
        accessibilityLabel={`Remove tag ${tag}`}
      >
        <Text
          className="text-[13px] text-white"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {tag}
        </Text>
        <View className="h-4 w-4 items-center justify-center rounded-full bg-white/[0.12]">
          <Feather name="x" size={10} color="rgba(255,255,255,0.75)" />
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── AddButton ──────────────────────────────────────────────────────────────

function AddButton({
  disabled,
  onPress,
}: {
  disabled: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    scale.value = withSpring(0.92, { damping: 18, stiffness: 320 });
  }, [disabled]);
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 18, stiffness: 320 });
  }, []);

  return (
    <Animated.View style={style}>
      <Pressable
        onPress={disabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        className={`h-11 w-11 items-center justify-center rounded-xl ${
          disabled ? "bg-white/[0.06]" : "bg-white"
        }`}
        accessibilityRole="button"
        accessibilityLabel="Add tag"
      >
        <Feather
          name="plus"
          size={20}
          color={disabled ? "rgba(255,255,255,0.25)" : Colors.black}
        />
      </Pressable>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
// Only structural/positioning pieces, truly-animated nodes, and the
// TextInput stay here — Animated.View doesn't pick up NativeWind's
// className (only core RN components are auto-registered), and
// width/height-resolution properties in particular render inconsistently
// across Android screens when left to className instead.

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  } as ViewStyle,

  flex: { flex: 1 } as ViewStyle,

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  } as ViewStyle,

  // Gives styles.sheet's width: "100%" a properly-sized parent to resolve
  // against (backdrop's alignItems: "center" would otherwise shrink-wrap
  // this unstyled Pressable instead of stretching it) — same fix applied
  // to MoveFileSheet.
  sheetPressable: {
    width: "100%",
  } as ViewStyle,

  sheet: {
    width: "100%",
    // Caps runaway width on tablets/large screens — phones never reach
    // this width so the look is unchanged there.
    maxWidth: 480,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  } as ViewStyle,

  // flexShrink: 1 lets this be the ONE piece that gives up height when
  // the card doesn't fit; minHeight: 0 is required for that to actually
  // take effect — a flex child's default minHeight is "auto", which
  // refuses to shrink below its own content height. flexGrow: 0 keeps
  // short content from stretching to fill extra space when there's
  // plenty of room.
  list: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
  } as ViewStyle,

  listContent: {
    padding: Spacing.lg,
  } as ViewStyle,

  input: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.midDark,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.base,
    color: Colors.text,
  } as TextStyle,

  chipHighlight: {
    borderRadius: Radius.full,
    backgroundColor: "rgba(255,255,255,0.1)",
  } as ViewStyle,
});
