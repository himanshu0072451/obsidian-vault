import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Colors, Typography, Spacing, Radius } from "../utils/design";
import type { VaultFile } from "../services/storage";
import { useAndroidBottomInset } from "../hooks/useAndroidBottomInset";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileDetailsSheetProps {
  visible: boolean;
  file: VaultFile | null;
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function formatFullDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Detect the original file type from the vault filename.
 * Naming scheme: {uuid}.{ext}_{timestamp}.vault
 * Examples:
 *   abc.jpeg_1700000000000.vault  → Photo
 *   abc.mp4_1700000000000.vault   → Video
 *   abc.pdf_1700000000000.vault   → Document
 */
function detectFileType(name: string): string {
  const withoutVault = name.replace(/\.vault$/, "");
  const underscoreIdx = withoutVault.lastIndexOf("_");
  const withoutTimestamp =
    underscoreIdx > -1 ? withoutVault.slice(0, underscoreIdx) : withoutVault;
  const dotIdx = withoutTimestamp.lastIndexOf(".");
  if (dotIdx === -1) return "Encrypted file";
  const ext = withoutTimestamp.slice(dotIdx + 1).toLowerCase();
  const photos = [
    "jpg",
    "jpeg",
    "png",
    "heic",
    "heif",
    "webp",
    "gif",
    "bmp",
    "tiff",
  ];
  const videos = ["mp4", "mov", "avi", "mkv", "m4v", "wmv", "webm", "3gp"];
  const docs = ["pdf", "doc", "docx", "txt", "xls", "xlsx", "ppt", "pptx"];
  if (photos.includes(ext)) return "Photo";
  if (videos.includes(ext)) return "Video";
  if (docs.includes(ext)) return "Document";
  return "Encrypted file";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 11,
    gap: Spacing.md,
  } as ViewStyle,
  label: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    flexShrink: 0,
  } as TextStyle,
  value: {
    fontSize: Typography.sm,
    color: Colors.text,
    textAlign: "right",
    flex: 1,
  } as TextStyle,
});

// ─── Component ────────────────────────────────────────────────────────────────

export function FileDetailsSheet({
  visible,
  file,
  onClose,
}: FileDetailsSheetProps) {
  const androidBottomInset = useAndroidBottomInset();
  if (!visible || file === null) return null;

  const displayName = file.displayName ?? file.name.replace(".vault", "");
  const fileType = detectFileType(file.name);
  const addedDate = formatFullDate(file.createdAt * 1000);
  const albumLabel = file.album ?? "Vault Root";
  const sizeLabel = formatFileSize(file.size);

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      style={styles.overlay}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>File Details</Text>
        <Pressable
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Text style={styles.closeBtnText}>Done</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* File name */}
        <View style={styles.nameSection}>
          <View style={styles.fileIcon}>
            <Text style={styles.fileIconText}>⬡</Text>
          </View>
          <Text style={styles.fileName} numberOfLines={3}>
            {displayName}
          </Text>
        </View>

        {/* Metadata rows */}
        <View style={styles.card}>
          <Row label="Type" value={fileType} />
          <View style={styles.divider} />
          <Row label="Size" value={sizeLabel} />
          <View style={styles.divider} />
          <Row label="Added" value={addedDate} />
          <View style={styles.divider} />
          <Row label="Album" value={albumLabel} />
          <View style={styles.divider} />
          <Row label="Starred" value={file.isFavorite ? "★ Yes" : "No"} />
        </View>

        {/* Tags */}
        {file.tags.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Tags</Text>
            <View style={styles.card}>
              <View style={styles.tagWrap}>
                {file.tags.map((tag) => (
                  <View key={tag} style={styles.tagChip}>
                    <Text style={styles.tagChipText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {file.tags.length === 0 && (
          <>
            <Text style={styles.sectionLabel}>Tags</Text>
            <View style={styles.card}>
              <Text style={styles.emptyText}>No tags applied</Text>
            </View>
          </>
        )}

        <View style={[styles.bottomPad, { height: Spacing.xl + androidBottomInset }]} />
      </ScrollView>
    </Animated.View>
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
    backgroundColor: Colors.background,
    zIndex: 9999,
    elevation: 9999,
  } as ViewStyle,

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing["2xl"],
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  } as ViewStyle,

  headerTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.text,
  } as TextStyle,

  headerSpacer: { width: 48 } as ViewStyle,

  closeBtn: { width: 48, alignItems: "flex-end" } as ViewStyle,
  closeBtnText: {
    fontSize: Typography.base,
    color: Colors.silver,
    fontWeight: Typography.medium,
  } as TextStyle,

  scroll: { flex: 1 } as ViewStyle,
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  } as ViewStyle,

  nameSection: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  } as ViewStyle,

  fileIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,

  fileIconText: { fontSize: 28, color: Colors.textMuted } as TextStyle,

  fileName: {
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
    color: Colors.text,
    textAlign: "center",
    letterSpacing: Typography.tight,
  } as TextStyle,

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    overflow: "hidden",
  } as ViewStyle,

  divider: {
    height: 1,
    backgroundColor: Colors.border,
  } as ViewStyle,

  sectionLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textMuted,
    letterSpacing: Typography.widest,
    textTransform: "uppercase",
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.sm,
  } as TextStyle,

  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  } as ViewStyle,

  tagChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.midDark,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  } as ViewStyle,

  tagChipText: {
    fontSize: Typography.sm,
    color: Colors.text,
  } as TextStyle,

  emptyText: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    paddingVertical: Spacing.md,
    textAlign: "center",
  } as TextStyle,

  bottomPad: { height: Spacing.xl } as ViewStyle,
});
