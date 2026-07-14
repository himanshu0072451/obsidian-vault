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
  ScrollView,
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
import { Card, HeroStat } from "../components/Card";
import type { VaultFile } from "../services/storage";
import { decryptImage } from "../services/encryption";
import * as FileSystem from "expo-file-system";
import ImageViewer from "../components/ImageViewer";
import { AlbumFilterBar } from "../components/AlbumFilterBar";
import { AlbumActionSheet } from "../components/AlbumActionSheet";
import type { AlbumActionSheetMode } from "../components/AlbumActionSheet";
import { DecoySetupSheet } from "../components/DecoySetupSheet";
import { MoveFileSheet } from "../components/MoveFileSheet";
import { TagSheet } from "../components/TagSheet";
import { FileDetailsSheet } from "../components/FileDetailsSheet";
import { useAlbums } from "../hooks/useAlbums";

// ─── ListHeader props ─────────────────────────────────────────────────────────
// Defined outside HomeScreen so the reference is stable across re-renders.
// Passing a JSX variable to FlashList ListHeaderComponent causes the header
// to remount on every parent re-render, re-firing all entering animations and
// disrupting modal presentation on Android.

interface ListHeaderProps {
  visibleFiles: VaultFile[];
  totalSize: number;
  vaultContext: string | null;
  hasDecoy: boolean;
  albums: string[];
  selectedAlbum: string | null | undefined;
  showFavorites: boolean;
  allTags: string[];
  selectedTags: Set<string>;
  onDecoySetup: () => void;
  onLock: () => void;
  onEncrypt: () => void;
  onSecureCamera: () => void;
  onSelectAlbum: (album: string | null | undefined) => void;
  onCreateAlbum: () => void;
  onFavoritesPress: () => void;
  onRenameAlbum: (name: string) => void;
  onDeleteAlbum: (name: string) => void;
  onTagChipPress: (tag: string) => void;
  onOpenSettings: () => void;
  viewMode: "list" | "grid";
  onSetViewMode: (mode: "list" | "grid") => void;
}

const ListHeader = memo(function ListHeader({
  visibleFiles,
  totalSize,
  vaultContext,
  hasDecoy,
  albums,
  selectedAlbum,
  showFavorites,
  allTags,
  selectedTags,
  onDecoySetup,
  onLock,
  onEncrypt,
  onSecureCamera,
  onSelectAlbum,
  onCreateAlbum,
  onFavoritesPress,
  onRenameAlbum,
  onDeleteAlbum,
  onTagChipPress,
  onOpenSettings,
  viewMode,
  onSetViewMode,
}: ListHeaderProps) {
  return (
    <View style={styles.listHeader}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeInDown.delay(0).duration(400)}
        style={styles.header}
      >
        <View>
          <Text style={styles.greeting}>Vault</Text>
          <Text style={styles.subGreeting}>Your encrypted storage</Text>
        </View>
        <View style={styles.headerActions}>
          {vaultContext === "real" && (
            <Pressable
              onPress={onOpenSettings}
              style={styles.headerBtn}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.headerBtnIcon}>⚙</Text>
            </Pressable>
          )}
          {vaultContext === "real" && !hasDecoy && (
            <Pressable
              onPress={onDecoySetup}
              style={styles.headerBtn}
              accessibilityRole="button"
              accessibilityLabel="More options"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.headerBtnIcon}>⋯</Text>
            </Pressable>
          )}
          <Pressable
            onPress={onLock}
            style={styles.lockBtn}
            accessibilityRole="button"
            accessibilityLabel="Lock vault"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.lockIcon}>⎋</Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* ── Hero stat ────────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(80).duration(400)}>
        <HeroStat
          eyebrow="Total Files"
          value={visibleFiles.length}
          caption={`${formatFileSize(totalSize)} encrypted on this device`}
        />
      </Animated.View>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeInDown.delay(160).duration(400)}
        style={styles.actionsRow}
      >
        <PrimaryAction
          icon="+"
          title="Import Images"
          description="Encrypt photos from your library"
          onPress={onEncrypt}
        />
        <SecondaryAction
          title="Capture"
          onPress={onSecureCamera}
        />
      </Animated.View>

      {/* ── Album filter ─────────────────────────────────────────────────── */}
      <AlbumFilterBar
        albums={albums}
        selected={selectedAlbum}
        onSelect={onSelectAlbum}
        onCreatePress={onCreateAlbum}
        showFavorites={showFavorites}
        onFavoritesPress={onFavoritesPress}
      />

      {/* ── Tag filter — V1: OR across selected tags ─────────────────────── */}
      {allTags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagFilterRow}
        >
          {allTags.map((tag) => {
            const active = selectedTags.has(tag);
            return (
              <Pressable
                key={tag}
                onPress={() => onTagChipPress(tag)}
                style={[styles.tagChip, active && styles.tagChipActive]}
                accessibilityRole="button"
                accessibilityLabel={`Filter by tag ${tag}`}
              >
                <Text
                  style={[
                    styles.tagChipText,
                    active && styles.tagChipTextActive,
                  ]}
                >
                  #{tag}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* ── Section header ───────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(240).duration(400)}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderTop}>
            <Text style={styles.sectionTitle}>Vault Contents</Text>
            <View style={styles.sectionRule} />
            {visibleFiles.length > 0 && (
              <Text style={styles.sectionCount}>{visibleFiles.length}</Text>
            )}
            <ViewModeToggle mode={viewMode} onChange={onSetViewMode} />
          </View>
          {typeof selectedAlbum === "string" && (
            <View style={styles.sectionAlbumActions}>
              <Pressable
                onPress={() => onRenameAlbum(selectedAlbum)}
                style={styles.sectionBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Rename album"
              >
                <Text style={styles.sectionBtnText}>Rename</Text>
              </Pressable>
              <Pressable
                onPress={() => onDeleteAlbum(selectedAlbum)}
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
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
});

// ─── ViewModeToggle ─────────────────────────────────────────────────────────
// Compact segmented control. Icons are built from plain Views (matching the
// shutter-ring approach used for the Capture action) rather than a text
// glyph or icon font, so they render identically across devices.

interface ViewModeToggleProps {
  mode: "list" | "grid";
  onChange: (mode: "list" | "grid") => void;
}

const ViewModeToggle = memo(function ViewModeToggle({
  mode,
  onChange,
}: ViewModeToggleProps) {
  return (
    <View style={styles.viewToggle}>
      <Pressable
        onPress={() => onChange("list")}
        style={[
          styles.viewToggleBtn,
          mode === "list" && styles.viewToggleBtnActive,
        ]}
        accessibilityRole="button"
        accessibilityLabel="List view"
        accessibilityState={{ selected: mode === "list" }}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <View style={styles.listIconCol}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.listIconBar,
                mode === "list" && styles.listIconBarActive,
              ]}
            />
          ))}
        </View>
      </Pressable>
      <Pressable
        onPress={() => onChange("grid")}
        style={[
          styles.viewToggleBtn,
          mode === "grid" && styles.viewToggleBtnActive,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Grid view"
        accessibilityState={{ selected: mode === "grid" }}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <View style={styles.gridIconGrid}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.gridIconCell,
                mode === "grid" && styles.gridIconCellActive,
              ]}
            />
          ))}
        </View>
      </Pressable>
    </View>
  );
});

