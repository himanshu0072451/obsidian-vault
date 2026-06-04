import { useState, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import {
  encryptImage,
  decryptImage,
  VAULT_EXTENSION,
} from "../services/encryption";
import {
  ensureVaultDir,
  VAULT_DIR,
  logActivity,
  getVaultFiles,
  VaultFile,
} from "../services/storage";

export type OperationStatus = "idle" | "running" | "success" | "error";

interface VaultOperation {
  status: OperationStatus;
  progress: number; // 0–1
  message: string;
  error: string | null;
}

const idle: VaultOperation = {
  status: "idle",
  progress: 0,
  message: "",
  error: null,
};

export function useVaultOperations() {
  const [encryptOp, setEncryptOp] = useState<VaultOperation>(idle);
  const [decryptOp, setDecryptOp] = useState<VaultOperation>(idle);
  const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([]);

  const refreshFiles = useCallback(async () => {
    const files = await getVaultFiles();
    setVaultFiles(files);
  }, []);

  // Pick images from gallery
  const pickImages = useCallback(async (): Promise<
    ImagePicker.ImagePickerAsset[]
  > => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted")
      throw new Error("Photo library permission denied");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 1,
      selectionLimit: 20,
    });

    if (result.canceled) return [];
    console.log(JSON.stringify(result.assets, null, 2));
    return result.assets;
  }, []);

  // Pick .vault files to decrypt
  const pickVaultFiles = useCallback(async (): Promise<string[]> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      multiple: true,
      copyToCacheDirectory: true,
    });
    console.log("Document picker result:", result);

    if (result.canceled) return [];
    return result.assets
      .filter((a) => a.name.endsWith(VAULT_EXTENSION))
      .map((a) => a.uri);
  }, []);

  // Encrypt selected images
  const encryptImages = useCallback(
    async (
      assets: ImagePicker.ImagePickerAsset[],
      passcode: string,
      deleteOriginal: boolean,
    ) => {
      setEncryptOp({
        status: "running",
        progress: 0,
        message: "Preparing vault...",
        error: null,
      });

      try {
        const outDir = await ensureVaultDir();
        console.log("Vault directory ready at", outDir);
        const total = assets.length;

        for (let i = 0; i < total; i++) {
          const asset = assets[i];
          setEncryptOp({
            status: "running",
            progress: (i + 0.5) / total,
            message: `Encrypting ${i + 1} of ${total}...`,
            error: null,
          });

          await encryptImage(asset.uri, passcode, outDir);

          // Optionally delete original
          // if (deleteOriginal && asset.uri) {
          //   await FileSystem.deleteAsync(asset.uri, { idempotent: true });
          // }
        }

        await logActivity({
          type: "encrypt",
          fileCount: total,
          timestamp: Date.now(),
        });
        await refreshFiles();

        setEncryptOp({
          status: "success",
          progress: 1,
          message: `${total} image${total !== 1 ? "s" : ""} encrypted`,
          error: null,
        });
      } catch (e: any) {
        setEncryptOp({
          status: "error",
          progress: 0,
          message: "",
          error: e.message ?? "Encryption failed",
        });
      }
    },
    [refreshFiles],
  );

  // Decrypt selected vault files
  const decryptFiles = useCallback(async (uris: string[], passcode: string) => {
    setDecryptOp({
      status: "running",
      progress: 0,
      message: "Unlocking files...",
      error: null,
    });

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      console.log("Media library permission status:", status);
      if (status !== "granted")
        throw new Error("Media library permission denied");

      const cacheDir = FileSystem.cacheDirectory!;
      const total = uris.length;

      for (let i = 0; i < total; i++) {
        setDecryptOp({
          status: "running",
          progress: (i + 0.5) / total,
          message: `Decrypting ${i + 1} of ${total}...`,
          error: null,
        });

        const outPath = await decryptImage(uris[i], passcode, cacheDir);
        // await MediaLibrary.saveToLibraryAsync(outPath);
        // await FileSystem.deleteAsync(outPath, { idempotent: true });

        //return the decrypted file uri to be displayed in the app instead of saving to gallery
        console.log("Decrypted file available at:", outPath);
        return outPath;
      }

      await logActivity({
        type: "decrypt",
        fileCount: total,
        timestamp: Date.now(),
      });

      setDecryptOp({
        status: "success",
        progress: 1,
        message: `${total} image${total !== 1 ? "s" : ""} saved to Photos`,
        error: null,
      });
    } catch (e: any) {
      const msg = e.message ?? "";
      const isWrongPasscode =
        msg.includes("padding") || msg.includes("passcode");
      setDecryptOp({
        status: "error",
        progress: 0,
        message: "",
        error: isWrongPasscode ? "Incorrect passcode" : "Decryption failed",
      });
    }
  }, []);

  const resetEncrypt = useCallback(() => setEncryptOp(idle), []);
  const resetDecrypt = useCallback(() => setDecryptOp(idle), []);

  return {
    encryptOp,
    decryptOp,
    vaultFiles,
    refreshFiles,
    pickImages,
    pickVaultFiles,
    encryptImages,
    decryptFiles,
    resetEncrypt,
    resetDecrypt,
  };
}
