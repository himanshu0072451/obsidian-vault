import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Colors, Typography, Spacing, Radius } from "../utils/design";

interface MoveFileSheetProps {
  visible: boolean;
  fileName: string;
  currentAlbum: string | null;
  albums: string[];
  onSelect: (targetAlbum: string | null) => void;
  onCancel: () => void;
}

export function MoveFileSheet({
  visible,
  fileName,
  currentAlbum,
  albums,
  onSelect,
  onCancel,
}: MoveFileSheetProps) {
  const sheetScale = useSharedValue(0.92);
  const [backdropEnabled, setBackdropEnabled] = useState(false);

  useEffect(() => {
    if (visible) {
      setBackdropEnabled(false);

      sheetScale.value = 0.92;

      // Backdrop taps enable once the entrance spring actually settles,
      // rather than a fixed guess at how long that takes — so retuning the
      // spring can never leave this gate mistimed.
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
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sheetScale.value }],
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
        <Pressable onPress={() => {}}>
          <Animated.View style={[styles.sheet, sheetStyle]}>
            <View style={styles.header}>
              <Text style={styles.title}>Move to Album</Text>

              <Text style={styles.fileName} numberOfLines={1}>
                {fileName}
              </Text>

              <Text style={styles.subtitle}>
                {currentAlbum
                  ? `Currently in: ${currentAlbum}`
                  : "Currently in: Vault Root"}
              </Text>
            </View>

            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {!hasOptions && (
                <Text style={styles.emptyText}>No albums available.</Text>
              )}

              {destinations.map((album) => (
                <Pressable
                  key={album}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                  ]}
                  onPress={() => onSelect(album)}
                >
                  <Text style={styles.rowText}>{album}</Text>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ))}

              {canRemove && (
                <>
                  {destinations.length > 0 && <View style={styles.divider} />}

                  <Pressable
                    style={({ pressed }) => [
                      styles.row,
                      pressed && styles.rowPressed,
                    ]}
                    onPress={() => onSelect(null)}
                  >
                    <Text style={[styles.rowText, { color: "#ff6b6b" }]}>
                      Remove from Album
                    </Text>
                  </Pressable>
                </>
              )}
            </ScrollView>

            <Pressable
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && styles.cancelBtnPressed,
              ]}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.3)",
  } as ViewStyle,

  list: {
    maxHeight: 320,
  } as ViewStyle,

  listContent: {
    paddingVertical: Spacing.xs,
  } as ViewStyle,

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
  } as ViewStyle,

  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: Spacing.lg,
  } as ViewStyle,

  cancelBtn: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.3)",
    paddingVertical: 16,
    alignItems: "center",
  } as ViewStyle,
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
    backgroundColor: "rgba(0,0,0,0.55)",
  } as ViewStyle,

  sheetWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  } as ViewStyle,

  sheet: {
    width: "100%",
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  } as ViewStyle,

  title: {
    color: Colors.text,
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
  } as TextStyle,

  fileName: {
    marginTop: 6,
    color: Colors.text,
    fontSize: Typography.base,
  } as TextStyle,

  subtitle: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: Typography.sm,
  } as TextStyle,

  emptyText: {
    color: Colors.textSecondary,
    textAlign: "center",
    padding: 20,
  } as TextStyle,

  rowText: {
    flex: 1,
    color: Colors.text,
    fontSize: Typography.base,
  } as TextStyle,

  rowPressed: {
    backgroundColor: "rgba(255,255,255,0.06)",
  } as ViewStyle,

  chevron: {
    color: Colors.textMuted,
    fontSize: 20,
  } as TextStyle,

  cancelBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.06)",
  } as ViewStyle,

  cancelText: {
    color: Colors.text,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  } as TextStyle,
});