// ─── HomeScreen ───────────────────────────────────────────────────────────────

interface HomeScreenProps {
  onOpenSettings: () => void;
  indexRebuildKey: number;
}

export default function HomeScreen({
  onOpenSettings,
  indexRebuildKey,
}: HomeScreenProps) {
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

  const [allFiles, setAllFiles] = useState<VaultFile[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptingFileName, setDecryptingFileName] = useState<string | null>(
    null,
  );
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  const activeTempUri = useRef<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null | undefined>(
    undefined,
  );
  const [showFavorites, setShowFavorites] = useState(false);
  const [sheetMode, setSheetMode] = useState<AlbumActionSheetMode>("create");
  const [sheetTarget, setSheetTarget] = useState<string | undefined>(undefined);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [decoySheetVisible, setDecoySheetVisible] = useState(false);
  const [moveSheetVisible, setMoveSheetVisible] = useState(false);
  const [moveSheetFile, setMoveSheetFile] = useState<VaultFile | null>(null);

  // Multi-select
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedUris, setSelectedUris] = useState<Set<string>>(new Set());

  // Tags — V1: OR filter across selected tags, no AND mode, no global rename/delete
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [tagSheetVisible, setTagSheetVisible] = useState(false);
  const [tagSheetFile, setTagSheetFile] = useState<VaultFile | null>(null);
  const [detailsFile, setDetailsFile] = useState<VaultFile | null>(null);

  // ─── Derived visible list ─────────────────────────────────────────────────

  const visibleFiles = useMemo(() => {
    let result = allFiles;
    if (showFavorites) result = result.filter((f) => f.isFavorite);
    if (selectedAlbum !== undefined) {
      result = result.filter((f) => f.album === (selectedAlbum ?? null));
    }
    if (selectedTags.size > 0) {
      result = result.filter((f) => f.tags.some((t) => selectedTags.has(t)));
    }
    return result;
  }, [allFiles, showFavorites, selectedAlbum, selectedTags]);

  const allTags = useMemo(() => {
    const distinct = new Set<string>();
    for (const file of allFiles) {
      for (const tag of file.tags) distinct.add(tag);
    }
    return [...distinct].sort((a, b) => a.localeCompare(b));
  }, [allFiles]);

  // ─── Data loading ─────────────────────────────────────────────────────────

  const loadFiles = useCallback(async () => {
    const files = await vault.getVaultFiles();
    setAllFiles(files);
  }, [vault]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles, indexRebuildKey]);

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
        setDecryptingFileName(
          file.displayName ?? file.name.replace(".vault", ""),
        );
        const outPath = await decryptImage(
          file.uri,
          passcode,
          FileSystem.cacheDirectory!,
        );
        activeTempUri.current = outPath;
        setPreviewFileName(file.displayName ?? file.name.replace(".vault", ""));
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
        `Permanently delete "${file.displayName ?? file.name.replace(".vault", "")}"?\n\nThis cannot be undone.`,
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
      setAllFiles((prev) =>
        prev.map((f) =>
          f.uri === file.uri ? { ...f, isFavorite: !f.isFavorite } : f,
        ),
      );
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
    setSelectedAlbum(undefined);
  }, []);

  // ─── Album error ─────────────────────────────────────────────────────────

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
        if (success && selectedAlbum === sheetTarget) {
          setSelectedAlbum(value);
        }
        await loadFiles(); // ADD THIS
      } else if (sheetMode === "delete" && sheetTarget) {
        const success = await deleteAlbum(sheetTarget);
        if (success && selectedAlbum === sheetTarget)
          setSelectedAlbum(undefined);
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

  // ─── Move file ────────────────────────────────────────────────────────────

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
      setAllFiles((prev) =>
        prev.map((f) =>
          f.uri === file.uri ? { ...f, album: targetAlbum } : f,
        ),
      );
      try {
        const newUri = await moveFile(file.uri, targetAlbum);
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
        setAllFiles((prev) =>
          prev.map((f) =>
            f.uri === file.uri ? { ...f, album: file.album, uri: file.uri } : f,
          ),
        );
      }
    },
    [moveSheetFile, moveFile],
  );

  // ─── Tags ─────────────────────────────────────────────────────────────────

  const handleOpenTagSheet = useCallback((file: VaultFile) => {
    setTagSheetFile(file);
    setTagSheetVisible(true);
  }, []);

  const openBatchTagSheet = useCallback(() => {
    setTagSheetFile(null);
    setTagSheetVisible(true);
  }, []);

  const handleAddTag = useCallback(
    async (tag: string) => {
      if (tagSheetFile) {
        const file = tagSheetFile;
        await vault.addTag(file.uri, tag);
        const updated = await vault.getVaultFiles();
        const fresh = updated.find((f) => f.uri === file.uri);
        if (fresh) {
          setAllFiles((prev) =>
            prev.map((f) => (f.uri === file.uri ? fresh : f)),
          );
          setTagSheetFile(fresh);
        }
      } else {
        for (const uri of selectedUris) {
          await vault.addTag(uri, tag);
        }
        await loadFiles();
      }
    },
    [tagSheetFile, selectedUris, vault, loadFiles],
  );

  const handleRemoveTag = useCallback(
    async (tag: string) => {
      if (!tagSheetFile) return;
      const file = tagSheetFile;
      await vault.removeTag(file.uri, tag);
      const updatedTags = file.tags.filter((t) => t !== tag);
      const fresh = { ...file, tags: updatedTags };
      setAllFiles((prev) => prev.map((f) => (f.uri === file.uri ? fresh : f)));
      setTagSheetFile(fresh);
    },
    [tagSheetFile, vault],
  );

  const handleTagSheetDone = useCallback(() => {
    setTagSheetVisible(false);
    setTagSheetFile(null);
    if (!tagSheetFile) {
      setSelectionMode(false);
      setSelectedUris(new Set());
    }
  }, [tagSheetFile]);

  const handleTagChipPress = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }, []);

  const handleOpenDetails = useCallback((file: VaultFile) => {
    setDetailsFile(file);
  }, []);

  // ─── Multi-select ─────────────────────────────────────────────────────────

  // Clear selection whenever the visible filter changes — acting on
  // hidden items would be surprising and is never the user's intent.
  useEffect(() => {
    setSelectionMode(false);
    setSelectedUris(new Set());
  }, [selectedAlbum, showFavorites, selectedTags]);

  const handleEnterSelection = useCallback((uri: string) => {
    setSelectionMode(true);
    setSelectedUris(new Set([uri]));
  }, []);

  const handleToggleSelection = useCallback((uri: string) => {
    setSelectedUris((prev) => {
      const next = new Set(prev);
      if (next.has(uri)) {
        next.delete(uri);
      } else {
        next.add(uri);
      }
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  }, []);

  const handleCancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedUris(new Set());
  }, []);

  // Toggles between selecting every currently visible file and clearing
  // the selection. "All visible" respects whatever filter is active
  // (album / favorites) — visibleFiles already encodes that filter.
  const allVisibleSelected =
    visibleFiles.length > 0 &&
    visibleFiles.every((f) => selectedUris.has(f.uri));

  const handleSelectAll = useCallback(() => {
    if (allVisibleSelected) {
      setSelectedUris(new Set());
      setSelectionMode(false);
    } else {
      setSelectedUris(new Set(visibleFiles.map((f) => f.uri)));
      setSelectionMode(true);
    }
  }, [allVisibleSelected, visibleFiles]);

  const selectedFiles = useMemo(
    () => allFiles.filter((f) => selectedUris.has(f.uri)),
    [allFiles, selectedUris],
  );

  const handleBatchDelete = useCallback(() => {
    const count = selectedFiles.length;
    if (count === 0) return;
    Alert.alert(
      "Delete Encrypted Files",
      `Permanently delete ${count} file${count === 1 ? "" : "s"}?\n\nThis cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Sequential — matches the proven pattern from batch encrypt;
              // avoids concurrent index read-modify-write races.
              for (const file of selectedFiles) {
                await vault.deleteVaultFile(file.uri);
              }
            } catch (e) {
              console.error("[BatchDelete]", e);
            } finally {
              // Always clear selection and resync from storage, regardless
              // of whether every file in the loop succeeded — prevents the
              // selection bar from being stuck open on partial failure.
              setSelectionMode(false);
              setSelectedUris(new Set());
              await loadFiles();
            }
          },
        },
      ],
    );
  }, [selectedFiles, loadFiles]);

  const handleBatchFavorite = useCallback(async () => {
    const allFavorited = selectedFiles.every((f) => f.isFavorite);
    const succeeded: string[] = [];

    try {
      for (const file of selectedFiles) {
        if (allFavorited) {
          if (file.isFavorite) await vault.removeFavorite(file.uri);
        } else {
          if (!file.isFavorite) await vault.addFavorite(file.uri);
        }
        succeeded.push(file.uri);
      }
      // Only reached if every file in the loop succeeded — safe to
      // optimistically update all of them at once.
      setAllFiles((prev) =>
        prev.map((f) =>
          selectedUris.has(f.uri) ? { ...f, isFavorite: !allFavorited } : f,
        ),
      );
    } catch (e) {
      console.error("[BatchFavorite]", e);
      // A storage write failed partway through. `succeeded` holds the
      // URIs that were actually written; the rest were never persisted.
      // Resync from storage rather than guessing which UI state is correct —
      // this guarantees the displayed favorite state always matches what
      // was actually written, never showing a favorite that failed to save.
      await loadFiles();
    } finally {
      setSelectionMode(false);
      setSelectedUris(new Set());
    }
  }, [selectedFiles, selectedUris, loadFiles]);

  const openBatchMoveSheet = useCallback(() => {
    setMoveSheetVisible(true);
  }, []);

  const handleBatchMoveSelect = useCallback(
    async (targetAlbum: string | null) => {
      setMoveSheetVisible(false);
      const files = selectedFiles;
      setSelectionMode(false);
      setSelectedUris(new Set());

      setAllFiles((prev) =>
        prev.map((f) =>
          selectedUris.has(f.uri) ? { ...f, album: targetAlbum } : f,
        ),
      );

      for (const file of files) {
        try {
          const newUri = await moveFile(file.uri, targetAlbum);
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
          setAllFiles((prev) =>
            prev.map((f) =>
              f.uri === file.uri
                ? { ...f, album: file.album, uri: file.uri }
                : f,
            ),
          );
        }
      }
    },
    [selectedFiles, selectedUris, moveFile],
  );

  // True when every selected file shares the same album — passed to
  // MoveFileSheet as currentAlbum so its destination list excludes it,
  // matching single-file move semantics exactly.
  const batchCurrentAlbum = useMemo(() => {
    if (selectedFiles.length === 0) return null;
    const first = selectedFiles[0].album;
    return selectedFiles.every((f) => f.album === first) ? first : null;
  }, [selectedFiles]);

  // ─── Decoy vault ─────────────────────────────────────────────────────────

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

  // ─── Stable album selection handler for ListHeader ────────────────────────
  // Defined here and passed as prop so ListHeader doesn't need inline arrows

  const handleSelectAlbum = useCallback((album: string | null | undefined) => {
    setSelectedAlbum(album);
    setShowFavorites(false);
  }, []);

  // ─── Overlay state ────────────────────────────────────────────────────────

  const isShowingProgress =
    encryptOp.status !== "idle" || decryptOp.status !== "idle";
  const activeOp = encryptOp.status !== "idle" ? encryptOp : decryptOp;
  const resetActiveOp =
    encryptOp.status !== "idle" ? resetEncrypt : resetDecrypt;
  const totalSize = useMemo(
    () => visibleFiles.reduce((sum, f) => sum + f.size, 0),
    [visibleFiles],
  );

  // ─── Stable renderItem ────────────────────────────────────────────────────
  // Defined as useCallback, not an inline arrow in JSX. Inline arrows
  // recreate onPress/onDelete/etc. closures every render, defeating
  // VaultFileCard's memo on every single row regardless of what changed.
  // Handlers below are stable refs; VaultFileCard takes `file` + `isSelected`
  // and resolves them internally, so memo correctly skips unrelated rows.

  const renderVaultFileCard = useCallback(
    ({ item }: { item: VaultFile }) =>
      viewMode === "grid" ? (
        <GridFileCard
          file={item}
          isSelected={selectedUris.has(item.uri)}
          selectionMode={selectionMode}
          onPress={handleDecrypt}
          onLongPress={handleEnterSelection}
          onToggleSelect={handleToggleSelection}
        />
      ) : (
        <VaultFileCard
          file={item}
          isSelected={selectedUris.has(item.uri)}
          selectionMode={selectionMode}
          onPress={handleDecrypt}
          onLongPress={handleEnterSelection}
          onToggleSelect={handleToggleSelection}
          onDelete={handleDelete}
          onToggleFavorite={handleToggleFavorite}
          onOpenMoveSheet={handleMoveFile}
          onOpenTagSheet={handleOpenTagSheet}
          onOpenDetails={handleOpenDetails}
          albums={albums}
        />
      ),
    [
      viewMode,
      selectedUris,
      selectionMode,
      handleDecrypt,
      handleEnterSelection,
      handleToggleSelection,
      handleDelete,
      handleToggleFavorite,
      handleMoveFile,
      handleOpenTagSheet,
      handleOpenDetails,
      albums,
    ],
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root}>
      <FlashList
        key={viewMode}
        data={visibleFiles}
        keyExtractor={(item) => item.uri}
        estimatedItemSize={viewMode === "grid" ? 120 : 80}
        numColumns={viewMode === "grid" ? 3 : 1}
        renderItem={renderVaultFileCard}
        extraData={`${selectionMode}-${selectedUris.size}`}
        // KEY FIX: ListHeaderComponent receives a component (ListHeader),
        // not a pre-rendered JSX variable. A JSX variable creates a new
        // object on every HomeScreen render, causing FlashList to remount
        // the header, re-fire all FadeInDown entering animations, and
        // trigger a full layout pass that disrupts Modal presentation on Android.
        ListHeaderComponent={
          <ListHeader
            visibleFiles={visibleFiles}
            totalSize={totalSize}
            vaultContext={vaultContext}
            hasDecoy={hasDecoy}
            albums={albums}
            selectedAlbum={selectedAlbum}
            showFavorites={showFavorites}
            allTags={allTags}
            selectedTags={selectedTags}
            onDecoySetup={openDecoySetup}
            onLock={lock}
            onEncrypt={handleEncrypt}
            onSecureCamera={handleSecureCamera}
            onSelectAlbum={handleSelectAlbum}
            onCreateAlbum={openCreateSheet}
            onFavoritesPress={handleFavoritesChip}
            onRenameAlbum={openRenameSheet}
            onDeleteAlbum={openDeleteSheet}
            onTagChipPress={handleTagChipPress}
            onOpenSettings={onOpenSettings}
            viewMode={viewMode}
            onSetViewMode={setViewMode}
          />
        }
        ListEmptyComponent={<EmptyVault />}
        ItemSeparatorComponent={
          viewMode === "list"
            ? () => <View style={styles.itemSeparator} />
            : undefined
        }
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

      {/* ── Selection action bar ──────────────────────────────────────────── */}
      {selectionMode && (
        <SelectionActionBar
          count={selectedUris.size}
          allSelected={allVisibleSelected}
          onCancel={handleCancelSelection}
          onSelectAll={handleSelectAll}
          onDelete={handleBatchDelete}
          onFavorite={handleBatchFavorite}
          onMove={openBatchMoveSheet}
          onTag={openBatchTagSheet}
        />
      )}

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

      {/* ── Move file sheet — handles both single-file and batch move ───────── */}
      <MoveFileSheet
        visible={moveSheetVisible}
        fileName={
          moveSheetFile
            ? (moveSheetFile.displayName ??
              moveSheetFile.name.replace(".vault", ""))
            : `${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"}`
        }
        currentAlbum={moveSheetFile ? moveSheetFile.album : batchCurrentAlbum}
        albums={albums}
        onSelect={moveSheetFile ? handleMoveSelect : handleBatchMoveSelect}
        onCancel={() => {
          setMoveSheetVisible(false);
          setMoveSheetFile(null);
        }}
      />

      <TagSheet
        visible={tagSheetVisible}
        targetLabel={
          tagSheetFile
            ? (tagSheetFile.displayName ??
              tagSheetFile.name.replace(".vault", ""))
            : `${selectedUris.size} file${selectedUris.size === 1 ? "" : "s"}`
        }
        currentTags={tagSheetFile?.tags ?? []}
        existingTags={allTags}
        onAddTag={handleAddTag}
        onRemoveTag={tagSheetFile ? handleRemoveTag : undefined}
        onDone={handleTagSheetDone}
      />
      <FileDetailsSheet
        visible={detailsFile !== null}
        file={detailsFile}
        onClose={() => setDetailsFile(null)}
      />
    </SafeAreaView>
  );
}

// ─── VaultFileCard ────────────────────────────────────────────────────────────

interface VaultFileCardProps {
  file: VaultFile;
  isSelected: boolean;
  selectionMode: boolean;
  onPress: (file: VaultFile) => void;
  onLongPress: (uri: string) => void;
  onToggleSelect: (uri: string) => void;
  onDelete: (file: VaultFile) => void;
  onToggleFavorite: (file: VaultFile) => void;
  onOpenMoveSheet: (file: VaultFile) => void;
  onOpenTagSheet: (file: VaultFile) => void;
  onOpenDetails: (file: VaultFile) => void;
  albums: string[];
}

const VaultFileCard = memo(function VaultFileCard({
  file,
  isSelected,
  selectionMode,
  onPress,
  onLongPress,
  onToggleSelect,
  onDelete,
  onToggleFavorite,
  onOpenMoveSheet,
  onOpenTagSheet,
  onOpenDetails,
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
    setTimeout(() => onDelete(file), 100);
  }, [onDelete, file]);

  const handleStarPress = useCallback(() => {
    starScale.value = withSequence(
      withSpring(1.3, { damping: 12, stiffness: 300 }),
      withSpring(1, { damping: 15, stiffness: 300 }),
    );
    onToggleFavorite(file);
  }, [onToggleFavorite, file]);

  const handleCardPress = useCallback(() => {
    if (selectionMode) {
      onToggleSelect(file.uri);
    } else {
      onPress(file);
    }
  }, [selectionMode, onToggleSelect, onPress, file]);

  const handleCardLongPress = useCallback(() => {
    if (!selectionMode) onLongPress(file.uri);
  }, [selectionMode, onLongPress, file.uri]);

  const hasMoveOptions = albums.length > 0 || file.album !== null;

  return (
    <Animated.View style={cardAnimStyle}>
      <Pressable
        onPress={handleCardPress}
        onLongPress={handleCardLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`Decrypt and preview ${file.displayName ?? file.name.replace(".vault", "")}`}
      >
        <View style={[styles.fileCard, isSelected && styles.fileCardSelected]}>
          <View style={styles.fileLeft}>
            {selectionMode ? (
              <View
                style={[styles.checkbox, isSelected && styles.checkboxSelected]}
              >
                {isSelected && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
            ) : (
              <View style={styles.fileIconWrap}>
                <Text style={styles.fileIconText}>⬡</Text>
              </View>
            )}
            <View style={styles.fileMeta}>
              <Text style={styles.fileName} numberOfLines={1}>
                {file.displayName ?? file.name.replace(".vault", "")}
              </Text>
              <Text style={styles.fileDetail}>
                {formatFileSize(file.size)}
                {"  ·  "}
                {formatRelativeTime(file.createdAt * 1000)}
              </Text>
              {file.tags.length > 0 && (
                <View style={styles.fileTagRow}>
                  {file.tags.slice(0, 3).map((tag) => (
                    <View key={tag} style={styles.fileTagChip}>
                      <Text style={styles.fileTagChipText} numberOfLines={1}>
                        #{tag}
                      </Text>
                    </View>
                  ))}
                  {file.tags.length > 3 && (
                    <View style={styles.fileTagChip}>
                      <Text style={styles.fileTagChipText}>
                        +{file.tags.length - 3}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Per-file actions hidden during selection mode — these become
              batch actions in the SelectionActionBar instead. */}
          {!selectionMode && (
            <View style={styles.fileActions}>
              <Pressable
                onPress={() => onOpenTagSheet(file)}
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                accessibilityRole="button"
                accessibilityLabel="Add tags"
                style={[
                  styles.tagBtn,
                  file.tags.length > 0 && styles.tagBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.tagBtnIcon,
                    file.tags.length > 0 && styles.tagBtnIconActive,
                  ]}
                >
                  #
                </Text>
              </Pressable>
              {hasMoveOptions && (
                <Pressable
                  onPress={() => onOpenMoveSheet(file)}
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
                    file.isFavorite
                      ? "Remove from favorites"
                      : "Add to favorites"
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
                  accessibilityLabel={`Delete ${file.displayName ?? file.name.replace(".vault", "")}`}
                  style={styles.deleteBtn}
                >
                  <Text style={styles.deleteIcon}>✕</Text>
                </Pressable>
              </Animated.View>
              <Pressable
                onPress={() => onOpenDetails(file)}
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                accessibilityRole="button"
                accessibilityLabel="View file details"
              >
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
});

// ─── GridFileCard ────────────────────────────────────────────────────────────
// Compact square tile for grid view. Same tap/long-press/select semantics as
// VaultFileCard (decrypt-preview, enter selection, toggle selection) — the
// per-file tag/move/delete/details controls aren't shown inline here (no
// room in a tile this size); they stay reachable by selecting the file and
// using the existing SelectionActionBar, same as multi-select in list view.

interface GridFileCardProps {
  file: VaultFile;
  isSelected: boolean;
  selectionMode: boolean;
  onPress: (file: VaultFile) => void;
  onLongPress: (uri: string) => void;
  onToggleSelect: (uri: string) => void;
}

const GridFileCard = memo(function GridFileCard({
  file,
  isSelected,
  selectionMode,
  onPress,
  onLongPress,
  onToggleSelect,
}: GridFileCardProps) {
  const scale = useSharedValue(1);
  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 20, stiffness: 300 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  }, []);

  const handleCardPress = useCallback(() => {
    if (selectionMode) {
      onToggleSelect(file.uri);
    } else {
      onPress(file);
    }
  }, [selectionMode, onToggleSelect, onPress, file]);

  const handleCardLongPress = useCallback(() => {
    if (!selectionMode) onLongPress(file.uri);
  }, [selectionMode, onLongPress, file.uri]);

  const displayName = file.displayName ?? file.name.replace(".vault", "");

  return (
    <Animated.View style={[styles.gridTileWrap, cardAnimStyle]}>
      <Pressable
        onPress={handleCardPress}
        onLongPress={handleCardLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`Decrypt and preview ${displayName}`}
        style={[styles.gridTile, isSelected && styles.gridTileSelected]}
      >
        {file.isFavorite && (
          <View style={styles.gridFavoriteBadge}>
            <Text style={styles.gridFavoriteIcon}>★</Text>
          </View>
        )}
        {selectionMode && (
          <View
            style={[
              styles.gridCheckbox,
              isSelected && styles.gridCheckboxSelected,
            ]}
          >
            {isSelected && <Text style={styles.checkboxMark}>✓</Text>}
          </View>
        )}
        <View style={styles.gridIconWrap}>
          <Text style={styles.fileIconText}>⬡</Text>
        </View>
        <Text style={styles.gridFileName} numberOfLines={1}>
          {displayName}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

// ─── SelectionActionBar ─────────────────────────────────────────────────────

interface SelectionActionBarProps {
  count: number;
  allSelected: boolean;
  onCancel: () => void;
  onSelectAll: () => void;
  onDelete: () => void;
  onFavorite: () => void;
  onMove: () => void;
  onTag: () => void;
}

const SelectionActionBar = memo(function SelectionActionBar({
  count,
  allSelected,
  onCancel,
  onSelectAll,
  onDelete,
  onFavorite,
  onMove,
  onTag,
}: SelectionActionBarProps) {
  return (
    <Animated.View entering={FadeIn.duration(150)} style={styles.selectionBar}>
      <Pressable
        onPress={onCancel}
        style={styles.selectionCancelBtn}
        accessibilityRole="button"
        accessibilityLabel="Cancel selection"
      >
        <Text style={styles.selectionCancelText}>✕</Text>
      </Pressable>

      <Pressable
        onPress={onSelectAll}
        style={styles.selectAllBtn}
        accessibilityRole="button"
        accessibilityLabel={
          allSelected ? "Clear selection" : "Select all visible files"
        }
      >
        <Text style={styles.selectAllText}>
          {allSelected ? "Clear" : "All"}
        </Text>
      </Pressable>

      <Text style={styles.selectionCount} numberOfLines={1}>
        {count} selected
      </Text>

      <View style={styles.selectionActions}>
        <Pressable
          onPress={onTag}
          style={styles.selectionActionBtn}
          accessibilityRole="button"
          accessibilityLabel="Add tags to selected files"
        >
          <Text style={styles.selectionActionIcon}>#</Text>
        </Pressable>
        <Pressable
          onPress={onFavorite}
          style={styles.selectionActionBtn}
          accessibilityRole="button"
          accessibilityLabel="Toggle favorite for selected files"
        >
          <Text style={styles.selectionActionIcon}>★</Text>
        </Pressable>
        <Pressable
          onPress={onMove}
          style={styles.selectionActionBtn}
          accessibilityRole="button"
          accessibilityLabel="Move selected files"
        >
          <Text style={styles.selectionActionIcon}>⋯</Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          style={[
            styles.selectionActionBtn,
            styles.selectionActionBtnDestructive,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Delete selected files"
        >
          <Text style={styles.selectionActionIconDestructive}>✕</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
});

// ─── PrimaryAction / SecondaryAction ────────────────────────────────────────
// Import is the dominant, most-used action — rendered as a solid tonal
// button. Capture is the quieter, occasional action — a compact outline
// tile beside it. Distinct shapes give the pair a clear hierarchy instead
// of two identical rows.

interface PrimaryActionProps {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
}

const PrimaryAction = memo(function PrimaryAction({
  icon,
  title,
  description,
  onPress,
}: PrimaryActionProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animStyle, styles.primaryActionFlex]}>
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
        style={styles.primaryAction}
      >
        <View style={styles.primaryActionIconWrap}>
          <Text style={styles.primaryActionIcon}>{icon}</Text>
        </View>
        <View style={styles.actionText}>
          <Text style={styles.primaryActionTitle}>{title}</Text>
          <Text style={styles.primaryActionDesc}>{description}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});

interface SecondaryActionProps {
  title: string;
  onPress: () => void;
}

// Shutter-ring motif — a plain nested-View camera glyph instead of a text
// character, so the tap target reads as "camera" at a glance and the inner
// dot has something to physically compress into on press.
const SecondaryAction = memo(function SecondaryAction({
  title,
  onPress,
}: SecondaryActionProps) {
  const scale = useSharedValue(1);
  const dotScale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const dotAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 20, stiffness: 300 });
    dotScale.value = withTiming(0.55, { duration: 90 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    dotScale.value = withSpring(1, { damping: 10, stiffness: 260 });
  }, []);

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={styles.secondaryAction}
      >
        <View style={styles.shutterRing}>
          <Animated.View style={[styles.shutterDot, dotAnimStyle]} />
        </View>
        <Text style={styles.secondaryActionTitle}>{title}</Text>
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
  root: { flex: 1, backgroundColor: Colors.background } as ViewStyle,

  flashContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  } as ViewStyle,

  listHeader: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.lg,
  } as ViewStyle,

  itemSeparator: { height: Spacing.sm } as ViewStyle,

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
  lockIcon: { fontSize: 18, color: Colors.textSecondary } as TextStyle,
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

  actionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  } as ViewStyle,
  primaryActionFlex: { flex: 1 } as ViewStyle,
  primaryAction: {
    flex: 1,
    height: 84,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  } as ViewStyle,
  primaryActionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.silver,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  primaryActionIcon: {
    fontSize: 20,
    fontWeight: Typography.semibold,
    color: Colors.black,
  } as TextStyle,
  actionText: { flex: 1 } as ViewStyle,
  primaryActionTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.black,
    marginBottom: 2,
  } as TextStyle,
  primaryActionDesc: {
    fontSize: Typography.xs,
    color: Colors.gray,
    lineHeight: 16,
  } as TextStyle,

  secondaryAction: {
    width: 84,
    height: 84,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  } as ViewStyle,
  shutterRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.silver,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  shutterDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.silver,
  } as ViewStyle,
  secondaryActionTitle: {
    fontSize: Typography.xs,
    fontWeight: Typography.medium,
    color: Colors.textSecondary,
    letterSpacing: Typography.widest,
    textTransform: "uppercase",
  } as TextStyle,

  tagFilterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingVertical: 2,
  } as ViewStyle,
  tagChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  } as ViewStyle,
  tagChipActive: {
    backgroundColor: Colors.midDark,
    borderColor: Colors.silver,
  } as ViewStyle,
  tagChipText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  } as TextStyle,
  tagChipTextActive: {
    color: Colors.silver,
    fontWeight: Typography.semibold,
  } as TextStyle,

  sectionHeader: {
    gap: Spacing.sm,
    marginBottom: 4,
  } as ViewStyle,
  sectionHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  } as ViewStyle,
  sectionTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    letterSpacing: Typography.widest,
    textTransform: "uppercase",
  } as TextStyle,
  sectionRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  } as ViewStyle,
  sectionCount: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    color: Colors.textMuted,
  } as TextStyle,
  sectionAlbumActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
  } as ViewStyle,
  sectionBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  } as ViewStyle,
  sectionBtnDestructive: { borderColor: Colors.gray } as ViewStyle,
  sectionBtnText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
    letterSpacing: Typography.wide,
  } as TextStyle,
  sectionBtnTextDestructive: { color: Colors.lightGray } as TextStyle,

  viewToggle: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 2,
    gap: 2,
  } as ViewStyle,
  viewToggleBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  viewToggleBtnActive: {
    backgroundColor: Colors.white,
  } as ViewStyle,
  listIconCol: {
    width: 14,
    gap: 3,
  } as ViewStyle,
  listIconBar: {
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.textMuted,
  } as ViewStyle,
  listIconBarActive: {
    backgroundColor: Colors.black,
  } as ViewStyle,
  gridIconGrid: {
    width: 14,
    height: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  } as ViewStyle,
  gridIconCell: {
    width: 6,
    height: 6,
    borderRadius: 1.5,
    backgroundColor: Colors.textMuted,
  } as ViewStyle,
  gridIconCellActive: {
    backgroundColor: Colors.black,
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
  fileCardSelected: {
    borderColor: Colors.silver,
    backgroundColor: Colors.midDark,
  } as ViewStyle,
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  } as ViewStyle,
  checkboxSelected: {
    backgroundColor: Colors.silver,
    borderColor: Colors.silver,
  } as ViewStyle,
  checkboxMark: {
    fontSize: 13,
    fontWeight: Typography.bold,
    color: Colors.black,
  } as TextStyle,
  fileLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.md,
    minWidth: 0,
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
  fileIconText: { fontSize: 18, color: Colors.textMuted } as TextStyle,
  fileMeta: { flex: 1, minWidth: 0 } as ViewStyle,
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

  gridTileWrap: {
    flex: 1,
    padding: 4,
  } as ViewStyle,
  gridTile: {
    aspectRatio: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    padding: Spacing.sm,
  } as ViewStyle,
  gridTileSelected: {
    borderColor: Colors.silver,
    backgroundColor: Colors.midDark,
  } as ViewStyle,
  gridIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.midDark,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  gridFileName: {
    fontSize: Typography.xs,
    fontWeight: Typography.medium,
    color: Colors.textSecondary,
    maxWidth: "100%",
  } as TextStyle,
  gridFavoriteBadge: {
    position: "absolute",
    top: 6,
    right: 6,
  } as ViewStyle,
  gridFavoriteIcon: {
    fontSize: 12,
    color: Colors.silver,
  } as TextStyle,
  gridCheckbox: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  } as ViewStyle,
  gridCheckboxSelected: {
    backgroundColor: Colors.silver,
    borderColor: Colors.silver,
  } as ViewStyle,

  fileTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 5,
  } as ViewStyle,
  fileTagChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.midDark,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    maxWidth: 100,
  } as ViewStyle,
  fileTagChipText: {
    fontSize: 10,
    color: Colors.textMuted,
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
  tagBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    backgroundColor: Colors.midDark,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  tagBtnActive: {
    borderColor: Colors.silver,
  } as ViewStyle,
  tagBtnIcon: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: Typography.bold,
  } as TextStyle,
  tagBtnIconActive: { color: Colors.silver } as TextStyle,
  starBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  starIcon: { fontSize: 16, color: Colors.textMuted } as TextStyle,
  starIconActive: { color: Colors.silver } as TextStyle,
  chevron: { fontSize: 22, color: Colors.textMuted } as TextStyle,

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

  // Selection action bar
  selectionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  } as ViewStyle,
  selectionCancelBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.midDark,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  } as ViewStyle,
  selectionCancelText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: Typography.bold,
  } as TextStyle,
  selectAllBtn: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.midDark,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    flexShrink: 0,
  } as ViewStyle,
  selectAllText: {
    fontSize: Typography.xs,
    fontWeight: Typography.medium,
    color: Colors.silver,
    letterSpacing: Typography.wide,
  } as TextStyle,
  selectionCount: {
    flex: 1,
    minWidth: 0,
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.text,
  } as TextStyle,
  selectionActions: {
    flexDirection: "row",
    gap: Spacing.xs,
    flexShrink: 0,
  } as ViewStyle,
  selectionActionBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: Colors.midDark,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  } as ViewStyle,
  selectionActionBtnDestructive: {
    borderColor: Colors.gray,
  } as ViewStyle,
  selectionActionIcon: {
    fontSize: 15,
    color: Colors.silver,
  } as TextStyle,
  selectionActionIconDestructive: {
    fontSize: 14,
    color: Colors.lightGray,
    fontWeight: Typography.bold,
  } as TextStyle,
});
