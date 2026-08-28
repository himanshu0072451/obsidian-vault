import React, { memo, useCallback, useEffect } from "react";
import {
  ScrollView,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Colors, Typography, Spacing, Radius } from "../utils/design";

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
  /** Whether the Favorites chip is currently active. */
  showFavorites: boolean;
  /** Called when the Favorites chip is tapped. */
  onFavoritesPress: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AlbumFilterBar = memo(function AlbumFilterBar({
  albums,
  selected,
  onSelect,
  onCreatePress,
  showFavorites,
  onFavoritesPress,
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
        active={selected === undefined && !showFavorites}
        onPress={() => onSelect(undefined)}
      />

      {/* Favorites */}
      <Chip
        label="★ Favorites"
        active={showFavorites}
        onPress={onFavoritesPress}
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
  const scale = useSharedValue(1);
  const activeProgress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    activeProgress.value = withTiming(active ? 1 : 0, { duration: 180 });
  }, [active]);

  const chipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(
      activeProgress.value,
      [0, 1],
      [Colors.surface, Colors.white],
    ),
    borderColor: interpolateColor(
      activeProgress.value,
      [0, 1],
      [Colors.border, Colors.white],
    ),
  }));

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      activeProgress.value,
      [0, 1],
      [Colors.textSecondary, Colors.black],
    ),
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.94, { damping: 18, stiffness: 320 });
  }, []);
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 18, stiffness: 320 });
  }, []);
  const handlePress = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    onPress();
  }, [onPress]);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      <Animated.View style={[styles.chip, chipStyle]}>
        <Animated.Text
          style={[
            styles.chipText,
            active && styles.chipTextActiveWeight,
            textStyle,
          ]}
          numberOfLines={1}
        >
          {label}
        </Animated.Text>
      </Animated.View>
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
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,

  chipText: {
    fontSize: Typography.xs,
    fontWeight: Typography.medium,
    color: Colors.textSecondary,
    letterSpacing: Typography.wide,
  } as TextStyle,

  chipTextActiveWeight: {
    fontWeight: Typography.semibold,
  } as TextStyle,

  addChip: {
    height: 32,
    width: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,

  addChipText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    // Optical centering for the full-width plus sign
    lineHeight: 18,
  } as TextStyle,
});
