/**
 * VaultStorage — all persistent operations for one vault context.
 *
 * Two instances are created in index.ts (realVault, decoyVault).
 * Each instance owns isolated:
 *   • SecureStore keys  (prefixed by context)
 *   • Filesystem paths  (vault/<context>/)
 *
 * Never instantiate this directly outside of index.ts.
 */

import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system";
import { hashPasscode } from "./passcode";
import {
  VaultContext,
  VaultFile,
  ActivityEntry,
  VAULT_EXTENSION,
  THUMB_EXTENSION,
} from "./types";

// Maximum activity log entries kept per vault
const MAX_ACTIVITY = 50;

export class VaultStorage {
  readonly context: VaultContext;

  // ── SecureStore key namespaces ──────────────────────────────────────────
  private readonly keyPasscodeHash: string;
  private readonly keyActivity: string;
  private readonly keyFavorites: string;
  private readonly keyTags: string;

  // ── Filesystem root for this vault ──────────────────────────────────────
  readonly rootDir: string;

  constructor(context: VaultContext) {
    this.context = context;

    // All SecureStore keys are prefixed so real/decoy never collide
    const p = `obsidian_${context}`;
    this.keyPasscodeHash = `${p}_passcode_hash`;
    this.keyActivity = `${p}_activity`;
    this.keyFavorites = `${p}_favorites`;
    this.keyTags = `${p}_tags`;

    // Filesystem: <documents>/vault/real/ or <documents>/vault/decoy/
    this.rootDir = `${FileSystem.documentDirectory}vault/${context}/`;
  }

  // ── Passcode ─────────────────────────────────────────────────────────────

  async savePasscodeHash(passcode: string): Promise<void> {
    const hash = await hashPasscode(passcode, this.context);
    await SecureStore.setItemAsync(this.keyPasscodeHash, hash);
  }

  async verifyPasscode(passcode: string): Promise<boolean> {
    const stored = await SecureStore.getItemAsync(this.keyPasscodeHash);
    if (!stored) return false;
    const hash = await hashPasscode(passcode, this.context);
    return hash === stored;
  }

  async hasPasscode(): Promise<boolean> {
    const stored = await SecureStore.getItemAsync(this.keyPasscodeHash);
    return stored !== null;
  }

  // ── Directory helpers ────────────────────────────────────────────────────

  /** Ensure the vault root exists. Returns rootDir. */
  async ensureRootDir(): Promise<string> {
    await this._ensureDir(this.rootDir);
    return this.rootDir;
  }

  /**
   * Ensure an album subdirectory exists.
   * albumName = null → returns rootDir (files not in any album).
   */
  async ensureAlbumDir(albumName: string | null): Promise<string> {
    if (!albumName) return this.ensureRootDir();
    const dir = `${this.rootDir}${this._safeAlbumName(albumName)}/`;
    await this._ensureDir(dir);
    return dir;
  }

  /** List all album names (subdirectories inside rootDir). */
  async listAlbums(): Promise<string[]> {
    await this.ensureRootDir();
    const entries = await FileSystem.readDirectoryAsync(this.rootDir);
    const albums: string[] = [];
    for (const entry of entries) {
      const info = await FileSystem.getInfoAsync(`${this.rootDir}${entry}`);
      if (info.exists && info.isDirectory) albums.push(entry);
    }
    return albums.sort();
  }

  /** Create an album directory. Throws if the album already exists. */
  async createAlbum(albumName: string): Promise<string> {
    const dir = `${this.rootDir}${this._safeAlbumName(albumName)}/`;
    const info = await FileSystem.getInfoAsync(dir);
    if (info.exists) {
      throw new Error(`ALBUM_ALREADY_EXISTS:${albumName}`);
    }
    await this._ensureDir(dir);
    return dir;
  }

  /** Rename an album directory. Throws if source does not exist or target already exists. */
  async renameAlbum(oldName: string, newName: string): Promise<void> {
    const oldDir = `${this.rootDir}${this._safeAlbumName(oldName)}/`;
    const newDir = `${this.rootDir}${this._safeAlbumName(newName)}/`;

    // Guard: source must exist
    const oldInfo = await FileSystem.getInfoAsync(oldDir);
    if (!oldInfo.exists || !oldInfo.isDirectory) {
      throw new Error(`ALBUM_NOT_FOUND:${oldName}`);
    }

    // Guard: target must not already exist
    const newInfo = await FileSystem.getInfoAsync(newDir);
    if (newInfo.exists) {
      throw new Error(`ALBUM_ALREADY_EXISTS:${newName}`);
    }

    await this._ensureDir(newDir);
    // Move all files
    const files = await FileSystem.readDirectoryAsync(oldDir);
    for (const file of files) {
      await FileSystem.moveAsync({
        from: `${oldDir}${file}`,
        to: `${newDir}${file}`,
      });
    }
    await FileSystem.deleteAsync(oldDir, { idempotent: true });
  }

