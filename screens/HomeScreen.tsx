// import React, { useEffect, useCallback, useState } from "react";
// import {
//   View,
//   Text,
//   ScrollView,
//   StyleSheet,
//   SafeAreaView,
//   Pressable,
//   ViewStyle,
//   ActivityIndicator,
// } from "react-native";
// import Animated, { FadeInDown } from "react-native-reanimated";
// import { Colors, Typography, Spacing, Radius } from "../utils/design";
// import { useAuth } from "../hooks/useAuth";
// import { useVaultOperations } from "../hooks/useVaultOperations";
// import { ProgressOverlay } from "../components/ProgressOverlay";
// import { Card, StatCard } from "../components/Card";
// import { getVaultFiles, VaultFile } from "../services/storage";
// import { decryptImage } from "@/services/encryption";
// import * as FileSystem from "expo-file-system";
// import { Image } from "react-native";
// import ImageViewer from "@/components/ImageViewer";
// import { deleteVaultFile } from "@/services/storage";
// import { Alert } from "react-native";

// export default function HomeScreen() {
//   const { lock, passcode } = useAuth();
//   const {
//     encryptOp,
//     decryptOp,
//     // vaultFiles,
//     refreshFiles,
//     pickImages,
//     pickVaultFiles,
//     encryptImages,
//     decryptFiles,
//     resetEncrypt,
//     resetDecrypt,
//   } = useVaultOperations();

//   useEffect(() => {
//     refreshFiles();
//   }, [refreshFiles]);

//   const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([]);
//   const [isDecrypting, setIsDecrypting] = useState(false);

//   const loadFiles = async () => {
//     const files = await getVaultFiles();
//     setVaultFiles(files);
//   };

//   useEffect(() => {
//     loadFiles();
//   }, []);

//   const [previewUri, setPreviewUri] = useState<string | null>(null);

//   const handleEncrypt = useCallback(async () => {
//     try {
//       const assets = await pickImages();
//       if (assets.length === 0) return;
//       await encryptImages(assets, passcode, false);
//       console.log("Encryption complete, refreshing vault files");
//       refreshFiles();
//     } catch (e) {
//       console.error(e);
//     }
//   }, [pickImages, encryptImages, refreshFiles, passcode]);

//   // const handleDecrypt = useCallback(async () => {
//   //   try {
//   //     // const uris = await pickVaultFiles();
//   //     // console.log('Selected for decryption:', uris);
//   //     // if (uris.length === 0) return;
//   //     // await decryptFiles(uris, passcode);

//   //     const vaultFiles = await getVaultFiles();

//   //     if (vaultFiles.length === 0) {
//   //       console.log("No vault files found");
//   //       return;
//   //     }

//   //     const outPath = await decryptFiles(
//   //       vaultFiles.map((file) => file.uri),
//   //       passcode,
//   //     );
//   //     setPreviewUri(outPath ? outPath : null);
//   //   } catch (e) {
//   //     console.error(e);
//   //   }
//   // }, [pickVaultFiles, decryptFiles, passcode]);

//   const handleDecrypt = useCallback(
//     async (file: VaultFile) => {
//       try {
//         setIsDecrypting(true);

//         const outPath = await decryptImage(
//           file.uri,
//           passcode,
//           FileSystem.cacheDirectory!,
//         );

//         setPreviewUri(outPath);
//       } catch (e) {
//         console.error(e);
//       } finally {
//         setIsDecrypting(false);
//       }
//     },
//     [passcode],
//   );

//   const handleDelete = async (file: VaultFile) => {
//     Alert.alert("Delete File", `Delete ${file.name}?`, [
//       { text: "Cancel", style: "cancel" },
//       {
//         text: "Delete",
//         style: "destructive",
//         onPress: async () => {
//           await deleteVaultFile(file.uri);
//           await loadFiles();
//         },
//       },
//     ]);
//   };

