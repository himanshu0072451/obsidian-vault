import React, { useEffect, useCallback, useState, useRef, memo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { Colors, Typography, Spacing, Radius } from "../utils/design";
import { useAuth, useVault } from "../hooks/useAuth";
import { useVaultOperations } from "../hooks/useVaultOperations";
import { ProgressOverlay } from "../components/ProgressOverlay";
import { Card, StatCard } from "../components/Card";
import type { VaultFile } from "../services/storage";
import { decryptImage } from "../services/encryption";
import * as FileSystem from "expo-file-system";
import ImageViewer from "../components/ImageViewer";
import { AlbumFilterBar } from "../components/AlbumFilterBar";
import { AlbumActionSheet } from "../components/AlbumActionSheet";
import type { AlbumActionSheetMode } from "../components/AlbumActionSheet";
import { useAlbums } from "../hooks/useAlbums";

// ─── HomeScreen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { lock, passcode } = useAuth();
  const vault = useVault();
  const {
    albums,
    createAlbum,
    error: albumError,
    clearError: clearAlbumError,
  } = useAlbums();
  const {
    encryptOp,
    decryptOp,
    pickImages,
    encryptImages,
    resetEncrypt,
    resetDecrypt,
  } = useVaultOperations();

  // Single source of truth for vault file list
  const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Decrypt state
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptingFileName, setDecryptingFileName] = useState<string | null>(
    null,
  );

  // Preview state
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);

  // Tracks the active temp file so we can delete it when preview closes
  const activeTempUri = useRef<string | null>(null);

  // Album filter: undefined = All, null = root only, string = specific album
  const [selectedAlbum, setSelectedAlbum] = useState<string | null | undefined>(
    undefined,
  );

  // Album action sheet
  const [sheetMode, setSheetMode] = useState<AlbumActionSheetMode>("create");
  const [sheetTarget, setSheetTarget] = useState<string | undefined>(undefined);
  const [sheetVisible, setSheetVisible] = useState(false);

  // ─── Data loading ────────────────────────────────────────────────────────

  const loadFiles = useCallback(async () => {
    const files = await vault.getVaultFiles(selectedAlbum);
    setVaultFiles(files);
  }, [vault, selectedAlbum]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadFiles();
    setIsRefreshing(false);
  }, [loadFiles]);

  // ─── Encrypt ─────────────────────────────────────────────────────────────

  const handleEncrypt = useCallback(async () => {
    try {
      const assets = await pickImages();
      if (assets.length === 0) return;
      await encryptImages(assets, passcode, false, selectedAlbum ?? null);
      // Reload the visible list after successful encryption
      await loadFiles();
    } catch (e) {
      console.error("[Encrypt]", e);
    }
  }, [pickImages, encryptImages, passcode, loadFiles]);

  // ─── Decrypt ─────────────────────────────────────────────────────────────

  const handleDecrypt = useCallback(
    async (file: VaultFile) => {
      try {
        setIsDecrypting(true);
        setDecryptingFileName(file.name.replace(".vault", ""));

        const outPath = await decryptImage(
          file.uri,
          passcode,
          FileSystem.cacheDirectory!,
        );

        activeTempUri.current = outPath;
        setPreviewFileName(file.name.replace(".vault", ""));
        setPreviewUri(outPath);
      } catch (e: any) {
        const isWrongPasscode =
          e?.message?.includes("padding") || e?.message?.includes("passcode");

        Alert.alert(
          "Decryption Failed",
          isWrongPasscode
            ? "Incorrect passcode. This file cannot be unlocked."
            : "This file may be corrupted or from an incompatible version.",
          [{ text: "OK" }],
        );
      } finally {
        setIsDecrypting(false);
        setDecryptingFileName(null);
      }
    },
    [passcode],
  );

  // ─── Preview close — always clean up temp file ────────────────────────────

  const handleClosePreview = useCallback(async () => {
    setPreviewUri(null);
    setPreviewFileName(null);
    if (activeTempUri.current) {
      await FileSystem.deleteAsync(activeTempUri.current, { idempotent: true });
      activeTempUri.current = null;
    }
  }, []);

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = useCallback(
    (file: VaultFile) => {
      Alert.alert(
        "Delete Encrypted File",
        `Permanently delete "${file.name.replace(".vault", "")}"?\n\nThis cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              await vault.deleteVaultFile(file.uri);
              await loadFiles();
            },
          },
        ],
      );
    },
    [loadFiles],
  );

  // ─── Album error display ──────────────────────────────────────────────────

  useEffect(() => {
    if (albumError) {
      Alert.alert("Album Error", albumError);
      clearAlbumError();
    }
  }, [albumError]);

  // ─── Album sheet handlers ─────────────────────────────────────────────────

  const openCreateSheet = useCallback(() => {
    setSheetMode("create");
    setSheetTarget(undefined);
    setSheetVisible(true);
  }, []);

  const handleSheetConfirm = useCallback(
    async (value: string) => {
      setSheetVisible(false);
      await createAlbum(value);
    },
    [createAlbum],
  );

  // ─── Overlay state ────────────────────────────────────────────────────────

  const isShowingProgress =
    encryptOp.status !== "idle" || decryptOp.status !== "idle";
  const activeOp = encryptOp.status !== "idle" ? encryptOp : decryptOp;
  const resetActiveOp =
    encryptOp.status !== "idle" ? resetEncrypt : resetDecrypt;

  // ─── Derived stats ────────────────────────────────────────────────────────

  const totalSize = vaultFiles.reduce((sum, f) => sum + f.size, 0);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.silver}
            colors={[Colors.silver]}
          />
        }
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(0).duration(400)}
          style={styles.header}
        >
          <View>
            <Text style={styles.greeting}>Vault</Text>
            <Text style={styles.subGreeting}>Your encrypted storage</Text>
          </View>
          <Pressable
            onPress={lock}
            style={styles.lockBtn}
            accessibilityRole="button"
            accessibilityLabel="Lock vault"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.lockIcon}>⎋</Text>
          </Pressable>
        </Animated.View>

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(80).duration(400)}
          style={styles.statsRow}
        >
          <StatCard
            value={vaultFiles.length}
            label="Encrypted"
            style={styles.statFlex}
          />
          <StatCard
            value={formatFileSize(totalSize)}
            label="Total size"
            style={styles.statFlex}
          />
        </Animated.View>

        {/* ── Action ─────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(160).duration(400)}>
          <ActionCard
            icon="🔒"
            title="Encrypt Images"
            description="Select photos from your library to lock in the vault"
            onPress={handleEncrypt}
          />
        </Animated.View>

        {/* ── Album filter ────────────────────────────────────────────────── */}
        <AlbumFilterBar
          albums={albums}
          selected={selectedAlbum}
          onSelect={setSelectedAlbum}
          onCreatePress={openCreateSheet}
        />

        {/* ── Vault file list ─────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(240).duration(400)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vault Contents</Text>
            {vaultFiles.length > 0 && (
              <Text style={styles.sectionCount}>{vaultFiles.length}</Text>
            )}
          </View>

          {vaultFiles.length === 0 ? (
            <EmptyVault />
          ) : (
            <View style={styles.fileList}>
              {vaultFiles.map((file, index) => (
                <VaultFileCard
                  key={file.uri}
                  file={file}
                  index={index}
                  onPress={() => handleDecrypt(file)}
                  onDelete={() => handleDelete(file)}
                />
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* ── Image preview ──────────────────────────────────────────────────── */}
      <ImageViewer
        visible={!!previewUri}
        imageUri={previewUri}
        fileName={previewFileName}
        onClose={handleClosePreview}
      />

      {/* ── Decrypt loading overlay ────────────────────────────────────────── */}
      {isDecrypting && (
        <Animated.View
          entering={FadeIn.duration(150)}
          style={styles.decryptOverlay}
        >
          <View style={styles.decryptSheet}>
            <ActivityIndicator size="large" color={Colors.silver} />
            <Text style={styles.decryptTitle}>Decrypting</Text>
            {decryptingFileName && (
              <Text style={styles.decryptFileName} numberOfLines={1}>
                {decryptingFileName}
              </Text>
            )}
          </View>
        </Animated.View>
      )}

      {/* ── Encrypt progress overlay ───────────────────────────────────────── */}
      <ProgressOverlay
        visible={isShowingProgress}
        status={activeOp.status}
        progress={activeOp.progress}
        message={activeOp.message}
        error={activeOp.error}
        onDismiss={resetActiveOp}
      />
      {/* ── Album action sheet ─────────────────────────────────────────────── */}
      <AlbumActionSheet
        visible={sheetVisible}
        mode={sheetMode}
        albumName={sheetTarget}
        onConfirm={handleSheetConfirm}
        onCancel={() => setSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── VaultFileCard ────────────────────────────────────────────────────────────

interface VaultFileCardProps {
  file: VaultFile;
  index: number;
  onPress: () => void;
  onDelete: () => void;
}

const VaultFileCard = memo(function VaultFileCard({
  file,
  index,
  onPress,
  onDelete,
}: VaultFileCardProps) {
  const scale = useSharedValue(1);
  const deleteScale = useSharedValue(1);

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const deleteAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: deleteScale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 20, stiffness: 300 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  }, []);

  const handleDeletePress = useCallback(() => {
    deleteScale.value = withSequence(
      withTiming(0.85, { duration: 80 }),
      withTiming(1, { duration: 80 }),
    );
    setTimeout(onDelete, 100);
  }, [onDelete]);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 40).duration(350)}
      style={cardAnimStyle}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`Decrypt and preview ${file.name.replace(".vault", "")}`}
      >
        <View style={styles.fileCard}>
          {/* Left: icon + meta */}
          <View style={styles.fileLeft}>
            <View style={styles.fileIconWrap}>
              <Text style={styles.fileIconText}>⬡</Text>
            </View>
            <View style={styles.fileMeta}>
              <Text style={styles.fileName} numberOfLines={1}>
                {file.name.replace(".vault", "")}
              </Text>
              <Text style={styles.fileDetail}>
                {formatFileSize(file.size)}
                {"  ·  "}
                {formatRelativeTime(file.createdAt * 1000)}
              </Text>
            </View>
          </View>

          {/* Right: delete + chevron */}
          <View style={styles.fileActions}>
            <Animated.View style={deleteAnimStyle}>
              <Pressable
                onPress={handleDeletePress}
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${file.name.replace(".vault", "")}`}
                style={styles.deleteBtn}
              >
                <Text style={styles.deleteIcon}>✕</Text>
              </Pressable>
            </Animated.View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

// ─── ActionCard ───────────────────────────────────────────────────────────────

interface ActionCardProps {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
}

const ActionCard = memo(function ActionCard({
  icon,
  title,
  description,
  onPress,
}: ActionCardProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 20, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 20, stiffness: 300 });
        }}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={styles.actionCard}
      >
        <Text style={styles.actionIcon}>{icon}</Text>
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>{title}</Text>
          <Text style={styles.actionDesc}>{description}</Text>
        </View>
        <Text style={styles.actionChevron}>›</Text>
      </Pressable>
    </Animated.View>
  );
});

