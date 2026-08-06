/**
 * SettingsScreen — V1 settings for ImageVault.
 *
 * Sections:
 *   Security  — Biometric toggle, Lock on Background, Camouflage Mode, Change Passcode
 *   Vault     — Storage statistics, Rebuild Index
 *   About     — App version
 *
 * Navigation: rendered as a full-screen overlay by App.tsx (no react-navigation).
 * The ChangePasscodeSheet is a second overlay stacked on top when needed.
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";
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

// ─── SettingsRow ────────────────────────────────────────────────────────────
// One consistent row shape for every setting: a small monochrome icon chip,
// title/subtitle, and a right-hand accessory (switch, chevron, value, or
// loading spinner). Rows with no onPress render as a plain View — press
// feedback only ever appears where a tap actually does something.

interface SettingsRowProps {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  subtitle?: string;
  disabled?: boolean;
  muted?: boolean;
  onPress?: () => void;
  right?: React.ReactNode;
}

function SettingsRow({
  icon,
  title,
  subtitle,
  disabled,
  muted,
  onPress,
  right,
}: SettingsRowProps) {
  // Press-scale matches Card/Button's convention elsewhere in the app —
  // declared unconditionally (hooks can't be called only when onPress is
  // set) but only ever driven when this row is actually pressable.
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, { damping: 20, stiffness: 300 });
  }, []);
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  }, []);

  const body = (
    <View
      className={`flex-row items-center gap-3 px-4 py-4 ${disabled ? "opacity-40" : ""}`}
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-white/[0.06]">
        <Feather
          name={icon}
          size={17}
          color={muted ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.75)"}
        />
      </View>
      <View className="flex-1 gap-0.5">
        <Text
          className={`text-[15px] font-medium ${muted ? "text-white/50" : "text-white"}`}
        >
          {title}
        </Text>
        {subtitle && (
          <Text className="text-[13px] leading-[17px] text-white/40">
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );

  if (!onPress) return body;

  return (
    <Animated.View style={pressStyle}>
      <Pressable
        onPress={disabled ? undefined : onPress}
        onPressIn={disabled ? undefined : handlePressIn}
        onPressOut={disabled ? undefined : handlePressOut}
        disabled={disabled}
        className="active:bg-white/[0.05]"
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        {body}
      </Pressable>
    </Animated.View>
  );
}

function RowDivider() {
  return <View className="ml-16 h-px bg-white/[0.08]" />;
}

// ─── AnimatedSwitch ─────────────────────────────────────────────────────────
// The native Switch already animates its own thumb — this just adds a
// small settle pop on the whole control when its value flips, so the row
// itself reacts too, not just the toggle.

function AnimatedSwitch(props: React.ComponentProps<typeof Switch>) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the pop on mount — only react to actual value flips.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    scale.value = withSpring(1.08, { damping: 12, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 14, stiffness: 300 });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.value]);

  return (
    <Animated.View style={style}>
      <Switch {...props} />
    </Animated.View>
  );
}

function Chevron() {
  return <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.3)" />;
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
      Haptics.selectionAsync().catch(() => {});
      if (value) {
        await enableBiometrics();
      } else {
        await disableBiometrics();
      }
    },
    [enableBiometrics, disableBiometrics],
  );

  const handleLockOnBackgroundToggle = useCallback(
    (value: boolean) => {
      Haptics.selectionAsync().catch(() => {});
      setLockOnBackground(value);
    },
    [setLockOnBackground],
  );

  const handleCamouflageModeToggle = useCallback(
    (value: boolean) => {
      Haptics.selectionAsync().catch(() => {});
      setCamouflageModeEnabled(value);
    },
    [setCamouflageModeEnabled],
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
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              Alert.alert("Done", "Vault index has been rebuilt.");
            } catch (e) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
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

  const switchProps = {
    trackColor: { false: "#242424", true: "#aaaaaa" },
    thumbColor: "#f5f5f5",
    style: { transform: [{ scale: 0.9 }] },
  } as const;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(180)}
      style={styles.root}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-white/[0.08] px-5 pb-6 pt-12">
        <Pressable
          onPress={onClose}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full active:bg-white/[0.06]"
          accessibilityRole="button"
          accessibilityLabel="Close settings"
        >
          <Feather name="x" size={20} color="rgba(255,255,255,0.7)" />
        </Pressable>
        <Text className="text-[17px] font-semibold tracking-tight text-white">
          Settings
        </Text>
        <View className="h-9 w-9" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-1 p-6 pb-16"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Security ─────────────────────────────────────────────────── */}
        <Text className="mb-1 mt-2 px-1 text-[11px] font-semibold uppercase tracking-[2px] text-white/35">
          Security
        </Text>
        <View className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161616]">
          <SettingsRow
            icon="eye"
            title={biometricLabel}
            subtitle={
              biometricAvailable
                ? "Unlock without typing your passcode"
                : "Not available on this device"
            }
            disabled={!biometricAvailable}
            right={
              <AnimatedSwitch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                disabled={!biometricAvailable}
                {...switchProps}
              />
            }
          />

          <RowDivider />

          <SettingsRow
            icon="lock"
            title="Lock on Background"
            subtitle="Lock vault when you switch apps"
            right={
              <AnimatedSwitch
                value={lockOnBackground}
                onValueChange={handleLockOnBackgroundToggle}
                {...switchProps}
              />
            }
          />

          <RowDivider />

          <SettingsRow
            icon="eye-off"
            title="Camouflage Mode"
            subtitle="Disguise the vault as a Calculator until your passcode is typed"
            right={
              <AnimatedSwitch
                value={camouflageModeEnabled}
                onValueChange={handleCamouflageModeToggle}
                {...switchProps}
              />
            }
          />

          <RowDivider />

          <SettingsRow
            icon="key"
            title="Change Passcode"
            subtitle="Update your 6-digit vault passcode"
            onPress={() => setShowChangePasscode(true)}
            right={<Chevron />}
          />
        </View>

        {/* ── Vault ────────────────────────────────────────────────────── */}
        <Text className="mb-1 mt-8 px-1 text-[11px] font-semibold uppercase tracking-[2px] text-white/35">
          Vault
        </Text>
        <View className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161616]">
          <SettingsRow
            icon="hard-drive"
            title="Storage"
            subtitle={
              stats === null
                ? undefined
                : `${stats.files} file${stats.files === 1 ? "" : "s"}  ·  ${formatSize(stats.size)}  ·  ${stats.albums.size} album${stats.albums.size === 1 ? "" : "s"}  ·  ${stats.tags} tag${stats.tags === 1 ? "" : "s"}`
            }
            onPress={() => setShowStats(true)}
            right={
              stats === null ? (
                <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
              ) : (
                <Chevron />
              )
            }
          />

          <RowDivider />

          <SettingsRow
            icon="refresh-cw"
            title="Rebuild Vault Index"
            subtitle="Rescan all files from disk (tags will be lost)"
            muted
            disabled={rebuilding}
            onPress={rebuilding ? undefined : handleRebuildIndex}
            right={
              rebuilding ? (
                <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
              ) : (
                <Chevron />
              )
            }
          />
        </View>

        {/* ── About ────────────────────────────────────────────────────── */}
        <Text className="mb-1 mt-8 px-1 text-[11px] font-semibold uppercase tracking-[2px] text-white/35">
          About
        </Text>
        <View className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161616]">
          <SettingsRow
            icon="info"
            title="Version"
            right={<Text className="text-[15px] text-white/40">{version}</Text>}
          />
        </View>
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
// Only the root wrapper needs a plain style object — it's an Animated.View
// (react-native-reanimated), which NativeWind's className doesn't intercept
// (only core RN components like View/Text/Pressable are auto-registered).

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0a0a0a",
    zIndex: 100,
    elevation: 100,
  },
});