//   const formatTime = (ts: number) => {
//     const d = new Date(ts);
//     const now = new Date();
//     const diff = now.getTime() - d.getTime();
//     if (diff < 60_000) return "Just now";
//     if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
//     if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
//     return d.toLocaleDateString();
//   };

//   const closePreview = () => {
//     setPreviewUri(null);
//   };

//   const isShowingOverlay =
//     encryptOp.status !== "idle" || decryptOp.status !== "idle";
//   const activeOp = encryptOp.status !== "idle" ? encryptOp : decryptOp;
//   const resetActive = encryptOp.status !== "idle" ? resetEncrypt : resetDecrypt;

//   return (
//     <SafeAreaView style={styles.root} className="bg-red-950">
//       <ScrollView
//         style={styles.scroll}
//         contentContainerStyle={styles.content}
//         showsVerticalScrollIndicator={false}
//       >
//         {/* Header */}
//         <Animated.View
//           entering={FadeInDown.delay(0).duration(400)}
//           style={styles.header}
//         >
//           <View>
//             <Text style={styles.greeting}>Vault</Text>
//             <Text style={styles.subGreeting}>Your encrypted storage</Text>
//           </View>
//           <Pressable onPress={lock} style={styles.lockBtn}>
//             <Text style={styles.lockIcon}>⎋</Text>
//           </Pressable>
//         </Animated.View>

//         {/* Stats row */}
//         <Animated.View
//           entering={FadeInDown.delay(80).duration(400)}
//           style={styles.statsRow}
//         >
//           <StatCard
//             value={vaultFiles.length}
//             label="Encrypted"
//             style={styles.statFlex}
//           />
//           <StatCard
//             value={formatFileSize(vaultFiles.reduce((s, f) => s + f.size, 0))}
//             label="Total size"
//             style={styles.statFlex}
//           />
//         </Animated.View>

//         {/* Primary actions */}
//         <Animated.View
//           entering={FadeInDown.delay(160).duration(400)}
//           style={styles.actionsCol}
//         >
//           <ActionCard
//             icon="🔒"
//             title="Encrypt Images"
//             description="Select photos to lock them in the vault"
//             onPress={handleEncrypt}
//           />
//           {/* <ActionCard
//             icon="🔓"
//             title="Decrypt Images"
//             description="Restore encrypted files to your library"
//             onPress={handleDecrypt}
//           /> */}
//         </Animated.View>

//         {/* Vault files */}
//         <Animated.View
//           entering={FadeInDown.delay(240).duration(400)}
//           style={styles.section}
//         >
//           <Text style={styles.sectionTitle}>Vault Contents</Text>
//           {vaultFiles.length === 0 ? (
//             <Card>
//               <Text style={styles.emptyText}>No encrypted files yet</Text>
//             </Card>
//           ) : (
//             <View style={styles.fileList}>
//               {vaultFiles.slice(0, 10).map((file) => (
//                 <Pressable key={file.uri} onPress={() => handleDecrypt(file)}>
//                   {/* <Card key={file.uri} style={styles.fileCard}>
//                     <View style={styles.fileRow}>
//                       <View style={styles.fileIcon}>
//                         <Text style={styles.fileIconText}>⬡</Text>
//                       </View>
//                       <View style={styles.fileMeta}>
//                         <Text style={styles.fileName} numberOfLines={1}>
//                           {file.name.replace(".vault", "")}
//                         </Text>
//                         <Text style={styles.fileDetail}>
//                           {formatFileSize(file.size)} ·{" "}
//                           {formatTime(file.createdAt * 1000)}
//                         </Text>
//                       </View>
//                     </View>
//                     <View style={{ position: "absolute", top: 8, right: 8 }}>
//                       <Pressable onPress={() => handleDelete(file)}>
//                         <Text style={{ fontSize: 18, color: Colors.textMuted }}>
//                           🗑
//                         </Text>
//                       </Pressable>
//                     </View>
//                   </Card> */}

