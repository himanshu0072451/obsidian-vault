/**
 * AlbumActionSheet — modal for album actions.
 *
 * Phase 1: create mode only.
 * The `AlbumActionSheetMode` type includes 'rename' and 'delete' so
 * HomeScreen state doesn't need changes in Phase 2 — the sheet just
 * won't render those modes yet.
 *
 * Follows the same Modal + Reanimated pattern as ProgressOverlay:
 *   transparent Modal → dark backdrop → animated sheet card
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ViewStyle,
  TextStyle,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius } from '../utils/design';
import { Button } from './Button';

// ─── Types ────────────────────────────────────────────────────────────────────

// Exported so HomeScreen can type its state without importing the component twice
export type AlbumActionSheetMode = 'create' | 'rename' | 'delete';

interface AlbumActionSheetProps {
  visible: boolean;
  mode: AlbumActionSheetMode;
  /** Used by rename (pre-fill) and delete (display name). Ignored for create. */
  albumName?: string;
  /**
   * Called on confirm.
   * create / rename → value is the trimmed text input.
   * delete          → value is albumName echoed back.
   */
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
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Mirrors ProgressOverlay animation pattern
  const sheetScale   = useSharedValue(0.92);
  const sheetOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Seed input for rename; clear for create
      setInputValue(mode === 'rename' ? (albumName ?? '') : '');

      sheetScale.value   = withSpring(1, { damping: 22, stiffness: 240 });
      sheetOpacity.value = withTiming(1, { duration: 180 });

      // Auto-focus after spring settles
      const t = setTimeout(() => inputRef.current?.focus(), 220);
      return () => clearTimeout(t);
    } else {
      sheetScale.value   = 0.92;
      sheetOpacity.value = 0;
    }
  }, [visible, mode, albumName]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sheetScale.value }],
    opacity:   sheetOpacity.value,
  }));

  const handleConfirm = () => {
    const value = inputValue.trim();
    if (value.length === 0) return;
    onConfirm(value);
  };

  // Phase 1: only render create mode
  // Returning null for other modes means the modal mounts but shows nothing —
  // that's safe because visible will be false when mode !== 'create' in Phase 1.
  if (mode !== 'create') return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      {/* Tap backdrop to cancel */}
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.avoidingView}
        >
          {/* Inner Pressable stops backdrop tap from passing through the sheet */}
          <Pressable onPress={() => {}} style={styles.sheetWrap}>
            <Animated.View style={[styles.sheet, sheetStyle]}>

              {/* Title */}
              <View style={styles.header}>
                <Text style={styles.title}>New Album</Text>
                <Text style={styles.subtitle}>
                  Name your album. You can rename it later.
                </Text>
              </View>

              {/* Input */}
              <View style={styles.inputWrap}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  value={inputValue}
                  onChangeText={setInputValue}
                  placeholder="Album name"
                  placeholderTextColor={Colors.textMuted}
                  maxLength={50}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleConfirm}
                  selectionColor={Colors.silver}
                />
                <Text style={styles.charCount}>{inputValue.length}/50</Text>
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <Button
                  label="Cancel"
                  variant="secondary"
                  onPress={onCancel}
                  style={styles.actionBtn}
                />
                <Button
                  label="Create"
                  variant="primary"
                  onPress={handleConfirm}
                  disabled={inputValue.trim().length === 0}
                  style={styles.actionBtn}
                />
              </View>

            </Animated.View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,

  avoidingView: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  } as ViewStyle,

  sheetWrap: {
    width: '100%',
  } as ViewStyle,

  sheet: {
    width: '100%',
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
    textAlign: 'right',
  } as TextStyle,

  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  } as ViewStyle,

  actionBtn: {
    flex: 1,
  } as ViewStyle,
});
