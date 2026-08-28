// Layout: header/footer are flexShrink:0 (always keep full height); the
// card list is the only piece that shrinks and scrolls internally within
// the sheet's own maxHeight — see the `list` style below.

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors, Spacing, Radius } from "../utils/design";
import { Button } from "./Button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MoveFileSheetProps {
  visible: boolean;
  fileName: string;
  currentAlbum: string | null;
  albums: string[];
  /** Per-album file count. Optional — a card just omits its subtitle
   * if its count isn't present. */
  albumCounts?: Record<string, number>;
  /** Decrypted album cover thumbnails, keyed by album name. Missing or
   * null just falls back to a monochrome initial-letter avatar. */
  albumCoverUris?: Record<string, string | null>;
  onSelect: (targetAlbum: string | null) => void;
  onCancel: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MoveFileSheet({
  visible,
  fileName,
  currentAlbum,
  albums,
  albumCounts,
  albumCoverUris,
  onSelect,
  onCancel,
}: MoveFileSheetProps) {
  const sheetScale = useSharedValue(0.92);
  const sheetOpacity = useSharedValue(0);
  const [backdropEnabled, setBackdropEnabled] = useState(false);
  const { height: windowHeight } = useWindowDimensions();
  // Bounds the WHOLE card (header + list + Cancel button), not just the
  // list — see the `list` style comment for why that distinction matters.
  const sheetMaxHeight = windowHeight * 0.82;

  useEffect(() => {
    if (visible) {
      setBackdropEnabled(false);
      sheetScale.value = 0.92;
      sheetOpacity.value = withTiming(1, { duration: 180 });

      // Backdrop taps enable once the entrance spring actually settles,
      // rather than a fixed guess at how long that takes — so retuning
      // the spring can never leave this gate mistimed.
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
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [
      { scale: sheetScale.value },
      // A touch of rise-in alongside the scale — reads as the card
      // settling into place rather than just growing from its center.
      { translateY: (1 - sheetScale.value) * 32 },
    ],
  }));

  const destinations = albums.filter((a) => a !== currentAlbum);
  const canRemove = currentAlbum !== null;
  const hasOptions = destinations.length > 0 || canRemove;

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Backdrop */}
      <Pressable
        style={styles.backdrop}
        onPress={backdropEnabled ? onCancel : undefined}
      />

      {/* Sheet Container */}
      <View style={styles.sheetWrap} pointerEvents="box-none">
        {/* Explicit width — this Pressable is a plain touch-target wrapper
            with no style of its own, so without it, styles.sheet's
            width: "100%" below has no defined parent width to resolve
            against (sheetWrap uses alignItems: "center", which shrink-wraps
            unstyled children instead of stretching them). */}
        <Pressable style={styles.sheetPressable} onPress={() => {}}>
          <Animated.View
            style={[styles.sheet, sheetStyle, { maxHeight: sheetMaxHeight }]}
          >
            {/* Header */}
            <View className="shrink-0 border-b border-white/[0.08] px-5 pb-4 pt-5">
              <Text className="text-[17px] font-semibold tracking-tight text-white">
                Move to Album
              </Text>
              <Text
                className="mt-1 text-[13px] text-white/45"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {fileName}
              </Text>
            </View>

            {/* Album list — the only flexible/scrollable piece. */}
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {!hasOptions && <EmptyState />}

              {canRemove && <RemoveCard onPress={() => onSelect(null)} />}

              {destinations.map((album) => (
                <AlbumCard
                  key={album}
                  name={album}
                  count={albumCounts?.[album]}
                  coverUri={albumCoverUris?.[album]}
                  onPress={() => onSelect(album)}
                />
              ))}
            </ScrollView>

            {/* Footer */}
            <View className="shrink-0 border-t border-white/[0.08] px-5 py-4">
              <Button
                label="Cancel"
                variant="secondary"
                onPress={onCancel}
                fullWidth
              />
            </View>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

// ─── AlbumCard ──────────────────────────────────────────────────────────────

interface AlbumCardProps {
  name: string;
  count?: number;
  coverUri?: string | null;
  onPress: () => void;
}

