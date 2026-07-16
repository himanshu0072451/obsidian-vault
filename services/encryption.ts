/**
 * Encryption service using AES-256-CBC with PBKDF2 key derivation.
 * All sensitive operations are isolated here.
 */

import * as FileSystem from "expo-file-system";
import * as Crypto from "expo-crypto";
import Aes from "react-native-aes-crypto";
import * as ImageManipulator from "expo-image-manipulator";

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

// PBKDF2 parameters
const PBKDF2_ITERATIONS = 10000;
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;

/** Derive a 256-bit key from passcode + salt using PBKDF2-SHA256. */
// async function deriveKey(passcode: string, saltHex: string): Promise<number[]> {
//   // We implement PBKDF2 manually using expo-crypto's digest
//   // since native pbkdf2 libs aren't always available in Expo Go
//   const saltBytes = hexToBytes(saltHex);
//   const passcodeBytes = stringToBytes(passcode);

//   // HMAC-SHA256 based PRF for PBKDF2
//   return pbkdf2Sha256(passcodeBytes, saltBytes, PBKDF2_ITERATIONS, KEY_LENGTH);
// }

async function deriveKey(passcode: string, salt: string) {
  return await Aes.pbkdf2(passcode, salt, 5000, 256, "sha256");
}

async function randomHex(length: number) {
  return await Aes.randomKey(length);
}

/** Encrypt image file, returns path of encrypted file. */
// export async function encryptImage(
//   sourceUri: string,
//   passcode: string,
//   outputDir: string,
// ): Promise<string> {
//   // Read source file as base64
//   const base64Data = await FileSystem.readAsStringAsync(sourceUri, {
//     encoding: FileSystem.EncodingType.Base64,
//   });

//   const plainBytes = base64ToBytes(base64Data);

//   // Generate random salt and IV
//   const salt = await randomBytes(SALT_LENGTH);
//   const iv = await randomBytes(IV_LENGTH);
//   const saltHex = bytesToHex(salt);

//   // Derive key
//   const key = await deriveKey(passcode, saltHex);

//   // AES-256-CBC encrypt
//   const cipherBytes = aesCbcEncrypt(key, iv, plainBytes);

//   // Format: [4 bytes salt length][salt][iv][ciphertext]
//   const saltLenBytes = int32ToBytes(SALT_LENGTH);
//   const combined = [...saltLenBytes, ...salt, ...iv, ...cipherBytes];

//   // Write encrypted file
//   const fileName = generateVaultFileName(sourceUri);
//   const outPath = `${outputDir}/${fileName}`;
//   await FileSystem.writeAsStringAsync(outPath, bytesToBase64(combined), {
//     encoding: FileSystem.EncodingType.Base64,
//   });

//   return outPath;
// }
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
 * Generate a small preview image from the source, encrypt it with its own
 * fresh salt/iv, and write it as the `.thumb` sidecar next to the given
 * vault file path (same basename, extension swapped).
 *
 * Best-effort: any failure (manipulation error, disk full, etc.) is
 * swallowed and reported as `false` — a missing/broken thumbnail must never
 * block or fail the primary encrypt operation. Callers should fall back to
 * the existing placeholder icon when this returns `false`.
 */
export async function generateEncryptedThumbnail(
  sourceUri: string,
  passcode: string,
  vaultOutPath: string,
): Promise<boolean> {
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

    return true;
  } catch {
    return false;
  } finally {
    if (resizedUri) {
      await FileSystem.deleteAsync(resizedUri, { idempotent: true }).catch(
        () => {},
      );
    }
  }
}

/** Decrypt a .vault file, returns path of restored image. */
// export async function decryptImage(
//   vaultUri: string,
//   passcode: string,
//   outputDir: string,
// ): Promise<string> {
//   const base64Data = await FileSystem.readAsStringAsync(vaultUri, {
//     encoding: FileSystem.EncodingType.Base64,
//   });

//   const combined = base64ToBytes(base64Data);

//   // Parse header
//   const saltLen = bytesToInt32(combined.slice(0, 4));
//   const salt = combined.slice(4, 4 + saltLen);
//   const iv = combined.slice(4 + saltLen, 4 + saltLen + IV_LENGTH);
//   const cipherBytes = combined.slice(4 + saltLen + IV_LENGTH);

//   const saltHex = bytesToHex(salt);
//   const key = await deriveKey(passcode, saltHex);

//   // AES-256-CBC decrypt — throws if padding is invalid (wrong passcode)
//   const plainBytes = aesCbcDecrypt(key, iv, cipherBytes);

