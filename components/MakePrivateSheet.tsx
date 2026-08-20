/**
 * MakePrivateSheet — confirms removing the selected originals from the
 * device gallery before import proceeds.
 *
 * Shown once per batch (not once per photo) after the user picks images
 * and before encryptImages() runs the native/system deletion request.
 * Design: mirrors AlbumActionSheet (overlay → backdrop → sheet card, Button
 * component for actions) — deliberately no Modal/Reanimated choreography
 * beyond a simple fade, matching the app's other confirmation sheets.
 */

import React from "react";
import { View, Text, Pressable, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { Colors, Typography, Spacing, Radius } from "../utils/design";
import { Button } from "./Button";

interface MakePrivateSheetProps {
  visible: boolean;
  /** Number of selected originals deletion will actually be attempted for. */
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function MakePrivateSheet({
  visible,
  count,
  onConfirm,
  onCancel,
}: MakePrivateSheetProps) {
  if (!visible) return null;

  const photoWord = count === 1 ? "photo" : "photos";
  const pronoun = count === 1 ? "it" : "them";

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>Make Private</Text>
            <Text style={styles.subtitle}>
              Obsidian will remove the {count} selected {photoWord} from your
              device gallery and keep encrypted {count === 1 ? "a copy" : "copies"} inside Obsidian.
            </Text>
          </View>

          {/* Prominent warning — Google Photos backup is a separate, Google-
              controlled copy that Obsidian has no access to and cannot
              delete. Never implied otherwise. */}
          <View style={styles.warningBox}>
            <Text style={styles.warningLabel}>⚠ Google Photos Backup</Text>
            <Text style={styles.warningText}>
              If Google Photos backup is enabled, the original may still
              remain in your Google Account and can reappear in your Gallery
              after backup/sync.
            </Text>
          </View>

          <Text style={styles.guidanceText}>
            To keep the {photoWord} private, remove the original{count === 1 ? "" : "s"} from
            Google Photos/your Google Account or turn off Google Photos
            backup for {pronoun}.
          </Text>

          <View style={styles.reassuranceRow}>
            <Text style={styles.reassuranceText}>
              Your encrypted copy will remain safely inside Obsidian.
            </Text>
          </View>

          <View style={styles.actions}>
            <Button
              label="Cancel"
              variant="secondary"
              onPress={onCancel}
              style={styles.actionBtn}
            />
            <Button
              label="Make Private"
              variant="primary"
              onPress={onConfirm}
              style={styles.actionBtn}
            />
          </View>
        </Pressable>
      </Pressable>
    </View>
  );
}

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

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  } as ViewStyle,

  sheet: {
    width: "100%",
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.lg,
  } as ViewStyle,

  header: {
    gap: Spacing.xs,
  } as ViewStyle,

  title: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.text,
    letterSpacing: Typography.tight,
  } as TextStyle,

  subtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  } as TextStyle,

  warningBox: {
    backgroundColor: Colors.midDark,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gray,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 4,
  } as ViewStyle,

  warningLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.text,
    letterSpacing: Typography.wide,
    textTransform: "uppercase",
  } as TextStyle,

  warningText: {
    fontSize: Typography.sm,
    color: Colors.offWhite,
    lineHeight: 18,
  } as TextStyle,

  guidanceText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  } as TextStyle,

  reassuranceRow: {
    backgroundColor: Colors.midDark,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  } as ViewStyle,

  reassuranceText: {
    fontSize: Typography.xs,
    color: Colors.silver,
    lineHeight: 16,
  } as TextStyle,

  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
  } as ViewStyle,

  actionBtn: {
    flex: 1,
  } as ViewStyle,
});
