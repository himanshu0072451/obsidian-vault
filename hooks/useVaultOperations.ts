import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { encryptImage, decryptImage } from '../services/encryption';
import { VAULT_EXTENSION } from '../services/storage';
import { useVault } from './useAuth';
import type { VaultFile } from '../services/storage';

export type OperationStatus = 'idle' | 'running' | 'success' | 'error';

interface VaultOperation {
  status: OperationStatus;
  progress: number;
  message: string;
  error: string | null;
}

const idle: VaultOperation = { status: 'idle', progress: 0, message: '', error: null };

export function useVaultOperations() {
  const vault = useVault();

  const [encryptOp, setEncryptOp] = useState<VaultOperation>(idle);
  const [decryptOp, setDecryptOp] = useState<VaultOperation>(idle);

  // ── Pick images from gallery ─────────────────────────────────────────────

  const pickImages = useCallback(async (): Promise<ImagePicker.ImagePickerAsset[]> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') throw new Error('Photo library permission denied');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
      selectionLimit: 20,
    });

    if (result.canceled) return [];
    return result.assets;
  }, []);

  // ── Encrypt ──────────────────────────────────────────────────────────────

  const encryptImages = useCallback(
    async (
      assets: ImagePicker.ImagePickerAsset[],
      passcode: string,
      deleteOriginal: boolean,
      albumName?: string | null
    ) => {
      setEncryptOp({ status: 'running', progress: 0, message: 'Preparing vault...', error: null });

      try {
        const outDir = await vault.ensureAlbumDir(albumName ?? null);
        const total = assets.length;

        for (let i = 0; i < total; i++) {
          const asset = assets[i];
          setEncryptOp({
            status: 'running',
            progress: (i + 0.5) / total,
            message: `Encrypting ${i + 1} of ${total}...`,
            error: null,
          });

           const val = await encryptImage(asset.uri, passcode, outDir);
           console.log(`Encrypted ${asset.uri} to ${val}`);

          if (deleteOriginal) {
            await FileSystem.deleteAsync(asset.uri, { idempotent: true });
          }
        }

        await vault.logActivity({
          type: 'encrypt',
          fileCount: total,
          timestamp: Date.now(),
          detail: albumName ?? undefined,
        });

        setEncryptOp({
          status: 'success',
          progress: 1,
          message: `${total} image${total !== 1 ? 's' : ''} encrypted`,
          error: null,
        });
      } catch (e: any) {
        setEncryptOp({
          status: 'error',
          progress: 0,
          message: '',
          error: e.message ?? 'Encryption failed',
        });
      }
    },
    [vault]
  );

  // ── Decrypt to Photos library ─────────────────────────────────────────────

  const decryptToLibrary = useCallback(
    async (uris: string[], passcode: string) => {
      setDecryptOp({ status: 'running', progress: 0, message: 'Unlocking files...', error: null });

      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') throw new Error('Media library permission denied');

        const cacheDir = FileSystem.cacheDirectory!;
        const total = uris.length;

        for (let i = 0; i < total; i++) {
          setDecryptOp({
            status: 'running',
            progress: (i + 0.5) / total,
            message: `Decrypting ${i + 1} of ${total}...`,
            error: null,
          });

          const outPath = await decryptImage(uris[i], passcode, cacheDir);
          await MediaLibrary.saveToLibraryAsync(outPath);
          await FileSystem.deleteAsync(outPath, { idempotent: true });
        }

        await vault.logActivity({
          type: 'decrypt',
          fileCount: total,
          timestamp: Date.now(),
        });

        setDecryptOp({
          status: 'success',
          progress: 1,
          message: `${total} image${total !== 1 ? 's' : ''} saved to Photos`,
          error: null,
        });
      } catch (e: any) {
        const msg = e.message ?? '';
        const isWrongPasscode = msg.includes('padding') || msg.includes('passcode');
        setDecryptOp({
          status: 'error',
          progress: 0,
          message: '',
          error: isWrongPasscode ? 'Incorrect passcode' : 'Decryption failed',
        });
      }
    },
    [vault]
  );

  const resetEncrypt = useCallback(() => setEncryptOp(idle), []);
  const resetDecrypt = useCallback(() => setDecryptOp(idle), []);

  return {
    encryptOp,
    decryptOp,
    pickImages,
    encryptImages,
    decryptToLibrary,
    resetEncrypt,
    resetDecrypt,
  };
}