//                   <Card key={file.uri} style={styles.fileCard}>
//                     <View style={styles.fileContent}>
//                       <View style={styles.fileLeft}>
//                         <View style={styles.fileIcon}>
//                           <Text style={styles.fileIconText}>🔒</Text>
//                         </View>

//                         <View style={styles.fileMeta}>
//                           <Text style={styles.fileName} numberOfLines={1}>
//                             {file.name.replace(".vault", "")}
//                           </Text>

//                           <Text style={styles.fileDetail}>
//                             {formatFileSize(file.size)} •{" "}
//                             {formatTime(file.createdAt * 1000)}
//                           </Text>
//                         </View>
//                       </View>

//                       <View style={styles.fileActions}>
//                         <Pressable
//                           style={styles.deleteButton}
//                           onPress={() => handleDelete(file)}
//                         >
//                           <Text style={styles.deleteIcon}>🗑️</Text>
//                         </Pressable>

//                         <View style={styles.chevron}>
//                           <Text style={styles.chevronText}>›</Text>
//                         </View>
//                       </View>
//                     </View>
//                   </Card>
//                 </Pressable>
//               ))}
//             </View>
//           )}
//         </Animated.View>
//       </ScrollView>

//       {/* {previewUri && (
//         <View
//           style={{
//             position: "absolute",
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             backgroundColor: "#000",
//             justifyContent: "center",
//             alignItems: "center",
//           }}
//         >
//           <Image
//             source={{ uri: previewUri }}
//             style={{
//               width: "100%",
//               height: "100%",
//             }}
//             resizeMode="contain"
//           />
//         </View>
//       )} */}

//       <ImageViewer
//         visible={!!previewUri}
//         imageUri={previewUri}
//         onClose={closePreview}
//       />

//       {isDecrypting && (
//         <View
//           style={{
//             position: "absolute",
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             backgroundColor: "rgba(0,0,0,0.85)",
//             justifyContent: "center",
//             alignItems: "center",
//           }}
//         >
//           <ActivityIndicator size="large" color="#fff" />

//           <Text
//             style={{
//               color: "#fff",
//               marginTop: 16,
//               fontSize: 16,
//             }}
//           >
//             Decrypting image...
//           </Text>
//         </View>
//       )}

//       <ProgressOverlay
//         visible={isShowingOverlay}
//         status={activeOp.status}
//         progress={activeOp.progress}
//         message={activeOp.message}
//         error={activeOp.error}
//         onDismiss={resetActive}
//       />
//     </SafeAreaView>
//   );
// }

// interface ActionCardProps {
//   icon: string;
//   title: string;
//   description: string;
//   onPress: () => void;
// }

// function ActionCard({ icon, title, description, onPress }: ActionCardProps) {
//   return (
//     <Pressable
//       onPress={onPress}
//       style={({ pressed }) => [
//         styles.actionCard,
//         pressed && styles.actionCardPressed,
//       ]}
//     >
//       <Text style={styles.actionIcon}>{icon}</Text>
//       <View style={styles.actionText}>
//         <Text style={styles.actionTitle}>{title}</Text>
//         <Text style={styles.actionDesc}>{description}</Text>
//       </View>
//       <Text style={styles.actionChevron}>›</Text>
//     </Pressable>
//   );
// }

// function formatFileSize(bytes: number): string {
//   if (bytes < 1024) return `${bytes}B`;
//   if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
//   return `${(bytes / 1048576).toFixed(1)}MB`;
// }

