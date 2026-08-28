import React, { useMemo } from "react";
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatsSheetProps {
  visible: boolean;
  files: VaultFile[];
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function isThisWeek(ts: number): boolean {
  const now = Date.now();
  return now - ts < 7 * 24 * 60 * 60 * 1000;
}

function isThisMonth(ts: number): boolean {
  const d = new Date(ts);
  const n = new Date();
  return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

function shortDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.left}>
        <Text style={rowStyles.label}>{label}</Text>
        {sub ? <Text style={rowStyles.sub}>{sub}</Text> : null}
      </View>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    gap: Spacing.md,
  } as ViewStyle,
  left: { flex: 1, gap: 2 } as ViewStyle,
  label: {
    fontSize: Typography.sm,
    color: Colors.text,
  } as TextStyle,
  sub: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  } as TextStyle,
  value: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.silver,
    textAlign: "right",
    flexShrink: 0,
  } as TextStyle,
});

// ─── Component ────────────────────────────────────────────────────────────────

export function StatsSheet({ visible, files, onClose }: StatsSheetProps) {
  if (!visible) return null;

  const stats = useMemo(() => {
    const count = files.length;
    const total = files.reduce((s, f) => s + f.size, 0);
    const avg = count > 0 ? total / count : 0;

    const largest = files.reduce<VaultFile | null>(
      (max, f) => (max === null || f.size > max.size ? f : max),
      null,
    );
    const oldest = files.reduce<VaultFile | null>(
      (min, f) => (min === null || f.createdAt < min.createdAt ? f : min),
      null,
    );

    const albums = new Set(
      files.map((f) => f.album).filter((a): a is string => a !== null),
    );
    const favs = files.filter((f) => f.isFavorite).length;

    const distinctTags = new Set(files.flatMap((f) => f.tags));
    const tagged = files.filter((f) => f.tags.length > 0).length;

    const thisWeek = files.filter((f) => isThisWeek(f.createdAt * 1000)).length;
    const thisMonth = files.filter((f) =>
      isThisMonth(f.createdAt * 1000),
    ).length;

    return {
      count,
      total,
      avg,
      largest,
      oldest,
      albums,
      favs,
      distinctTags,
      tagged,
      thisWeek,
      thisMonth,
    };
  }, [files]);

  const largestName = stats.largest
    ? (stats.largest.displayName ?? stats.largest.name.replace(".vault", ""))
    : "—";
  const oldestDate = stats.oldest
    ? shortDate(stats.oldest.createdAt * 1000)
    : "—";

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      style={styles.overlay}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Vault Statistics</Text>
        <Pressable
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Text style={styles.closeBtnText}>Done</Text>
        </Pressable>
      </View>

      {stats.count === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⬡</Text>
          <Text style={styles.emptyTitle}>No files yet</Text>
          <Text style={styles.emptyDesc}>
            Add encrypted files to see statistics.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Overview */}
          <Text style={styles.sectionLabel}>Overview</Text>
          <View style={styles.card}>
            <StatRow label="Total files" value={`${stats.count}`} />
            <View style={styles.divider} />
            <StatRow label="Storage used" value={fmt(stats.total)} />
            <View style={styles.divider} />
            <StatRow label="Average size" value={fmt(stats.avg)} />
            <View style={styles.divider} />
            <StatRow label="Favorites" value={`${stats.favs}`} />
          </View>

          {/* Size */}
          <Text style={styles.sectionLabel}>Size</Text>
          <View style={styles.card}>
            <StatRow
              label="Largest file"
              value={fmt(stats.largest?.size ?? 0)}
              sub={largestName}
            />
          </View>

          {/* Organisation */}
          <Text style={styles.sectionLabel}>Organisation</Text>
          <View style={styles.card}>
            <StatRow label="Albums" value={`${stats.albums.size}`} />
            <View style={styles.divider} />
            <StatRow
              label="Distinct tags"
              value={`${stats.distinctTags.size}`}
            />
            <View style={styles.divider} />
            <StatRow label="Files with tags" value={`${stats.tagged}`} />
            <View style={styles.divider} />
            <StatRow
              label="Untagged files"
              value={`${stats.count - stats.tagged}`}
            />
          </View>

          {/* Activity */}
          <Text style={styles.sectionLabel}>Activity</Text>
          <View style={styles.card}>
            <StatRow label="Oldest file" value={oldestDate} />
            <View style={styles.divider} />
            <StatRow label="Added this month" value={`${stats.thisMonth}`} />
            <View style={styles.divider} />
            <StatRow label="Added this week" value={`${stats.thisWeek}`} />
          </View>

          <View style={styles.bottomPad} />
        </ScrollView>
      )}
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
    gap: Spacing.sm,
    paddingBottom: Spacing["3xl"],
  } as ViewStyle,

  sectionLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textMuted,
    letterSpacing: Typography.widest,
    textTransform: "uppercase",
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
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

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing.xl,
  } as ViewStyle,

  emptyIcon: { fontSize: 48, color: Colors.textMuted } as TextStyle,
  emptyTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
  } as TextStyle,
  emptyDesc: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    textAlign: "center",
  } as TextStyle,

  bottomPad: { height: Spacing.xl } as ViewStyle,
});
