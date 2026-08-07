/**
 * TagSheet — add tags to a file or a multi-select batch.
 *
 * Matches the MoveFileSheet / AlbumActionSheet design language:
 *   transparent Modal → dark backdrop → animated card
 *
 * Shows:
 *   • File name (single) or "{count} files" (batch) as context
 *   • Text input for typing a new tag
 *   • Scrollable chip list of every tag already used in the vault —
 *     tapping a chip adds it instantly without typing
 *   • Done button
 *
 * Purely controlled — all logic lives in HomeScreen.
 * Tags are appended only (V1 scope) — never replaces an existing list.
 * Normalisation (Title Case, dedup) happens in VaultStorage, not here —
 * this component just collects raw strings the user typed or tapped.
 */

import React, { useState } from "react";
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
} from "react-native";
import * as Haptics from "expo-haptics";
import { Colors, Typography, Spacing, Radius } from "../utils/design";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TagSheetProps {
  visible: boolean;
  targetLabel: string;
  /** Tags currently applied to this file (empty for batch mode). */
  currentTags: string[];
  existingTags: string[];
  onAddTag: (tag: string) => void;
  /** Called when the user taps ✕ on a current tag chip. Empty for batch mode. */
  onRemoveTag?: (tag: string) => void;
  onDone: () => void;
}

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

  const handleAddFromInput = () => {
    const value = inputValue.trim();
    if (value.length === 0) return;
    Haptics.selectionAsync().catch(() => {});
    onAddTag(value);
    setInputValue("");
  };

  const handleChipPress = (tag: string) => {
    Haptics.selectionAsync().catch(() => {});
    onAddTag(tag);
  };

  const handleRemoveTag = (tag: string) => {
    Haptics.selectionAsync().catch(() => {});
    onRemoveTag?.(tag);
  };

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

  return (
    <>
      {visible && (
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <Pressable style={styles.backdrop} onPress={onDone}>
              <Pressable style={styles.sheet} onPress={() => {}}>
                <View style={styles.header}>
                  <Text style={styles.title}>Add Tags</Text>
                  <Text style={styles.targetLabel} numberOfLines={1}>
                    {targetLabel}
                  </Text>
                </View>

                {/* Current tags — shown for single-file mode only (batch has no shared current state) */}
                {currentTags.length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>Current Tags</Text>
                    <View style={styles.chipWrap}>
                      {currentTags.map((tag) => (
                        <Pressable
                          key={tag}
                          style={styles.currentChip}
                          onPress={() => handleRemoveTag(tag)}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove tag ${tag}`}
                        >
                          <Text
                            style={styles.currentChipText}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {tag}
                          </Text>
                          <Text style={styles.currentChipRemove}>✕</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}

                <View style={styles.inputRow}>
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
                  <Pressable
                    onPress={handleAddFromInput}
                    style={[
                      styles.addBtn,
                      inputValue.trim().length === 0 && styles.addBtnDisabled,
                    ]}
                    disabled={inputValue.trim().length === 0}
                    accessibilityRole="button"
                    accessibilityLabel="Add tag"
                  >
                    <Text style={styles.addBtnText}>+</Text>
                  </Pressable>
                </View>

                <Text style={styles.sectionLabel}>Suggested Tags</Text>

                <View style={styles.chipWrap}>
                  {PREDEFINED_TAGS.map((tag) => (
                    <Pressable
                      key={tag}
                      style={({ pressed }) => [
                        styles.chip,
                        pressed && styles.chipPressed,
                      ]}
                      onPress={() => handleChipPress(tag)}
                    >
                      <Text style={styles.chipText} numberOfLines={1} ellipsizeMode="tail">
                        {tag}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {existingTags.length > 0 && (
                  <>
                    {/* <Text style={styles.sectionLabel}>Existing tags</Text> */}
                    <Text style={styles.sectionLabel}>Your Tags</Text>
                    <ScrollView
                      style={styles.chipList}
                      contentContainerStyle={styles.chipListContent}
                      showsVerticalScrollIndicator={false}
                    >
                      <View style={styles.chipWrap}>
                        {/* {existingTags.map((tag) => (
                          <Pressable
                            key={tag}
                            style={({ pressed }) => [
                              styles.chip,
                              pressed && styles.chipPressed,
                            ]}
                            onPress={() => handleChipPress(tag)}
                            accessibilityRole="button"
                            accessibilityLabel={`Add tag ${tag}`}
                          >
                            <Text style={styles.chipText}>{tag}</Text>
                          </Pressable>
                        ))} */}
                        {existingTags
                          .filter((tag) => !PREDEFINED_TAGS.includes(tag))
                          .map((tag) => (
                            <Pressable
                              key={tag}
                              style={({ pressed }) => [
                                styles.chip,
                                pressed && styles.chipPressed,
                              ]}
                              onPress={() => handleChipPress(tag)}
                              accessibilityRole="button"
                              accessibilityLabel={`Add tag ${tag}`}
                            >
                              <Text style={styles.chipText} numberOfLines={1} ellipsizeMode="tail">
                                {tag}
                              </Text>
                            </Pressable>
                          ))}
                      </View>
                    </ScrollView>
                  </>
                )}

                <Pressable
                  style={({ pressed }) => [
                    styles.doneBtn,
                    pressed && styles.doneBtnPressed,
                  ]}
                  onPress={onDone}
                  accessibilityRole="button"
                  accessibilityLabel="Done"
                >
                  <Text style={styles.doneLabel}>Done</Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  sheet: {
    width: "100%",
    // Caps runaway width on tablets/large screens — phones never reach
    // this width so the existing look is unchanged there.
    maxWidth: 480,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
    maxHeight: "70%",
  } as ViewStyle,

  header: {
    gap: 4,
  } as ViewStyle,

  title: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.text,
    letterSpacing: Typography.tight,
  } as TextStyle,

  targetLabel: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  } as TextStyle,

  inputRow: {
    flexDirection: "row",
    gap: Spacing.sm,
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

  addBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.silver,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,

  addBtnDisabled: {
    backgroundColor: Colors.midDark,
  } as ViewStyle,

  addBtnText: {
    fontSize: 22,
    fontWeight: Typography.bold,
    color: Colors.black,
    lineHeight: 24,
  } as TextStyle,

  sectionLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textMuted,
    letterSpacing: Typography.widest,
    textTransform: "uppercase",
  } as TextStyle,

  chipList: {
    maxHeight: 180,
  } as ViewStyle,

  chipListContent: {
    paddingVertical: 2,
  } as ViewStyle,

  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  } as ViewStyle,

  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.midDark,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    // Long tag names truncate (numberOfLines={1} on the label) instead of
    // stretching the chip past the row and forcing an awkward wrap.
    maxWidth: 220,
    flexShrink: 1,
  } as ViewStyle,

  chipPressed: {
    backgroundColor: Colors.gray,
  } as ViewStyle,

  currentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.midDark,
    borderWidth: 1,
    borderColor: Colors.silver,
    maxWidth: 220,
    flexShrink: 1,
  } as ViewStyle,
  currentChipText: {
    fontSize: Typography.sm,
    color: Colors.silver,
    flexShrink: 1,
  } as TextStyle,
  currentChipRemove: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: Typography.bold,
  } as TextStyle,

  chipText: {
    fontSize: Typography.sm,
    color: Colors.text,
    flexShrink: 1,
  } as TextStyle,

  doneBtn: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: Spacing.xs,
  } as ViewStyle,

  doneBtnPressed: {
    backgroundColor: Colors.midDark,
  } as ViewStyle,

  doneLabel: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.silver,
  } as TextStyle,
});