// const styles = StyleSheet.create({
//   root: { flex: 1, backgroundColor: Colors.background } as ViewStyle,
//   scroll: { flex: 1 },
//   content: {
//     padding: Spacing.lg,
//     paddingBottom: Spacing["3xl"],
//     gap: Spacing.lg,
//   },
//   header: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     marginBottom: Spacing.sm,
//   } as ViewStyle,
//   greeting: {
//     fontSize: Typography["3xl"],
//     fontWeight: Typography.bold,
//     color: Colors.text,
//     letterSpacing: Typography.tight,
//   },
//   subGreeting: {
//     fontSize: Typography.sm,
//     color: Colors.textSecondary,
//     letterSpacing: Typography.wide,
//   },
//   lockBtn: {
//     width: 40,
//     height: 40,
//     borderRadius: Radius.md,
//     backgroundColor: Colors.surface,
//     borderWidth: 1,
//     borderColor: Colors.border,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   lockIcon: { fontSize: 18, color: Colors.textSecondary },
//   statsRow: { flexDirection: "row", gap: Spacing.md } as ViewStyle,
//   statFlex: { flex: 1 } as ViewStyle,
//   actionsCol: { gap: Spacing.md } as ViewStyle,
//   actionCard: {
//     backgroundColor: Colors.surface,
//     borderRadius: Radius.lg,
//     borderWidth: 1,
//     borderColor: Colors.border,
//     padding: Spacing.md,
//     flexDirection: "row",
//     alignItems: "center",
//     gap: Spacing.md,
//   } as ViewStyle,
//   actionCardPressed: { backgroundColor: Colors.midDark } as ViewStyle,
//   actionIcon: { fontSize: 28, width: 44, textAlign: "center" },
//   actionText: { flex: 1 },
//   actionTitle: {
//     fontSize: Typography.md,
//     fontWeight: Typography.semibold,
//     color: Colors.text,
//     marginBottom: 2,
//   },
//   actionDesc: { fontSize: Typography.sm, color: Colors.textSecondary },
//   actionChevron: { fontSize: 24, color: Colors.textMuted },
//   section: { gap: Spacing.sm },
//   sectionTitle: {
//     fontSize: Typography.xs,
//     fontWeight: Typography.semibold,
//     color: Colors.textMuted,
//     letterSpacing: Typography.widest,
//     textTransform: "uppercase",
//     marginBottom: 4,
//   },
//   emptyText: {
//     fontSize: Typography.sm,
//     color: Colors.textMuted,
//     textAlign: "center",
//     paddingVertical: Spacing.md,
//   },
//   fileList: { gap: Spacing.sm },
//   // fileCard: {} as ViewStyle,
//   // fileRow: {
//   //   flexDirection: "row",
//   //   alignItems: "center",
//   //   gap: Spacing.md,
//   // } as ViewStyle,
//   // fileIcon: {
//   //   width: 36,
//   //   height: 36,
//   //   borderRadius: Radius.sm,
//   //   backgroundColor: Colors.midDark,
//   //   alignItems: "center",
//   //   justifyContent: "center",
//   // },
//   // fileIconText: { fontSize: 16, color: Colors.textMuted },
//   // fileMeta: { flex: 1 },
//   // fileName: {
//   //   fontSize: Typography.sm,
//   //   fontWeight: Typography.medium,
//   //   color: Colors.text,
//   // },
//   // fileDetail: {
//   //   fontSize: Typography.xs,
//   //   color: Colors.textSecondary,
//   //   marginTop: 2,
//   // },
//   fileCard: {
//     marginBottom: 12,
//     borderRadius: 20,
//     padding: 0,

//     backgroundColor: "#16181D",

//     borderWidth: 1,
//     borderColor: "rgba(255,255,255,0.06)",

//     overflow: "hidden",
//   },

//   fileContent: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",

//     paddingHorizontal: 16,
//     paddingVertical: 16,
//   },

//   fileLeft: {
//     flexDirection: "row",
//     alignItems: "center",
//     flex: 1,
//   },

//   fileIcon: {
//     width: 52,
//     height: 52,

//     borderRadius: 16,

//     alignItems: "center",
//     justifyContent: "center",

//     backgroundColor: "rgba(99,102,241,0.15)",

//     borderWidth: 1,
//     borderColor: "rgba(99,102,241,0.25)",
//   },

//   fileIconText: {
//     fontSize: 22,
//   },

//   fileMeta: {
//     flex: 1,
//     marginLeft: 14,
//   },

