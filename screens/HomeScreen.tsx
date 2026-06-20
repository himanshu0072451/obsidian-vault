import React, {
  useEffect,
  useCallback,
  useState,
  useRef,
  useMemo,
  memo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
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
import { DecoySetupSheet } from "../components/DecoySetupSheet";
import { MoveFileSheet } from "../components/MoveFileSheet";
import { useAlbums } from "../hooks/useAlbums";

// ─── HomeScreen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { lock, passcode, setupDecoy, hasDecoy, vaultContext } = useAuth();
  const vault = useVault();
  const {
    albums,
    createAlbum,
    renameAlbum,
    deleteAlbum,
    moveFile,
    error: albumError,
    clearError: clearAlbumError,
  } = useAlbums();
  const {
    encryptOp,
    decryptOp,
    pickImages,
    encryptImages,
    captureAndEncrypt,
    resetEncrypt,
    resetDecrypt,
  } = useVaultOperations();

  // Master list — always the full vault contents from disk.
  // Never filtered here; filtering is done in visibleFiles below.
  const [allFiles, setAllFiles] = useState<VaultFile[]>([]);
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
  // Favorites filter — cross-cutting, independent of album selection
  const [showFavorites, setShowFavorites] = useState(false);

  // Album action sheet
  const [sheetMode, setSheetMode] = useState<AlbumActionSheetMode>("create");
  const [sheetTarget, setSheetTarget] = useState<string | undefined>(undefined);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Decoy vault setup sheet
  const [decoySheetVisible, setDecoySheetVisible] = useState(false);

  // Move file sheet
  const [moveSheetVisible, setMoveSheetVisible] = useState(false);
  const [moveSheetFile, setMoveSheetFile] = useState<VaultFile | null>(null);

  // ─── Derived visible list (no I/O — pure in-memory filter) ───────────────

  const visibleFiles = useMemo(() => {
    if (showFavorites) {
      return allFiles.filter((f) => f.isFavorite);
    }
    if (selectedAlbum === undefined) {
      return allFiles; // All
    }
    // null = root only, string = specific album
    return allFiles.filter((f) => f.album === (selectedAlbum ?? null));
  }, [allFiles, showFavorites, selectedAlbum]);

  // ─── Data loading — reads disk only on real mutations, never on filter changes

  const loadFiles = useCallback(async () => {
    // Always fetch the full unfiltered list. Filtering is handled by
    // visibleFiles above so changing selectedAlbum or showFavorites
    // never triggers a disk read.
    const files = await vault.getVaultFiles();
    setAllFiles(files);
  }, [vault]);

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
  }, [pickImages, encryptImages, passcode, selectedAlbum, loadFiles]);

  const handleSecureCamera = useCallback(async () => {
    const captured = await captureAndEncrypt(passcode, selectedAlbum ?? null);
    if (captured) await loadFiles();
  }, [captureAndEncrypt, passcode, selectedAlbum, loadFiles]);

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

  // ─── Favorites ────────────────────────────────────────────────────────────

  const handleToggleFavorite = useCallback(
    async (file: VaultFile) => {
      // Optimistic update — flip isFavorite in allFiles immediately so the
      // star responds instantly with no visible lag.
      setAllFiles((prev) =>
        prev.map((f) =>
          f.uri === file.uri ? { ...f, isFavorite: !f.isFavorite } : f,
        ),
      );
      // Persist to SecureStore in the background. If it fails, the in-memory
      // state is ahead of storage but the next loadFiles() will correct it.
      if (file.isFavorite) {
        await vault.removeFavorite(file.uri);
      } else {
        await vault.addFavorite(file.uri);
      }
    },
    [vault],
  );

  const handleFavoritesChip = useCallback(() => {
    setShowFavorites((prev) => !prev);
    // Clear album selection when switching to favorites view
    setSelectedAlbum(undefined);
  }, []);

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

  const openRenameSheet = useCallback((name: string) => {
    setSheetMode("rename");
    setSheetTarget(name);
    setSheetVisible(true);
  }, []);

  const openDeleteSheet = useCallback((name: string) => {
    setSheetMode("delete");
    setSheetTarget(name);
    setSheetVisible(true);
  }, []);

  const handleSheetConfirm = useCallback(
    async (value: string) => {
      setSheetVisible(false);
      if (sheetMode === "create") {
        await createAlbum(value);
      } else if (sheetMode === "rename" && sheetTarget) {
        const success = await renameAlbum(sheetTarget, value);
        // Keep the filter chip pointing at the renamed album
        if (success && selectedAlbum === sheetTarget) {
          setSelectedAlbum(value);
        }
      } else if (sheetMode === "delete" && sheetTarget) {
        const success = await deleteAlbum(sheetTarget);
        if (success && selectedAlbum === sheetTarget) {
          setSelectedAlbum(undefined);
        }
        // Files were moved to root — reload the full list
        await loadFiles();
      }
    },
    [
      sheetMode,
      sheetTarget,
      createAlbum,
      renameAlbum,
      deleteAlbum,
      selectedAlbum,
      loadFiles,
    ],
  );

  const handleMoveFile = useCallback((file: VaultFile) => {
    setMoveSheetFile(file);
    setMoveSheetVisible(true);
  }, []);

  const handleMoveSelect = useCallback(
    async (targetAlbum: string | null) => {
      setMoveSheetVisible(false);
      if (!moveSheetFile) return;
      const file = moveSheetFile;
      setMoveSheetFile(null);

      // Optimistic update — card reflects new album immediately
      setAllFiles((prev) =>
        prev.map((f) =>
          f.uri === file.uri ? { ...f, album: targetAlbum } : f,
        ),
      );

      try {
        const newUri = await moveFile(file.uri, targetAlbum);
        // Patch URI if it changed (directory prefix changes with album)
        if (newUri && newUri !== file.uri) {
          setAllFiles((prev) =>
            prev.map((f) =>
              f.uri === file.uri
                ? { ...f, uri: newUri, album: targetAlbum }
                : f,
            ),
          );
        }
      } catch {
        // Rollback optimistic update — restore original album and URI
        setAllFiles((prev) =>
          prev.map((f) =>
            f.uri === file.uri ? { ...f, album: file.album, uri: file.uri } : f,
          ),
        );
      }
    },
    [moveSheetFile, moveFile],
  );

  // ─── Decoy vault handlers ─────────────────────────────────────────────────

  const openDecoySetup = useCallback(() => {
    Alert.alert(
      "Set Up Decoy Vault",
      "Create a separate vault with its own passcode. Entering that passcode will open this decoy vault instead of your real one.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Continue", onPress: () => setDecoySheetVisible(true) },
      ],
    );
  }, []);

  const handleDecoyConfirm = useCallback(
    async (newPasscode: string) => {
      setDecoySheetVisible(false);
      await setupDecoy(newPasscode);
    },
    [setupDecoy],
  );

  // ─── Overlay state ────────────────────────────────────────────────────────

  const isShowingProgress =
    encryptOp.status !== "idle" || decryptOp.status !== "idle";
  const activeOp = encryptOp.status !== "idle" ? encryptOp : decryptOp;
  const resetActiveOp =
    encryptOp.status !== "idle" ? resetEncrypt : resetDecrypt;

  // ─── Derived stats ────────────────────────────────────────────────────────

  const totalSize = visibleFiles.reduce((sum, f) => sum + f.size, 0);

  // ─── ListHeaderComponent ──────────────────────────────────────────────────
  // Everything above the file list. Computed inside render so all state and
  // handlers are in scope. The header mounts once and does not participate in
  // FlashList's item recycling, so FadeInDown entering animations are safe here.

  const listHeader = (
    <View style={styles.listHeader}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeInDown.delay(0).duration(400)}
        style={styles.header}
      >
        <View>
          <Text style={styles.greeting}>Vault</Text>
          <Text style={styles.subGreeting}>Your encrypted storage</Text>
        </View>
        <View style={styles.headerActions}>
          {/* Decoy setup — only visible on real vault before a decoy exists */}
          {vaultContext === "real" && !hasDecoy && (
            <Pressable
              onPress={openDecoySetup}
              style={styles.headerBtn}
              accessibilityRole="button"
              accessibilityLabel="More options"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.headerBtnIcon}>⋯</Text>
            </Pressable>
          )}
          <Pressable
            onPress={lock}
            style={styles.lockBtn}
            accessibilityRole="button"
            accessibilityLabel="Lock vault"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.lockIcon}>⎋</Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeInDown.delay(80).duration(400)}
        style={styles.statsRow}
      >
        <StatCard
          value={visibleFiles.length}
          label="Encrypted"
          style={styles.statFlex}
        />
        <StatCard
          value={formatFileSize(totalSize)}
          label="Total size"
          style={styles.statFlex}
        />
      </Animated.View>

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeInDown.delay(160).duration(400)}
        style={styles.actionsCol}
      >
        <ActionCard
          icon="🔒"
          title="Encrypt Images"
          description="Select photos from your library to lock in the vault"
          onPress={handleEncrypt}
        />
        <ActionCard
          icon="📷"
          title="Secure Camera"
          description="Capture a photo and encrypt it immediately"
          onPress={handleSecureCamera}
        />
      </Animated.View>

      {/* ── Album filter ─────────────────────────────────────────────────── */}
      <AlbumFilterBar
        albums={albums}
        selected={selectedAlbum}
        onSelect={(album) => {
          setSelectedAlbum(album);
          setShowFavorites(false);
        }}
        onCreatePress={openCreateSheet}
        showFavorites={showFavorites}
        onFavoritesPress={handleFavoritesChip}
      />

      {/* ── Section header ───────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(240).duration(400)}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Vault Contents</Text>
          {visibleFiles.length > 0 && (
            <Text style={styles.sectionCount}>{visibleFiles.length}</Text>
          )}
          {typeof selectedAlbum === "string" && (
            <>
              <Pressable
                onPress={() => openRenameSheet(selectedAlbum)}
                style={styles.sectionBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Rename album"
              >
                <Text style={styles.sectionBtnText}>Rename</Text>
              </Pressable>
              <Pressable
                onPress={() => openDeleteSheet(selectedAlbum)}
                style={[styles.sectionBtn, styles.sectionBtnDestructive]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Delete album"
              >
                <Text
                  style={[
                    styles.sectionBtnText,
                    styles.sectionBtnTextDestructive,
                  ]}
                >
                  Delete
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </Animated.View>
    </View>
  );

  return (
    <SafeAreaView style={styles.root}>
      <FlashList
        data={visibleFiles}
        keyExtractor={(item) => item.uri}
        estimatedItemSize={80}
        renderItem={({ item }) => (
          <VaultFileCard
            file={item}
            onPress={() => handleDecrypt(item)}
            onDelete={() => handleDelete(item)}
            onToggleFavorite={() => handleToggleFavorite(item)}
            onOpenMoveSheet={() => handleMoveFile(item)}
            albums={albums}
          />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={<EmptyVault />}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        contentContainerStyle={styles.flashContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.silver}
            colors={[Colors.silver]}
          />
        }
      />

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

      {/* ── Decoy vault setup sheet ────────────────────────────────────────── */}
      <DecoySetupSheet
        visible={decoySheetVisible}
        onConfirm={handleDecoyConfirm}
        onCancel={() => setDecoySheetVisible(false)}
      />

      {/* ── Move file sheet ────────────────────────────────────────────────── */}
      <MoveFileSheet
        visible={moveSheetVisible}
        fileName={moveSheetFile?.name.replace(".vault", "") ?? ""}
        currentAlbum={moveSheetFile?.album ?? null}
        albums={albums}
        onSelect={handleMoveSelect}
        onCancel={() => {
          setMoveSheetVisible(false);
          setMoveSheetFile(null);
        }}
      />
    </SafeAreaView>
  );
}