// ─── EmptyVault ───────────────────────────────────────────────────────────────

const EmptyVault = memo(function EmptyVault() {
  return (
    <Card style={styles.emptyCard}>
      <Text style={styles.emptyIcon}>⬡</Text>
      <Text style={styles.emptyTitle}>Vault is empty</Text>
      <Text style={styles.emptyDesc}>
        Tap "Encrypt Images" above to add your first file.
      </Text>
    </Card>
  );
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ts).toLocaleDateString();
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Layout
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  } as ViewStyle,
  scroll: {
    flex: 1,
  } as ViewStyle,
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing["3xl"],
    gap: Spacing.lg,
  } as ViewStyle,

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Spacing.sm,
  } as ViewStyle,
  greeting: {
    fontSize: Typography["3xl"],
    fontWeight: Typography.bold,
    color: Colors.text,
    letterSpacing: Typography.tight,
  } as TextStyle,
  subGreeting: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    letterSpacing: Typography.wide,
    marginTop: 2,
  } as TextStyle,
  lockBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  lockIcon: {
    fontSize: 18,
    color: Colors.textSecondary,
  } as TextStyle,

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  } as ViewStyle,
  statFlex: {
    flex: 1,
  } as ViewStyle,

  // Action card
  actionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  } as ViewStyle,
  actionIcon: {
    fontSize: 26,
    width: 40,
    textAlign: "center",
  } as TextStyle,
  actionText: {
    flex: 1,
  } as ViewStyle,
  actionTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
    color: Colors.text,
    marginBottom: 2,
  } as TextStyle,
  actionDesc: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  } as TextStyle,
  actionChevron: {
    fontSize: 24,
    color: Colors.textMuted,
  } as TextStyle,

  // Section
  section: {
    gap: Spacing.sm,
  } as ViewStyle,
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 4,
  } as ViewStyle,
  sectionTitle: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textMuted,
    letterSpacing: Typography.widest,
    textTransform: "uppercase",
  } as TextStyle,
  sectionCount: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textMuted,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 1,
    overflow: "hidden",
  } as TextStyle,

  // File list
  fileList: {
    gap: Spacing.sm,
  } as ViewStyle,
  fileCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  } as ViewStyle,
  fileLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.md,
    minWidth: 0, // allows text truncation
  } as ViewStyle,
  fileIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.midDark,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  } as ViewStyle,
  fileIconText: {
    fontSize: 18,
    color: Colors.textMuted,
  } as TextStyle,
  fileMeta: {
    flex: 1,
    minWidth: 0,
  } as ViewStyle,
  fileName: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.text,
  } as TextStyle,
  fileDetail: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 3,
  } as TextStyle,
  fileActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexShrink: 0,
    paddingLeft: Spacing.sm,
  } as ViewStyle,
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    backgroundColor: Colors.midDark,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  deleteIcon: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: Typography.bold,
  } as TextStyle,
  chevron: {
    fontSize: 22,
    color: Colors.textMuted,
  } as TextStyle,

  // Empty state
  emptyCard: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
  } as ViewStyle,
  emptyIcon: {
    fontSize: 36,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  } as TextStyle,
  emptyTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  } as TextStyle,
  emptyDesc: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 220,
  } as TextStyle,

  // Decrypt overlay
  decryptOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  decryptSheet: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing["2xl"],
    alignItems: "center",
    minWidth: 220,
    gap: Spacing.md,
  } as ViewStyle,
  decryptTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
    color: Colors.text,
    letterSpacing: Typography.wide,
  } as TextStyle,
  decryptFileName: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    maxWidth: 200,
    textAlign: "center",
  } as TextStyle,
});
