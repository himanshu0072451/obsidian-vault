/**
 * SettingsScreen — V1 settings for ImageVault.
 *
 * Sections:
 *   Security  — Biometric toggle, Lock on Background, Change Passcode
 *   Vault     — Storage statistics, Rebuild Index
 *   About     — App version
 *
 * Navigation: rendered as a full-screen overlay by App.tsx (no react-navigation).
 * The ChangePasscodeSheet is a second overlay stacked on top when needed.
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Alert,
  ActivityIndicator,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import Constants from "expo-constants";
import { Colors, Typography, Spacing, Radius } from "../utils/design";
import { useAuth, useVault } from "../hooks/useAuth";
import { ChangePasscodeSheet } from "../components/ChangePasscodeSheet";
import { StatsSheet } from "../components/StatsSheet";
import type { VaultFile } from "../services/storage";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SettingsScreenProps {
  onClose: () => void;
  /** Called after Rebuild Index completes so HomeScreen can resync allFiles. */
  onIndexRebuilt: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsScreen({
  onClose,
  onIndexRebuilt,
}: SettingsScreenProps) {
  const {
    biometricEnabled,
    biometricAvailability,
    enableBiometrics,
    disableBiometrics,
    lockOnBackground,
    setLockOnBackground,
    camouflageModeEnabled,
    setCamouflageModeEnabled,
    changePasscode,
    vaultContext,
  } = useAuth();
  const vault = useVault();

  const [stats, setStats] = useState<{
    files: number;
    size: number;
    albums: Set<string>;
    tags: number;
  } | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [allFiles, setAllFiles] = useState<VaultFile[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [showChangePasscode, setShowChangePasscode] = useState(false);

  // Load stats on mount
  useEffect(() => {
    vault.getVaultFiles().then((files: VaultFile[]) => {
      setAllFiles(files);
      const albums = new Set(
        files.map((f) => f.album).filter((a): a is string => a !== null),
      );
      const tags = new Set(files.flatMap((f) => f.tags));
      const size = files.reduce((sum, f) => sum + f.size, 0);
      setStats({ files: files.length, size, albums, tags: tags.size });
    });
  }, [vault]);

  // ── Biometric toggle ──────────────────────────────────────────────────────

  const handleBiometricToggle = useCallback(
    async (value: boolean) => {
      if (value) {
        await enableBiometrics();
      } else {
        await disableBiometrics();
      }
    },
    [enableBiometrics, disableBiometrics],
  );

  // ── Rebuild Index ─────────────────────────────────────────────────────────

  const handleRebuildIndex = useCallback(() => {
    Alert.alert(
      "Rebuild Vault Index",
      "This will rescan all files from disk. Display names and tags will be lost — files, albums, and favorites are safe.\n\nContinue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Rebuild",
          style: "destructive",
          onPress: async () => {
            setRebuilding(true);
            try {
              await vault.rebuildIndex();
              onIndexRebuilt();
              Alert.alert("Done", "Vault index has been rebuilt.");
            } catch (e) {
              Alert.alert(
                "Error",
                "Index rebuild failed. Your files are safe.",
              );
            } finally {
              setRebuilding(false);
            }
          },
        },
      ],
    );
  }, [vault, onIndexRebuilt]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const version = Constants.expoConfig?.version ?? "—";

  const biometricAvailable =
    biometricAvailability?.supported === true &&
    biometricAvailability?.enrolled === true;

  const biometricLabel = biometricAvailability?.label ?? "Biometrics";

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close settings"
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.closeBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Security ─────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Security</Text>
        <View style={styles.card}>
          {/* Biometric toggle */}
          <View style={[styles.row, !biometricAvailable && styles.rowDisabled]}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>{biometricLabel}</Text>
              <Text style={styles.rowSubtitle}>
                {biometricAvailable
                  ? "Unlock without typing your passcode"
                  : "Not available on this device"}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              disabled={!biometricAvailable}
              trackColor={{ false: Colors.midDark, true: Colors.silver }}
              thumbColor={Colors.white}
            />
          </View>

          <View style={styles.divider} />

          {/* Lock on Background */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Lock on Background</Text>
              <Text style={styles.rowSubtitle}>
                Lock vault when you switch apps
              </Text>
            </View>
            <Switch
              value={lockOnBackground}
              onValueChange={setLockOnBackground}
              trackColor={{ false: Colors.midDark, true: Colors.silver }}
              thumbColor={Colors.white}
            />
          </View>

          <View style={styles.divider} />

          {/* Camouflage Mode */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Camouflage Mode</Text>
              <Text style={styles.rowSubtitle}>
                Disguise the vault as a Calculator until your passcode is
                typed
              </Text>
            </View>
            <Switch
              value={camouflageModeEnabled}
              onValueChange={setCamouflageModeEnabled}
              trackColor={{ false: Colors.midDark, true: Colors.silver }}
              thumbColor={Colors.white}
            />
          </View>

          <View style={styles.divider} />

          {/* Change Passcode */}
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => setShowChangePasscode(true)}
            accessibilityRole="button"
            accessibilityLabel="Change passcode"
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Change Passcode</Text>
              <Text style={styles.rowSubtitle}>
                Update your 6-digit vault passcode
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>

        {/* ── Vault ────────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Vault</Text>
        <View style={styles.card}>
          {/* Storage statistics — tap to open full stats */}
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => setShowStats(true)}
            accessibilityRole="button"
            accessibilityLabel="View storage statistics"
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Storage</Text>
              {stats === null ? (
                <ActivityIndicator
                  size="small"
                  color={Colors.textMuted}
                  style={{ marginTop: 4 }}
                />
              ) : (
                <Text style={styles.rowSubtitle}>
                  {`${stats.files} file${stats.files === 1 ? "" : "s"}  ·  ${formatSize(stats.size)}  ·  ${stats.albums.size} album${stats.albums.size === 1 ? "" : "s"}  ·  ${stats.tags} tag${stats.tags === 1 ? "" : "s"}`}
                </Text>
              )}
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <View style={styles.divider} />

          {/* Rebuild Index */}
          <Pressable
            style={({ pressed }) => [
              styles.row,
              pressed && styles.rowPressed,
              rebuilding && styles.rowDisabled,
            ]}
            onPress={rebuilding ? undefined : handleRebuildIndex}
            accessibilityRole="button"
            accessibilityLabel="Rebuild vault index"
            disabled={rebuilding}
          >
            <View style={styles.rowLeft}>
              <Text style={[styles.rowTitle, styles.destructiveText]}>
                Rebuild Vault Index
              </Text>
              <Text style={styles.rowSubtitle}>
                Rescan all files from disk (tags will be lost)
              </Text>
            </View>
            {rebuilding ? (
              <ActivityIndicator size="small" color={Colors.textMuted} />
            ) : (
              <Text style={styles.chevron}>›</Text>
            )}
          </Pressable>
        </View>

        {/* ── About ────────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowTitle}>Version</Text>
            <Text style={styles.rowValue}>{version}</Text>
          </View>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Change Passcode overlay — stacked above this screen */}
      <ChangePasscodeSheet
        visible={showChangePasscode}
        onClose={() => setShowChangePasscode(false)}
        onChangePasscode={changePasscode}
      />
      <StatsSheet
        visible={showStats}
        files={allFiles}
        onClose={() => setShowStats(false)}
      />
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    zIndex: 100,
    elevation: 100,
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
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.text,
    letterSpacing: Typography.tight,
  } as TextStyle,

  closeBtn: { width: 40 } as ViewStyle,
  closeBtnText: {
    fontSize: 16,
    color: Colors.textSecondary,
  } as TextStyle,

  scroll: { flex: 1 } as ViewStyle,
  content: {
    padding: Spacing.lg,
    gap: Spacing.xs,
    paddingBottom: Spacing["3xl"],
  } as ViewStyle,

  sectionLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textMuted,
    letterSpacing: Typography.widest,
    textTransform: "uppercase",
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  } as TextStyle,

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  } as ViewStyle,

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  } as ViewStyle,

  rowPressed: {
    backgroundColor: Colors.midDark,
  } as ViewStyle,

  rowDisabled: {
    opacity: 0.5,
  } as ViewStyle,

  rowLeft: {
    flex: 1,
    gap: 3,
  } as ViewStyle,

  rowTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.medium,
    color: Colors.text,
  } as TextStyle,

  rowSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  } as TextStyle,

  rowValue: {
    fontSize: Typography.base,
    color: Colors.textMuted,
  } as TextStyle,

  chevron: {
    fontSize: 20,
    color: Colors.textMuted,
  } as TextStyle,

  destructiveText: {
    color: Colors.lightGray,
  } as TextStyle,

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: Spacing.lg,
  } as ViewStyle,

  bottomPad: { height: Spacing.xl } as ViewStyle,
});