function AlbumCard({ name, count, coverUri, onPress }: AlbumCardProps) {
  const scale = useSharedValue(1);
  const pulse = useSharedValue(0);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const highlightStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 20, stiffness: 300 });
  }, []);
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  }, []);

  const handlePress = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    // Brief selection pulse before handing off to the caller — gives a
    // clear "this is the one" confirmation instead of the sheet just
    // vanishing the instant the tap lands. onSelect still receives the
    // exact same argument, just ~230ms later, purely for this animation.
    pulse.value = withSequence(
      withTiming(1, { duration: 90 }),
      withTiming(0, { duration: 140 }, (finished) => {
        if (finished) runOnJS(onPress)();
      }),
    );
  }, [onPress]);

  const countLabel =
    count === undefined
      ? undefined
      : `${count} ${count === 1 ? "photo" : "photos"}`;

  return (
    <Animated.View style={cardStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className="mb-1 flex-row items-center gap-3 rounded-2xl px-3 py-2.5 active:bg-white/[0.04]"
        accessibilityRole="button"
        accessibilityLabel={
          countLabel ? `Move to ${name}, ${countLabel}` : `Move to ${name}`
        }
      >
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.cardHighlight, highlightStyle]}
        />
        <CoverThumb name={name} uri={coverUri} />
        {/* min-w-0: a row flex item's default min-width is "auto", which
            refuses to shrink below its content's natural width — the same
            gotcha that silently defeated numberOfLines truncation in the
            old row list. Without it, a long album name could push the
            chevron off the card instead of truncating. */}
        <View className="min-w-0 flex-1 gap-0.5">
          <Text
            className="text-[15px] font-medium text-white"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {name}
          </Text>
          {countLabel && (
            <Text className="text-[13px] text-white/40">{countLabel}</Text>
          )}
        </View>
        <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.3)" />
      </Pressable>
    </Animated.View>
  );
}

// ─── CoverThumb ─────────────────────────────────────────────────────────────
// Monochrome initial-letter avatar underneath, crossfading to the real
// cover thumbnail once it's decrypted (matching the fade-in treatment
// already used for file thumbnails elsewhere in the app).

function CoverThumb({ name, uri }: { name: string; uri?: string | null }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = uri ? withTiming(1, { duration: 200 }) : 0;
  }, [uri]);

  const imgStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <View className="h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-xl bg-white/[0.06]">
      <Text className="text-[18px] font-semibold text-white/25">{initial}</Text>
      {uri && (
        <Animated.Image
          source={{ uri }}
          style={[StyleSheet.absoluteFill, imgStyle]}
          resizeMode="cover"
          blurRadius={13}
        />
      )}
    </View>
  );
}

// ─── RemoveCard ─────────────────────────────────────────────────────────────
// Visually distinct from the album cards below it (bordered, muted icon)
// so "take this out of any album" doesn't blend into the destination list.

function RemoveCard({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 20, stiffness: 300 });
  }, []);
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  }, []);
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  }, [onPress]);

  return (
    <Animated.View style={cardStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className="mb-2 flex-row items-center gap-3 rounded-2xl border border-white/[0.08] px-3 py-2.5 active:bg-white/[0.04]"
        accessibilityRole="button"
        accessibilityLabel="Remove from album"
      >
        <View className="h-[52px] w-[52px] items-center justify-center rounded-xl bg-white/[0.06]">
          <Feather name="x-circle" size={20} color="rgba(255,255,255,0.5)" />
        </View>
        <Text className="flex-1 text-[15px] font-medium text-white/70">
          Remove from Album
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── EmptyState ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View className="items-center gap-3 px-6 py-12">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-white/[0.06]">
        <Feather name="folder" size={22} color="rgba(255,255,255,0.35)" />
      </View>
      <Text className="text-center text-[13px] leading-5 text-white/40">
        No other albums yet. Create one from the home screen to move files
        into it.
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
// Only structural/positioning pieces and truly-animated nodes stay here —
// Animated.View doesn't pick up NativeWind's className (only core RN
// components like View/Text/Pressable are auto-registered), and the width/
// height-resolution properties below are exactly the ones that broke
// silently and inconsistently when left to className/percentage guessing —
// see the comments at their usage sites.

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 99999,
  } as ViewStyle,

  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
  } as ViewStyle,

  sheetWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  } as ViewStyle,

  // Gives styles.sheet's width: "100%" a properly-sized parent to resolve
  // against (sheetWrap's alignItems: "center" would otherwise shrink-wrap
  // this unstyled Pressable instead of stretching it).
  sheetPressable: {
    width: "100%",
  } as ViewStyle,

  sheet: {
    width: "100%",
    // Caps runaway width on tablets/large screens — phones never reach
    // this width so the look is unchanged there.
    maxWidth: 440,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  } as ViewStyle,

  // flexShrink: 1 lets this be the ONE piece that gives up height when
  // the card doesn't fit; minHeight: 0 is required for that to actually
  // take effect — a flex child's default minHeight is "auto", which
  // refuses to shrink below its own content height. flexGrow: 0 keeps a
  // short album list from stretching to fill extra space when there's
  // plenty of room.
  list: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
  } as ViewStyle,

  listContent: {
    padding: Spacing.sm,
  } as ViewStyle,

  cardHighlight: {
    borderRadius: Radius.lg,
    backgroundColor: "rgba(255,255,255,0.08)",
  } as ViewStyle,
});
