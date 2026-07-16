/**
 * ThumbnailCache — decrypt-on-demand cache for the grid's `.thumb` sidecars.
 *
 * The grid never decrypts full-resolution vault files. Instead it decrypts
 * the small `.thumb` sidecar (generated at import time, see
 * services/encryption.ts's generateEncryptedThumbnail) into a scratch
 * directory under FileSystem.cacheDirectory, and remembers the resulting
 * path in an in-memory LRU so re-scrolling the same tile doesn't re-decrypt.
 *
 * Security: this cache holds *decrypted* plaintext image bytes outside the
 * vault. It must be purged on lock, on vault-context switch, and on app
 * cold start (in case a previous session crashed before it could clean up)
 * — see purgeThumbnailCache(), called from hooks/useAuth.tsx.
 */

import * as FileSystem from "expo-file-system";
import { decryptImage } from "./encryption";
import type { VaultFile } from "./storage";

const CACHE_DIR = `${FileSystem.cacheDirectory}thumbcache/`;

// Comfortably larger than what fits on screen at once, so scrolling back
// up stays instant without unbounded disk growth for large vaults.
const MAX_CACHE_ENTRIES = 200;

// Caps how many thumbnails decrypt in parallel — decrypting dozens of grid
// cells at once would saturate the JS thread and jank scrolling.
const MAX_CONCURRENT_DECRYPTS = 4;

// filename (VaultFile.name) -> decrypted cache file uri.
// Map preserves insertion order, which we exploit for LRU eviction below.
const memoryCache = new Map<string, string>();

let activeDecrypts = 0;
const pendingQueue: Array<() => void> = [];

async function withConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (activeDecrypts >= MAX_CONCURRENT_DECRYPTS) {
    await new Promise<void>((resolve) => pendingQueue.push(resolve));
  }
  activeDecrypts++;
  try {
    return await fn();
  } finally {
    activeDecrypts--;
    const next = pendingQueue.shift();
    if (next) next();
  }
}

async function ensureCacheDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

/** Move (or insert) an entry to the most-recently-used end, evicting the
 * oldest entry past MAX_CACHE_ENTRIES. */
function touchLru(name: string, uri: string): void {
  memoryCache.delete(name);
  memoryCache.set(name, uri);

  if (memoryCache.size > MAX_CACHE_ENTRIES) {
    const oldestName = memoryCache.keys().next().value;
    if (oldestName !== undefined) {
      const oldestUri = memoryCache.get(oldestName);
      memoryCache.delete(oldestName);
      if (oldestUri) {
        FileSystem.deleteAsync(oldestUri, { idempotent: true }).catch(
          () => {},
        );
      }
    }
  }
}

/**
 * Returns a local file uri for the decrypted thumbnail of `file`, decrypting
 * and caching it on first request. Returns `null` if the file has no
 * thumbnail sidecar, or if anything about decryption fails — callers should
 * treat `null` as "show the placeholder icon," never as an error.
 */
export async function getDecryptedThumb(
  file: VaultFile,
  passcode: string,
): Promise<string | null> {
  if (!file.thumbUri) return null;

  const cached = memoryCache.get(file.name);
  if (cached) {
    const info = await FileSystem.getInfoAsync(cached);
    if (info.exists) {
      touchLru(file.name, cached);
      return cached;
    }
    // Cached path vanished from disk (purged/evicted externally) — fall
    // through and re-decrypt.
    memoryCache.delete(file.name);
  }

  try {
    await ensureCacheDir();
    return await withConcurrencyLimit(async () => {
      const outPath = await decryptImage(file.thumbUri!, passcode, CACHE_DIR);
      touchLru(file.name, outPath);
      return outPath;
    });
  } catch {
    return null;
  }
}

/**
 * Delete every decrypted thumbnail on disk and clear the in-memory index.
 * Must be called on lock, on vault-context switch, and at app startup —
 * this cache holds plaintext image data outside the encrypted vault and
 * must never survive past the session that decrypted it.
 */
export async function purgeThumbnailCache(): Promise<void> {
  memoryCache.clear();
  await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true }).catch(
    () => {},
  );
}
