import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ViewStyle,
  ActivityIndicator,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors, Typography, Spacing, Radius } from "../utils/design";
import { useAuth } from "../hooks/useAuth";
import { useVaultOperations } from "../hooks/useVaultOperations";
import { ProgressOverlay } from "../components/ProgressOverlay";
import { Card, StatCard } from "../components/Card";
import { getVaultFiles, VaultFile } from "../services/storage";
import { decryptImage } from "@/services/encryption";
import * as FileSystem from "expo-file-system";
import { Image } from "react-native";
import ImageViewer from "@/components/ImageViewer";
import { deleteVaultFile } from "@/services/storage";
import { Alert } from "react-native";

export default function HomeScreen() {
  const { lock, passcode } = useAuth();
  const {
    encryptOp,
    decryptOp,
    // vaultFiles,
    refreshFiles,
    pickImages,
    pickVaultFiles,
    encryptImages,
    decryptFiles,
    resetEncrypt,
    resetDecrypt,
  } = useVaultOperations();

  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

  const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const loadFiles = async () => {
    const files = await getVaultFiles();
    setVaultFiles(files);
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const handleEncrypt = useCallback(async () => {
    try {
      const assets = await pickImages();
      if (assets.length === 0) return;
      await encryptImages(assets, passcode, false);
      console.log("Encryption complete, refreshing vault files");
      refreshFiles();
    } catch (e) {
      console.error(e);
    }
  }, [pickImages, encryptImages, refreshFiles, passcode]);

  // const handleDecrypt = useCallback(async () => {
  //   try {
  //     // const uris = await pickVaultFiles();
  //     // console.log('Selected for decryption:', uris);
  //     // if (uris.length === 0) return;
  //     // await decryptFiles(uris, passcode);

  //     const vaultFiles = await getVaultFiles();

  //     if (vaultFiles.length === 0) {
  //       console.log("No vault files found");
  //       return;
  //     }

  //     const outPath = await decryptFiles(
  //       vaultFiles.map((file) => file.uri),
  //       passcode,
  //     );
  //     setPreviewUri(outPath ? outPath : null);
  //   } catch (e) {
  //     console.error(e);
  //   }
  // }, [pickVaultFiles, decryptFiles, passcode]);

  const handleDecrypt = useCallback(
    async (file: VaultFile) => {
      try {
        setIsDecrypting(true);

        const outPath = await decryptImage(
          file.uri,
          passcode,
          FileSystem.cacheDirectory!,
        );

        setPreviewUri(outPath);
      } catch (e) {
        console.error(e);
      } finally {
        setIsDecrypting(false);
      }
    },
    [passcode],
  );

  const handleDelete = async (file: VaultFile) => {
    Alert.alert("Delete File", `Delete ${file.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteVaultFile(file.uri);
          await loadFiles();
        },
      },
    ]);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60_000) return "Just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return d.toLocaleDateString();
  };

  const closePreview = () => {
    setPreviewUri(null);
  };

  const isShowingOverlay =
    encryptOp.status !== "idle" || decryptOp.status !== "idle";
  const activeOp = encryptOp.status !== "idle" ? encryptOp : decryptOp;
  const resetActive = encryptOp.status !== "idle" ? resetEncrypt : resetDecrypt;

  return (
    <SafeAreaView style={styles.root} className="bg-red-950">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(0).duration(400)}
          style={styles.header}
        >
          <View>
            <Text style={styles.greeting}>Vault</Text>
            <Text style={styles.subGreeting}>Your encrypted storage</Text>
          </View>
          <Pressable onPress={lock} style={styles.lockBtn}>
            <Text style={styles.lockIcon}>⎋</Text>
          </Pressable>
        </Animated.View>

        {/* Stats row */}
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
            value={formatFileSize(vaultFiles.reduce((s, f) => s + f.size, 0))}
            label="Total size"
            style={styles.statFlex}
          />
        </Animated.View>

        {/* Primary actions */}
        <Animated.View
          entering={FadeInDown.delay(160).duration(400)}
          style={styles.actionsCol}
        >
          <ActionCard
            icon="🔒"
            title="Encrypt Images"
            description="Select photos to lock them in the vault"
            onPress={handleEncrypt}
          />
          {/* <ActionCard
            icon="🔓"
            title="Decrypt Images"
            description="Restore encrypted files to your library"
            onPress={handleDecrypt}
          /> */}
        </Animated.View>

        {/* Vault files */}
        <Animated.View
          entering={FadeInDown.delay(240).duration(400)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Vault Contents</Text>
          {vaultFiles.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>No encrypted files yet</Text>
            </Card>
          ) : (
            <View style={styles.fileList}>
              {vaultFiles.slice(0, 10).map((file) => (
                <Pressable key={file.uri} onPress={() => handleDecrypt(file)}>
                  {/* <Card key={file.uri} style={styles.fileCard}>
                    <View style={styles.fileRow}>
                      <View style={styles.fileIcon}>
                        <Text style={styles.fileIconText}>⬡</Text>
                      </View>
                      <View style={styles.fileMeta}>
                        <Text style={styles.fileName} numberOfLines={1}>
                          {file.name.replace(".vault", "")}
                        </Text>
                        <Text style={styles.fileDetail}>
                          {formatFileSize(file.size)} ·{" "}
                          {formatTime(file.createdAt * 1000)}
                        </Text>
                      </View>
                    </View>
                    <View style={{ position: "absolute", top: 8, right: 8 }}>
                      <Pressable onPress={() => handleDelete(file)}>
                        <Text style={{ fontSize: 18, color: Colors.textMuted }}>
                          🗑
                        </Text>
                      </Pressable>
                    </View>
                  </Card> */}

                  <Card key={file.uri} style={styles.fileCard}>
                    <View style={styles.fileContent}>
                      <View style={styles.fileLeft}>
                        <View style={styles.fileIcon}>
                          <Text style={styles.fileIconText}>🔒</Text>
                        </View>

                        <View style={styles.fileMeta}>
                          <Text style={styles.fileName} numberOfLines={1}>
                            {file.name.replace(".vault", "")}
                          </Text>

                          <Text style={styles.fileDetail}>
                            {formatFileSize(file.size)} •{" "}
                            {formatTime(file.createdAt * 1000)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.fileActions}>
                        <Pressable
                          style={styles.deleteButton}
                          onPress={() => handleDelete(file)}
                        >
                          <Text style={styles.deleteIcon}>🗑️</Text>
                        </Pressable>

                        <View style={styles.chevron}>
                          <Text style={styles.chevronText}>›</Text>
                        </View>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* {previewUri && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#000",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Image
            source={{ uri: previewUri }}
            style={{
              width: "100%",
              height: "100%",
            }}
            resizeMode="contain"
          />
        </View>
      )} */}

      <ImageViewer
        visible={!!previewUri}
        imageUri={previewUri}
        onClose={closePreview}
      />

      {isDecrypting && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="large" color="#fff" />

          <Text
            style={{
              color: "#fff",
              marginTop: 16,
              fontSize: 16,
            }}
          >
            Decrypting image...
          </Text>
        </View>
      )}

      <ProgressOverlay
        visible={isShowingOverlay}
        status={activeOp.status}
        progress={activeOp.progress}
        message={activeOp.message}
        error={activeOp.error}
        onDismiss={resetActive}
      />
    </SafeAreaView>
  );
}

interface ActionCardProps {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
}

function ActionCard({ icon, title, description, onPress }: ActionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        pressed && styles.actionCardPressed,
      ]}
    >
      <Text style={styles.actionIcon}>{icon}</Text>
      <View style={styles.actionText}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDesc}>{description}</Text>
      </View>
      <Text style={styles.actionChevron}>›</Text>
    </Pressable>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background } as ViewStyle,
  scroll: { flex: 1 },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing["3xl"],
    gap: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  } as ViewStyle,
  greeting: {
    fontSize: Typography["3xl"],
    fontWeight: Typography.bold,
    color: Colors.text,
    letterSpacing: Typography.tight,
  },
  subGreeting: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    letterSpacing: Typography.wide,
  },
  lockBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  lockIcon: { fontSize: 18, color: Colors.textSecondary },
  statsRow: { flexDirection: "row", gap: Spacing.md } as ViewStyle,
  statFlex: { flex: 1 } as ViewStyle,
  actionsCol: { gap: Spacing.md } as ViewStyle,
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
  actionCardPressed: { backgroundColor: Colors.midDark } as ViewStyle,
  actionIcon: { fontSize: 28, width: 44, textAlign: "center" },
  actionText: { flex: 1 },
  actionTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  actionDesc: { fontSize: Typography.sm, color: Colors.textSecondary },
  actionChevron: { fontSize: 24, color: Colors.textMuted },
  section: { gap: Spacing.sm },
  sectionTitle: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textMuted,
    letterSpacing: Typography.widest,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    textAlign: "center",
    paddingVertical: Spacing.md,
  },
  fileList: { gap: Spacing.sm },
  // fileCard: {} as ViewStyle,
  // fileRow: {
  //   flexDirection: "row",
  //   alignItems: "center",
  //   gap: Spacing.md,
  // } as ViewStyle,
  // fileIcon: {
  //   width: 36,
  //   height: 36,
  //   borderRadius: Radius.sm,
  //   backgroundColor: Colors.midDark,
  //   alignItems: "center",
  //   justifyContent: "center",
  // },
  // fileIconText: { fontSize: 16, color: Colors.textMuted },
  // fileMeta: { flex: 1 },
  // fileName: {
  //   fontSize: Typography.sm,
  //   fontWeight: Typography.medium,
  //   color: Colors.text,
  // },
  // fileDetail: {
  //   fontSize: Typography.xs,
  //   color: Colors.textSecondary,
  //   marginTop: 2,
  // },
  fileCard: {
    marginBottom: 12,
    borderRadius: 20,
    padding: 0,

    backgroundColor: "#16181D",

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",

    overflow: "hidden",
  },

  fileContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  fileLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  fileIcon: {
    width: 52,
    height: 52,

    borderRadius: 16,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "rgba(99,102,241,0.15)",

    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.25)",
  },

  fileIconText: {
    fontSize: 22,
  },

  fileMeta: {
    flex: 1,
    marginLeft: 14,
  },

  fileName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  fileDetail: {
    marginTop: 4,

    color: "#8B95A7",
    fontSize: 12,
  },

  fileActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  deleteButton: {
    width: 42,
    height: 42,

    borderRadius: 21,

    justifyContent: "center",
    alignItems: "center",

    backgroundColor: "rgba(239,68,68,0.12)",

    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },

  deleteIcon: {
    fontSize: 18,
  },

  chevron: {
    marginLeft: 10,
  },

  chevronText: {
    color: "#5E6878",
    fontSize: 24,
    fontWeight: "600",
  },
});