// ─── VaultFileCard ────────────────────────────────────────────────────────────

interface VaultFileCardProps {
  file: VaultFile;
  // index removed — was used only for FadeInDown stagger delay, which
  // re-fires on every FlashList view recycle and breaks mid-scroll visibility
  onPress: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  /** Opens the MoveFileSheet for this file. */
  onOpenMoveSheet: () => void;
  albums: string[];
}

const VaultFileCard = memo(function VaultFileCard({
  file,
  onPress,
  onDelete,
  onToggleFavorite,
  onOpenMoveSheet,
  albums,
}: VaultFileCardProps) {
  const scale = useSharedValue(1);
  const deleteScale = useSharedValue(1);
  const starScale = useSharedValue(1);

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const deleteAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: deleteScale.value }],
  }));

  const starAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: starScale.value }],
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

  const handleStarPress = useCallback(() => {
    starScale.value = withSequence(
      withSpring(1.3, { damping: 12, stiffness: 300 }),
      withSpring(1, { damping: 15, stiffness: 300 }),
    );
    onToggleFavorite();
  }, [onToggleFavorite]);

  // Show the move button only when there is something to move to
  const hasMoveOptions = albums.length > 0 || file.album !== null;

  return (
    // No entering= prop: Reanimated entering animations re-fire on FlashList
    // view recycling. With index-based stagger, recycled items would be
    // invisible for seconds when scrolled back into view.
    <Animated.View style={cardAnimStyle}>
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

          {/* Right: move + star + delete + chevron */}
          <View style={styles.fileActions}>
            {hasMoveOptions && (
              <Pressable
                onPress={onOpenMoveSheet}
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                accessibilityRole="button"
                accessibilityLabel="Move to album"
                style={styles.moveBtn}
              >
                <Text style={styles.moveBtnIcon}>⋯</Text>
              </Pressable>
            )}
            <Animated.View style={starAnimStyle}>
              <Pressable
                onPress={handleStarPress}
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                accessibilityRole="button"
                accessibilityLabel={
                  file.isFavorite ? "Remove from favorites" : "Add to favorites"
                }
                style={styles.starBtn}
              >
                <Text
                  style={[
                    styles.starIcon,
                    file.isFavorite && styles.starIconActive,
                  ]}
                >
                  ★
                </Text>
              </Pressable>
            </Animated.View>
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

  // FlashList container padding — horizontal insets apply to header and items
  flashContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  } as ViewStyle,

  // ListHeaderComponent wrapper — vertical spacing and section gaps
  listHeader: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.lg,
  } as ViewStyle,

  // Separator between file cards — replaces the gap on the old fileList View
  itemSeparator: {
    height: Spacing.sm,
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  } as ViewStyle,
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  headerBtnIcon: {
    fontSize: 18,
    color: Colors.textSecondary,
    letterSpacing: 1,
  } as TextStyle,

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  } as ViewStyle,
  statFlex: {
    flex: 1,
  } as ViewStyle,

  // Action cards column
  actionsCol: {
    gap: Spacing.md,
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

  // Section header row
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
  sectionBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  } as ViewStyle,
  sectionBtnDestructive: {
    borderColor: Colors.gray,
  } as ViewStyle,
  sectionBtnText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
    letterSpacing: Typography.wide,
  } as TextStyle,
  sectionBtnTextDestructive: {
    color: Colors.lightGray,
  } as TextStyle,

  // File card
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
  moveBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    backgroundColor: Colors.midDark,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  moveBtnIcon: {
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: 1,
    lineHeight: 14,
  } as TextStyle,
  starBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  starIcon: {
    fontSize: 16,
    color: Colors.textMuted,
  } as TextStyle,
  starIconActive: {
    color: Colors.silver,
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