//   fileName: {
//     color: "#FFFFFF",
//     fontSize: 15,
//     fontWeight: "700",
//   },

//   fileDetail: {
//     marginTop: 4,

//     color: "#8B95A7",
//     fontSize: 12,
//   },

//   fileActions: {
//     flexDirection: "row",
//     alignItems: "center",
//   },

//   deleteButton: {
//     width: 42,
//     height: 42,

//     borderRadius: 21,

//     justifyContent: "center",
//     alignItems: "center",

//     backgroundColor: "rgba(239,68,68,0.12)",

//     borderWidth: 1,
//     borderColor: "rgba(239,68,68,0.2)",
//   },

//   deleteIcon: {
//     fontSize: 18,
//   },

//   chevron: {
//     marginLeft: 10,
//   },

//   chevronText: {
//     color: "#5E6878",
//     fontSize: 24,
//     fontWeight: "600",
//   },
// });

// ---------------------------------------------------------------

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
  Button,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
} from "react-native-reanimated";
import { Colors, Typography, Spacing, Radius } from "../utils/design";
import { useAuth } from "../hooks/useAuth";
import { useVaultOperations } from "../hooks/useVaultOperations";
import { ProgressOverlay } from "../components/ProgressOverlay";
import { Card, StatCard } from "../components/Card";
import { getVaultFiles, VaultFile, deleteVaultFile } from "../services/storage";
import { decryptImage } from "../services/encryption";
import * as FileSystem from "expo-file-system";
import ImageViewer from "../components/ImageViewer";
import * as MediaLibrary from "expo-media-library";

// ─── HomeScreen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { lock, passcode } = useAuth();
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

  // ─── Data loading ────────────────────────────────────────────────────────

  const loadFiles = useCallback(async () => {
    const files = await getVaultFiles();
    setVaultFiles(files);
  }, []);

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
      await encryptImages(assets, passcode, false);
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
              await deleteVaultFile(file.uri);
              await loadFiles();
            },
          },
        ],
      );
    },
    [loadFiles],
  );

  // ─── Overlay state ────────────────────────────────────────────────────────

  const isShowingProgress =
    encryptOp.status !== "idle" || decryptOp.status !== "idle";
  const activeOp = encryptOp.status !== "idle" ? encryptOp : decryptOp;
  const resetActiveOp =
    encryptOp.status !== "idle" ? resetEncrypt : resetDecrypt;

  // ─── Derived stats ────────────────────────────────────────────────────────

  const totalSize = vaultFiles.reduce((sum, f) => sum + f.size, 0);

  // const testMediaAccess = async () => {
  //   const { status } = await MediaLibrary.requestPermissionsAsync();

  //   if (status !== "granted") {
  //     console.log("Permission denied");
  //     return;
  //   }

  //   const photos = await MediaLibrary.getAssetsAsync({
  //     mediaType: "photo",
  //     first: 10,
  //   });

  //   console.log(photos.assets);
  // };

  // const testDelete = async () => {
  //   try {
  //     const assets = await MediaLibrary.getAssetsAsync({
  //       first: 1,
  //       mediaType: "photo",
  //     });

  //     const asset = assets.assets[0];

  //     console.log("URI:", asset.uri);

  //     await FileSystem.deleteAsync(asset.uri);

  //     console.log("Deleted via FileSystem");
  //   } catch (e) {
  //     console.log("DELETE ERROR:", e);
  //   }
  // };

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

      {/* <Button title="Test Media" onPress={testMediaAccess} />
      <Button title="Test Delete" onPress={testDelete} /> */}

      {/* ── Encrypt progress overlay ───────────────────────────────────────── */}
      <ProgressOverlay
        visible={isShowingProgress}
        status={activeOp.status}
        progress={activeOp.progress}
        message={activeOp.message}
        error={activeOp.error}
        onDismiss={resetActiveOp}
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
    // Short delay so animation is visible before Alert blocks the thread
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
