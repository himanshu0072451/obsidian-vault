/**
 * AlbumActionSheet — modal for album actions (create / rename / delete).
 *
 * Deliberately simple:
 *   - No Reanimated on the sheet itself — was causing "boxes" artifact
 *     because shared values rendered before Modal presented natively.
 *   - autoFocus prop used instead of setTimeout race.
 *   - KeyboardAvoidingView wraps everything at the top level.
 */

import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Colors, Typography, Spacing, Radius } from "../utils/design";
import { Button } from "./Button";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlbumActionSheetMode = "create" | "rename" | "delete";

interface AlbumActionSheetProps {
  visible: boolean;
  mode: AlbumActionSheetMode;
  albumName?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AlbumActionSheet({
  visible,
  mode,
  albumName,
  onConfirm,
  onCancel,
}: AlbumActionSheetProps) {
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (visible) {
      setInputValue(mode === "rename" ? (albumName ?? "") : "");
    }
  }, [visible, mode, albumName]);

  const handleConfirm = () => {
    if (mode === "delete") {
      onConfirm(albumName ?? "");
      return;
    }
    const value = inputValue.trim();
    if (value.length === 0) return;
    onConfirm(value);
  };

  const copy = {
    create: {
      title: "New Album",
      subtitle: "Name your album. You can rename it later.",
      placeholder: "Album name",
      confirmLabel: "Create",
    },
    rename: {
      title: "Rename Album",
      subtitle: `Renaming "${albumName ?? ""}"`,
      placeholder: "New name",
      confirmLabel: "Rename",
    },
    delete: {
      title: "Delete Album",
      subtitle: `"${albumName ?? ""}" will be deleted. Files inside will be moved to the Vault Root.`,
      placeholder: "",
      confirmLabel: "Delete Album",
    },
  }[mode];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.backdrop} onPress={onCancel}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.header}>
              <Text style={styles.title}>{copy.title}</Text>
              <Text style={styles.subtitle}>{copy.subtitle}</Text>
            </View>

            {mode !== "delete" && (
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={inputValue}
                  onChangeText={setInputValue}
                  placeholder={copy.placeholder}
                  placeholderTextColor={Colors.textMuted}
                  maxLength={50}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleConfirm}
                  selectionColor={Colors.silver}
                  autoFocus
                />
                <Text style={styles.charCount}>{inputValue.length}/50</Text>
              </View>
            )}

            <View style={styles.actions}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={onCancel}
                style={styles.actionBtn}
              />
              <Button
                label={copy.confirmLabel}
                variant={mode === "delete" ? "danger" : "primary"}
                onPress={handleConfirm}
                disabled={mode !== "delete" && inputValue.trim().length === 0}
                style={styles.actionBtn}
              />
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
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

  inputWrap: {
    gap: 6,
  } as ViewStyle,

  input: {
    height: 52,
    backgroundColor: Colors.midDark,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.base,
    color: Colors.text,
  } as TextStyle,

  charCount: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    textAlign: "right",
  } as TextStyle,

  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
  } as ViewStyle,

  actionBtn: {
    flex: 1,
  } as ViewStyle,
});