//   // Restore original file
//   const fileName = restoreOriginalFileName(vaultUri);
//   const outPath = `${outputDir}/${fileName}`;
//   await FileSystem.writeAsStringAsync(outPath, bytesToBase64(plainBytes), {
//     encoding: FileSystem.EncodingType.Base64,
//   });

//   return outPath;
// }

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

// ─── AES-256-CBC (pure JS) ─────────────────────────────────────────────────

// function aesCbcEncrypt(key: number[], iv: number[], data: number[]): number[] {
//   const paddedData = pkcs7Pad(data, 16);
//   const aes = new AES(key);
//   const result: number[] = [];
//   let prev = iv;

//   for (let i = 0; i < paddedData.length; i += 16) {
//     const block = paddedData.slice(i, i + 16).map((b, j) => b ^ prev[j]);
//     const enc = aes.encrypt(block);
//     result.push(...enc);
//     prev = enc;
//   }

//   return result;
// }

// function aesCbcDecrypt(key: number[], iv: number[], data: number[]): number[] {
//   if (data.length % 16 !== 0) throw new Error("Invalid ciphertext length");
//   const aes = new AES(key);
//   const result: number[] = [];
//   let prev = iv;

//   for (let i = 0; i < data.length; i += 16) {
//     const block = data.slice(i, i + 16);
//     const dec = aes.decrypt(block).map((b, j) => b ^ prev[j]);
//     result.push(...dec);
//     prev = block;
//   }

//   return pkcs7Unpad(result);
// }

// ─── PKCS7 Padding ────────────────────────────────────────────────────────

// function pkcs7Pad(data: number[], blockSize: number): number[] {
//   const pad = blockSize - (data.length % blockSize);
//   return [...data, ...Array(pad).fill(pad)];
// }

// function pkcs7Unpad(data: number[]): number[] {
//   const pad = data[data.length - 1];
//   if (pad < 1 || pad > 16) throw new Error("Invalid padding — wrong passcode");
//   const content = data.slice(0, data.length - pad);
//   for (let i = data.length - pad; i < data.length; i++) {
//     if (data[i] !== pad) throw new Error("Invalid padding — wrong passcode");
//   }
//   return content;
// }

// ─── PBKDF2-SHA256 (manual implementation) ────────────────────────────────

// async function pbkdf2Sha256(
//   password: number[],
//   salt: number[],
//   iterations: number,
//   keyLen: number,
// ): Promise<number[]> {
//   const hashLen = 32; // SHA-256 output
//   const blocks = Math.ceil(keyLen / hashLen);
//   const result: number[] = [];

//   for (let block = 1; block <= blocks; block++) {
//     const blockBytes = int32ToBytes(block);
//     const initialInput = uint8ArrayToHex(
//       new Uint8Array([...salt, ...blockBytes]),
//     );

//     // U1 = HMAC(password, salt || INT(block))
//     let u = await hmacSha256(password, [...salt, ...blockBytes]);
//     let xored = [...u];

//     for (let i = 1; i < iterations; i++) {
//       u = await hmacSha256(password, u);
//       for (let j = 0; j < xored.length; j++) xored[j] ^= u[j];
//     }

//     result.push(...xored);
//   }

//   return result.slice(0, keyLen);
// }

// async function hmacSha256(key: number[], data: number[]): Promise<number[]> {
//   const blockSize = 64;

//   let keyBytes = key;
//   if (keyBytes.length > blockSize) {
//     keyBytes = hexToBytes(
//       await Crypto.digestStringAsync(
//         Crypto.CryptoDigestAlgorithm.SHA256,
//         bytesToBase64(keyBytes),
//       ),
//     );
//   }

//   // Pad key to block size
//   while (keyBytes.length < blockSize) keyBytes.push(0);

//   const oKeyPad = keyBytes.map((b) => b ^ 0x5c);
//   const iKeyPad = keyBytes.map((b) => b ^ 0x36);

//   const innerInput = bytesToBase64([...iKeyPad, ...data]);
//   const innerHashHex = await Crypto.digestStringAsync(
//     Crypto.CryptoDigestAlgorithm.SHA256,
//     innerInput,
//   );
//   const innerHash = hexToBytes(innerHashHex);

//   const outerInput = bytesToBase64([...oKeyPad, ...innerHash]);
//   const outerHashHex = await Crypto.digestStringAsync(
//     Crypto.CryptoDigestAlgorithm.SHA256,
//     outerInput,
//   );

//   return hexToBytes(outerHashHex);
// }

// ─── AES-256 Block Cipher ─────────────────────────────────────────────────

// class AES {
//   private w: number[][];

//   constructor(key: number[]) {
//     this.w = this.expandKey(key);
//   }

//   encrypt(block: number[]): number[] {
//     let state = [...block];
//     state = this.addRoundKey(state, this.w[0]);

