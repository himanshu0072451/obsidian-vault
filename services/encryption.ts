/**
 * Encryption service using AES-256-CBC with PBKDF2 key derivation.
 * All sensitive operations are isolated here.
 */

import * as FileSystem from "expo-file-system";
import Aes from "react-native-aes-crypto";
import * as ImageManipulator from "expo-image-manipulator";
import { getColors } from "react-native-image-colors";

// Encrypted file extension
export const VAULT_EXTENSION = ".vault";
// Encrypted thumbnail sidecar extension — mirrors services/storage/types.ts's
// THUMB_EXTENSION. Kept as a local constant rather than importing from
// storage/ so this file stays a self-contained "sensitive operations" module.
const THUMB_EXTENSION = ".thumb";

// Thumbnails are resized before encryption specifically so the grid never
// needs to decrypt a full-resolution original — keeps decrypt-for-preview
// cheap and fast regardless of source photo size.
const THUMB_MAX_DIMENSION = 400;
const THUMB_JPEG_QUALITY = 0.6;

async function deriveKey(passcode: string, salt: string) {
  return await Aes.pbkdf2(passcode, salt, 5000, 256, "sha256");
}

async function randomHex(length: number) {
  return await Aes.randomKey(length);
}

function generateVaultFileName(sourceUri: string): string {
  const baseName = sourceUri.split("/").pop() ?? "image";
  const ts = Date.now();

  return `${baseName}_${ts}.vault`;
}

function restoreOriginalFileName(vaultUri: string): string {
  const name = vaultUri.split("/").pop() ?? "decrypted";

  return name.replace(".vault", "").replace(/_\d+$/, "");
}

export async function encryptImage(
  sourceUri: string,
  passcode: string,
  outputDir: string,
): Promise<string> {
  const base64Data = await FileSystem.readAsStringAsync(sourceUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const salt = await randomHex(16);
  const iv = await randomHex(16);

  const key = await deriveKey(passcode, salt);

  const cipherText = await Aes.encrypt(base64Data, key, iv, "aes-256-cbc");

  const payload = JSON.stringify({
    salt,
    iv,
    cipherText,
  });

  const fileName = generateVaultFileName(sourceUri);
  const outPath = `${outputDir}/${fileName}`;

  await FileSystem.writeAsStringAsync(outPath, payload);

  return outPath;
}

/**
 * Sample 2–3 dominant colors from the (already resized) thumbnail source,
 * for use as an adaptive gradient behind the blurred grid thumbnail.
 *
 * Best-effort: returns `null` on any failure — a missing color set just
 * means the grid falls back to its existing plain monochrome background,
 * never an error.
 */
async function extractDominantColors(
  resizedUri: string,
): Promise<string[] | null> {
  try {
    const result = await getColors(resizedUri, {
      fallback: "#1a1a1a",
      cache: false,
    });

    let candidates: (string | undefined)[];
    if (result.platform === "ios") {
      candidates = [result.primary, result.secondary, result.detail];
    } else {
      // android + web share this shape
      candidates = [result.dominant, result.vibrant, result.muted];
    }

    const colors = candidates.filter((c): c is string => !!c).slice(0, 3);
    return colors.length > 0 ? colors : null;
  } catch {
    return null;
  }
}

/**
 * Generate a small preview image from the source, encrypt it with its own
 * fresh salt/iv, and write it as the `.thumb` sidecar next to the given
 * vault file path (same basename, extension swapped). Also samples 2–3
 * dominant colors from that same resized image, for the grid's adaptive
 * gradient background — extracted once here, at import time, never again.
 *
 * Best-effort: any failure (manipulation error, disk full, etc.) is
 * swallowed — a missing/broken thumbnail or color set must never block or
 * fail the primary encrypt operation. Callers should fall back to the
 * existing placeholder icon / plain background when these come back falsy.
 */
export async function generateEncryptedThumbnail(
  sourceUri: string,
  passcode: string,
  vaultOutPath: string,
): Promise<{ hasThumb: boolean; colors: string[] | null }> {
  let resizedUri: string | null = null;

  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      sourceUri,
      [{ resize: { width: THUMB_MAX_DIMENSION } }],
      {
        compress: THUMB_JPEG_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );
    resizedUri = manipulated.uri;

    const colors = await extractDominantColors(resizedUri);

    const base64Data = await FileSystem.readAsStringAsync(resizedUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const salt = await randomHex(16);
    const iv = await randomHex(16);
    const key = await deriveKey(passcode, salt);
    const cipherText = await Aes.encrypt(base64Data, key, iv, "aes-256-cbc");

    const payload = JSON.stringify({ salt, iv, cipherText });
    const thumbPath = vaultOutPath.replace(VAULT_EXTENSION, THUMB_EXTENSION);
    await FileSystem.writeAsStringAsync(thumbPath, payload);

    return { hasThumb: true, colors };
  } catch {
    return { hasThumb: false, colors: null };
  } finally {
    if (resizedUri) {
      await FileSystem.deleteAsync(resizedUri, { idempotent: true }).catch(
        () => {},
      );
    }
  }
}

/** Decrypt a .vault file, returns path of restored image. */
export async function decryptImage(
  vaultUri: string,
  passcode: string,
  outputDir: string,
): Promise<string> {
  const payload = await FileSystem.readAsStringAsync(vaultUri);

  const { salt, iv, cipherText } = JSON.parse(payload);

  const key = await deriveKey(passcode, salt);

  const plainBase64 = await Aes.decrypt(cipherText, key, iv, "aes-256-cbc");

  const fileName = restoreOriginalFileName(vaultUri);
  const outPath = `${outputDir}/${fileName}`;

  await FileSystem.writeAsStringAsync(outPath, plainBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return outPath;
}
