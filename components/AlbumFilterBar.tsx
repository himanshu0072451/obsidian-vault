/**
 * AlbumFilterBar — horizontally scrollable album filter chips.
 *
 * Renders:
 *   • "All" chip     — selected when `selected` is undefined (show everything)
 *   • One chip per album name from the `albums` array
 *   • "＋" chip      — always last, triggers album creation
 *
 * Purely controlled — no internal state.
 */

import React, { memo } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../utils/design';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlbumFilterBarProps {
  albums: string[];
  /**
   * undefined = All files across every album
   * null      = files in vault root only (no album)
   * string    = files in that specific album
   */
  selected: string | null | undefined;
  onSelect: (album: string | null | undefined) => void;
  onCreatePress: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AlbumFilterBar = memo(function AlbumFilterBar({
  albums,
  selected,
  onSelect,
  onCreatePress,
}: AlbumFilterBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      // Negative margin bleeds chips flush with screen edge
      style={styles.scroll}
    >
      {/* All */}
      <Chip
        label="All"
        active={selected === undefined}
        onPress={() => onSelect(undefined)}
      />

      {/* One chip per album */}
      {albums.map((name) => (
        <Chip
          key={name}
          label={name}
          active={selected === name}
          onPress={() => onSelect(name)}
        />
      ))}

      {/* Create album */}
      <Pressable
        onPress={onCreatePress}
        style={styles.addChip}
        accessibilityRole="button"
        accessibilityLabel="Create new album"
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      >
        <Text style={styles.addChipText}>＋</Text>
      </Pressable>
    </ScrollView>
  );
});

// ─── Chip ─────────────────────────────────────────────────────────────────────

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function Chip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      <Text
        style={[styles.chipText, active && styles.chipTextActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    // Negative margin so chips bleed to screen edge; parent has Spacing.lg padding
    marginHorizontal: -Spacing.lg,
    flexGrow: 0,
  } as ViewStyle,

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 2,
  } as ViewStyle,

  chip: {
    height: 32,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  chipActive: {
    backgroundColor: Colors.white,
    borderColor: Colors.white,
  } as ViewStyle,

  chipText: {
    fontSize: Typography.xs,
    fontWeight: Typography.medium,
    color: Colors.textSecondary,
    letterSpacing: Typography.wide,
  } as TextStyle,

  chipTextActive: {
    color: Colors.black,
    fontWeight: Typography.semibold,
  } as TextStyle,

  addChip: {
    height: 32,
    width: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  addChipText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    // Optical centering for the full-width plus sign
    lineHeight: 18,
  } as TextStyle,
});