//     for (let round = 1; round < 14; round++) {
//       state = this.subBytes(state);
//       state = this.shiftRows(state);
//       state = this.mixColumns(state);
//       state = this.addRoundKey(state, this.w[round]);
//     }

//     state = this.subBytes(state);
//     state = this.shiftRows(state);
//     state = this.addRoundKey(state, this.w[14]);
//     return state;
//   }

//   decrypt(block: number[]): number[] {
//     let state = [...block];
//     state = this.addRoundKey(state, this.w[14]);

//     for (let round = 13; round >= 1; round--) {
//       state = this.invShiftRows(state);
//       state = this.invSubBytes(state);
//       state = this.addRoundKey(state, this.w[round]);
//       state = this.invMixColumns(state);
//     }

//     state = this.invShiftRows(state);
//     state = this.invSubBytes(state);
//     state = this.addRoundKey(state, this.w[0]);
//     return state;
//   }

//   private expandKey(key: number[]): number[][] {
//     const nk = 8; // AES-256: 8 words
//     const nr = 14;
//     const w: number[][] = [];

//     for (let i = 0; i < nk; i++) {
//       w.push(key.slice(i * 4, i * 4 + 4));
//     }

//     for (let i = nk; i < 4 * (nr + 1); i++) {
//       let temp = [...w[i - 1]];
//       if (i % nk === 0) {
//         temp = this.subWord(this.rotWord(temp));
//         temp[0] ^= RCON[i / nk - 1];
//       } else if (nk > 6 && i % nk === 4) {
//         temp = this.subWord(temp);
//       }
//       w.push(w[i - nk].map((b, j) => b ^ temp[j]));
//     }

//     // Group into round keys (4 words each)
//     const rounds: number[][] = [];
//     for (let r = 0; r <= nr; r++) {
//       const rk: number[] = [];
//       for (let c = 0; c < 4; c++) rk.push(...w[r * 4 + c]);
//       rounds.push(rk);
//     }
//     return rounds;
//   }

//   private addRoundKey(state: number[], key: number[]): number[] {
//     return state.map((b, i) => b ^ key[i]);
//   }

//   private subBytes(state: number[]): number[] {
//     return state.map((b) => SBOX[b]);
//   }

//   private invSubBytes(state: number[]): number[] {
//     return state.map((b) => INV_SBOX[b]);
//   }

//   private shiftRows(s: number[]): number[] {
//     return [
//       s[0],
//       s[5],
//       s[10],
//       s[15],
//       s[4],
//       s[9],
//       s[14],
//       s[3],
//       s[8],
//       s[13],
//       s[2],
//       s[7],
//       s[12],
//       s[1],
//       s[6],
//       s[11],
//     ];
//   }

//   private invShiftRows(s: number[]): number[] {
//     return [
//       s[0],
//       s[13],
//       s[10],
//       s[7],
//       s[4],
//       s[1],
//       s[14],
//       s[11],
//       s[8],
//       s[5],
//       s[2],
//       s[15],
//       s[12],
//       s[9],
//       s[6],
//       s[3],
//     ];
//   }

//   private mixColumns(state: number[]): number[] {
//     const result: number[] = [];
//     for (let c = 0; c < 4; c++) {
//       const i = c * 4;
//       const [s0, s1, s2, s3] = state.slice(i, i + 4);
//       result.push(gMul(2, s0) ^ gMul(3, s1) ^ s2 ^ s3);
//       result.push(s0 ^ gMul(2, s1) ^ gMul(3, s2) ^ s3);
//       result.push(s0 ^ s1 ^ gMul(2, s2) ^ gMul(3, s3));
//       result.push(gMul(3, s0) ^ s1 ^ s2 ^ gMul(2, s3));
//     }
//     return result;
//   }

//   private invMixColumns(state: number[]): number[] {
//     const result: number[] = [];
//     for (let c = 0; c < 4; c++) {
//       const i = c * 4;
//       const [s0, s1, s2, s3] = state.slice(i, i + 4);
//       result.push(
//         gMul(0x0e, s0) ^ gMul(0x0b, s1) ^ gMul(0x0d, s2) ^ gMul(0x09, s3),
//       );
//       result.push(
//         gMul(0x09, s0) ^ gMul(0x0e, s1) ^ gMul(0x0b, s2) ^ gMul(0x0d, s3),
//       );
//       result.push(
//         gMul(0x0d, s0) ^ gMul(0x09, s1) ^ gMul(0x0e, s2) ^ gMul(0x0b, s3),
//       );
//       result.push(
//         gMul(0x0b, s0) ^ gMul(0x0d, s1) ^ gMul(0x09, s2) ^ gMul(0x0e, s3),
//       );
//     }
//     return result;
//   }