  /**
   * Delete an album and all its vault files.
   * Sidecar .thumb files are deleted alongside their .vault files.
   */
  async deleteAlbum(albumName: string): Promise<void> {
    const dir = `${this.rootDir}${this._safeAlbumName(albumName)}/`;
    await FileSystem.deleteAsync(dir, { idempotent: true });
  }

  // ── File operations ──────────────────────────────────────────────────────

  /**
   * Read all vault files across root + all albums.
   * Returns a flat list sorted by createdAt descending.
   */
  // async getVaultFiles(albumFilter?: string | null): Promise<VaultFile[]> {
  //   await this.ensureRootDir();

  //   const files: VaultFile[] = [];

  //   if (albumFilter !== undefined) {
  //     // Scoped to one album (or root if null)
  //     const dir = albumFilter
  //       ? `${this.rootDir}${this._safeAlbumName(albumFilter)}/`
  //       : this.rootDir;
  //     const album = albumFilter ?? null;
  //     await this._collectFilesFromDir(dir, album, files);
  //   } else {
  //     // All files: root-level + every album
  //     await this._collectFilesFromDir(this.rootDir, null, files);
  //     const albums = await this.listAlbums();
  //     for (const album of albums) {
  //       const dir = `${this.rootDir}${album}/`;
  //       await this._collectFilesFromDir(dir, album, files);
  //     }
  //   }

  //   return files.sort((a, b) => b.createdAt - a.createdAt);
  // }

  /**
   * Read all vault files across root + all albums.
   * Returns a flat list sorted by createdAt descending.
   */
  async getVaultFiles(albumFilter?: string | null): Promise<VaultFile[]> {
    await this.ensureRootDir();

    // Load the full favorites set once — O(1) SecureStore read shared across all files
    const favorites = await this.getFavorites();
    const files: VaultFile[] = [];

    if (albumFilter !== undefined) {
      // Scoped to one album (or root if null)
      const dir = albumFilter
        ? `${this.rootDir}${this._safeAlbumName(albumFilter)}/`
        : this.rootDir;
      const album = albumFilter ?? null;
      await this._collectFilesFromDir(dir, album, favorites, files);
    } else {
      // All files: root-level + every album
      await this._collectFilesFromDir(this.rootDir, null, favorites, files);
      const albums = await this.listAlbums();
      for (const album of albums) {
        const dir = `${this.rootDir}${album}/`;
        await this._collectFilesFromDir(dir, album, favorites, files);
      }
    }

    return files.sort((a, b) => b.createdAt - a.createdAt);
  }

  /** Delete a vault file and its associated thumbnail sidecar if present. */
  async deleteVaultFile(uri: string): Promise<void> {
    await FileSystem.deleteAsync(uri, { idempotent: true });
    // Delete sidecar thumbnail if it exists
    const thumbUri = uri.replace(VAULT_EXTENSION, THUMB_EXTENSION);
    await FileSystem.deleteAsync(thumbUri, { idempotent: true });
  }

  /**
   * Move a vault file (and its thumbnail) from one album to another.
   * albumName = null means the vault root.
   */
  async moveFile(uri: string, targetAlbum: string | null): Promise<string> {
    const targetDir = await this.ensureAlbumDir(targetAlbum);
    const fileName = uri.split("/").pop()!;
    const newUri = `${targetDir}${fileName}`;

    await FileSystem.moveAsync({ from: uri, to: newUri });

    // Move sidecar thumbnail if present
    const thumbSrc = uri.replace(VAULT_EXTENSION, THUMB_EXTENSION);
    const thumbInfo = await FileSystem.getInfoAsync(thumbSrc);
    if (thumbInfo.exists) {
      const thumbDest = newUri.replace(VAULT_EXTENSION, THUMB_EXTENSION);
      await FileSystem.moveAsync({ from: thumbSrc, to: thumbDest });
    }

    return newUri;
  }

  // ── Activity log ──────────────────────────────────────────────────────────

  async logActivity(entry: ActivityEntry): Promise<void> {
    const raw = await SecureStore.getItemAsync(this.keyActivity);
    const history: ActivityEntry[] = raw ? JSON.parse(raw) : [];
    history.unshift(entry);
    await SecureStore.setItemAsync(
      this.keyActivity,
      JSON.stringify(history.slice(0, MAX_ACTIVITY)),
    );
  }

  async getActivity(): Promise<ActivityEntry[]> {
    const raw = await SecureStore.getItemAsync(this.keyActivity);
    return raw ? JSON.parse(raw) : [];
  }

  // ── Favorites (persisted as a Set of file URIs) ──────────────────────────

  async getFavorites(): Promise<Set<string>> {
    const raw = await SecureStore.getItemAsync(this.keyFavorites);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  }

  async addFavorite(uri: string): Promise<void> {
    const favs = await this.getFavorites();
    favs.add(uri);
    await SecureStore.setItemAsync(
      this.keyFavorites,
      JSON.stringify([...favs]),
    );
  }

  async removeFavorite(uri: string): Promise<void> {
    const favs = await this.getFavorites();
    favs.delete(uri);
    await SecureStore.setItemAsync(
      this.keyFavorites,
      JSON.stringify([...favs]),
    );
  }

  async isFavorite(uri: string): Promise<boolean> {
    const favs = await this.getFavorites();
    return favs.has(uri);
  }

  // ── Tags (persisted as Record<fileUri, string[]>) ────────────────────────

  async getTags(): Promise<Record<string, string[]>> {
    const raw = await SecureStore.getItemAsync(this.keyTags);
    return raw ? JSON.parse(raw) : {};
  }

  async setFileTags(uri: string, tags: string[]): Promise<void> {
    const all = await this.getTags();
    if (tags.length === 0) {
      delete all[uri];
    } else {
      all[uri] = [...new Set(tags.map((t) => t.trim().toLowerCase()))];
    }
    await SecureStore.setItemAsync(this.keyTags, JSON.stringify(all));
  }

  async addTag(uri: string, tag: string): Promise<void> {
    const all = await this.getTags();
    const current = all[uri] ?? [];
    const normalised = tag.trim().toLowerCase();
    if (!current.includes(normalised)) {
      all[uri] = [...current, normalised];
      await SecureStore.setItemAsync(this.keyTags, JSON.stringify(all));
    }
  }

  async removeTag(uri: string, tag: string): Promise<void> {
    const all = await this.getTags();
    const normalised = tag.trim().toLowerCase();
    all[uri] = (all[uri] ?? []).filter((t) => t !== normalised);
    if (all[uri].length === 0) delete all[uri];
    await SecureStore.setItemAsync(this.keyTags, JSON.stringify(all));
  }

  async getFilesByTag(tag: string): Promise<string[]> {
    const all = await this.getTags();
    const normalised = tag.trim().toLowerCase();
    return Object.entries(all)
      .filter(([, tags]) => tags.includes(normalised))
      .map(([uri]) => uri);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async _ensureDir(path: string): Promise<void> {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(path, { intermediates: true });
    }
  }

  /**
   * Collect .vault files from a single directory into the output array.
   * Skips subdirectories (those are albums, handled separately).
   */
  // private async _collectFilesFromDir(
  //   dir: string,
  //   album: string | null,
  //   out: VaultFile[],
  // ): Promise<void> {
  //   const dirInfo = await FileSystem.getInfoAsync(dir);
  //   if (!dirInfo.exists) return;

  //   const entries = await FileSystem.readDirectoryAsync(dir);

  //   for (const name of entries) {
  //     if (!name.endsWith(VAULT_EXTENSION)) continue;

  //     const uri = `${dir}${name}`;
  //     const info = await FileSystem.getInfoAsync(uri);
  //     if (!info.exists || info.isDirectory) continue;

  //     // Check for thumbnail sidecar
  //     const thumbUri = uri.replace(VAULT_EXTENSION, THUMB_EXTENSION);
  //     const thumbInfo = await FileSystem.getInfoAsync(thumbUri);

  //     out.push({
  //       name,
  //       uri,
  //       thumbUri: thumbInfo.exists ? thumbUri : null,
  //       size: (info as any).size ?? 0,
  //       createdAt: (info as any).modificationTime ?? Date.now(),
  //       album,
  //     });
  //   }
  // }

  /**
   * Collect .vault files from a single directory into the output array.
   * Skips subdirectories (those are albums, handled separately).
   */
  private async _collectFilesFromDir(
    dir: string,
    album: string | null,
    favorites: Set<string>,
    out: VaultFile[],
  ): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) return;

    const entries = await FileSystem.readDirectoryAsync(dir);

    for (const name of entries) {
      if (!name.endsWith(VAULT_EXTENSION)) continue;

      const uri = `${dir}${name}`;
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists || info.isDirectory) continue;

      // Check for thumbnail sidecar
      const thumbUri = uri.replace(VAULT_EXTENSION, THUMB_EXTENSION);
      const thumbInfo = await FileSystem.getInfoAsync(thumbUri);

      out.push({
        name,
        uri,
        thumbUri: thumbInfo.exists ? thumbUri : null,
        size: (info as any).size ?? 0,
        createdAt: (info as any).modificationTime ?? Date.now(),
        album,
        isFavorite: favorites.has(uri),
      });
    }
  }

  /** Strip characters unsafe for directory names. */
  private _safeAlbumName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_\-. ]/g, "_").trim();
  }
}