//   private subWord(w: number[]): number[] {
//     return w.map((b) => SBOX[b]);
//   }

//   private rotWord(w: number[]): number[] {
//     return [w[1], w[2], w[3], w[0]];
//   }
// }

// // Galois field multiplication
// function gMul(a: number, b: number): number {
//   let p = 0;
//   for (let i = 0; i < 8; i++) {
//     if (b & 1) p ^= a;
//     const hiBit = a & 0x80;
//     a = (a << 1) & 0xff;
//     if (hiBit) a ^= 0x1b;
//     b >>= 1;
//   }
//   return p;
// }

// ─── AES Tables ───────────────────────────────────────────────────────────

// const SBOX = [
//   0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe,
//   0xd7, 0xab, 0x76, 0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4,
//   0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0, 0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7,
//   0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15, 0x04, 0xc7, 0x23, 0xc3,
//   0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75, 0x09,
//   0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3,
//   0x2f, 0x84, 0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe,
//   0x39, 0x4a, 0x4c, 0x58, 0xcf, 0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85,
//   0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8, 0x51, 0xa3, 0x40, 0x8f, 0x92,
//   0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2, 0xcd, 0x0c,
//   0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19,
//   0x73, 0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14,
//   0xde, 0x5e, 0x0b, 0xdb, 0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2,
//   0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79, 0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5,
//   0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08, 0xba, 0x78, 0x25,
//   0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
//   0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86,
//   0xc1, 0x1d, 0x9e, 0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e,
//   0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf, 0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42,
//   0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
// ];

// const INV_SBOX = (() => {
//   const inv = new Array(256).fill(0);
//   SBOX.forEach((val, idx) => {
//     inv[val] = idx;
//   });
//   return inv;
// })();

// const RCON = [
//   0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8, 0xab,
//   0x4d, 0x9a, 0x2f, 0x5e, 0xbc, 0x63, 0xc6, 0x97, 0x35, 0x6a, 0xd4, 0xb3, 0x7d,
//   0xfa, 0xef, 0xc5, 0x91,
// ];

// ─── Utility helpers ──────────────────────────────────────────────────────

// async function randomBytes(length: number): Promise<number[]> {
//   const randomHex = await Crypto.digestStringAsync(
//     Crypto.CryptoDigestAlgorithm.SHA256,
//     `${Date.now()}-${Math.random()}-${length}`,
//   );
//   // Extend if needed
//   let hex = randomHex;
//   while (hex.length < length * 2) {
//     const more = await Crypto.digestStringAsync(
//       Crypto.CryptoDigestAlgorithm.SHA256,
//       hex,
//     );
//     hex += more;
//   }
//   return hexToBytes(hex.slice(0, length * 2));
// }

// function hexToBytes(hex: string): number[] {
//   const bytes: number[] = [];
//   for (let i = 0; i < hex.length; i += 2) {
//     bytes.push(parseInt(hex.slice(i, i + 2), 16));
//   }
//   return bytes;
// }

// function bytesToHex(bytes: number[]): string {
//   return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
// }

// function uint8ArrayToHex(arr: Uint8Array): string {
//   return Array.from(arr)
//     .map((b) => b.toString(16).padStart(2, "0"))
//     .join("");
// }

// function stringToBytes(str: string): number[] {
//   const bytes: number[] = [];
//   for (let i = 0; i < str.length; i++) {
//     bytes.push(str.charCodeAt(i) & 0xff);
//   }
//   return bytes;
// }

// function int32ToBytes(n: number): number[] {
//   return [(n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
// }

// function bytesToInt32(bytes: number[]): number {
//   return (
//     ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0
//   );
// }

// function base64ToBytes(b64: string): number[] {
//   const binary = atob(b64);
//   const bytes: number[] = [];
//   for (let i = 0; i < binary.length; i++) {
//     bytes.push(binary.charCodeAt(i));
//   }
//   return bytes;
// }

// function bytesToBase64(bytes: number[]): string {
//   let binary = "";
//   for (const b of bytes) binary += String.fromCharCode(b);
//   return btoa(binary);
// }

// function generateVaultFileName(sourceUri: string): string {
//   const baseName = sourceUri.split("/").pop() ?? "image";
//   const ts = Date.now();
//   return `${baseName}_${ts}${VAULT_EXTENSION}`;
// }

// function restoreOriginalFileName(vaultUri: string): string {
//   const name = vaultUri.split("/").pop() ?? "decrypted";
//   // Remove .vault and timestamp suffix
//   return name.replace(VAULT_EXTENSION, "").replace(/_\d+$/, "");
// }
