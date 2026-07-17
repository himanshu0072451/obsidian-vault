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
import {
  VaultIndexData,
  IndexEntry,
  loadIndex,
  saveIndex,
  createIndex,
  indexAddEntry,
  indexRemoveEntry,
  indexUpdateEntryAlbum,
  indexUpdateTags,
} from "./VaultIndex";

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
    const oldSafe = this._safeAlbumName(oldName);
    const newSafe = this._safeAlbumName(newName);
    const oldDir = `${this.rootDir}${oldSafe}/`;
    const newDir = `${this.rootDir}${newSafe}/`;

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

    // Update index — fire-and-forget after filesystem rename succeeds
    this._renameAlbumInIndex(oldSafe, newSafe);
  }

  /**
   * Delete an album and all its vault files.
   * Sidecar .thumb files are deleted alongside their .vault files.
   */
  async deleteAlbum(albumName: string): Promise<void> {
    const safeName = this._safeAlbumName(albumName);
    const dir = `${this.rootDir}${safeName}/`;
    await FileSystem.deleteAsync(dir, { idempotent: true });

    // Remove all index entries belonging to this album — fire-and-forget
    this._purgeAlbumFromIndex(safeName);
  }

  // ── File operations ──────────────────────────────────────────────────────

  /**
   * Read all vault files across root + all albums.
   * Returns a flat list sorted by createdAt descending.
   *
   * Fast path: if vault-index.json exists and is valid, metadata is read
   * from the index in a single filesystem read — no per-file IPC calls.
   *
   * Fallback path: if the index is absent or corrupt, the existing
   * filesystem scan runs unchanged. The scan result is then persisted
   * as a new index for future calls.
   *
   * albumFilter behaviour is preserved: undefined = all, null = root
   * only, string = specific album name.
   */
  async getVaultFiles(albumFilter?: string | null): Promise<VaultFile[]> {
    await this.ensureRootDir();

    const index = await loadIndex(this.context);

    if (index !== null) {
      // ── Fast path: serve from index ─────────────────────────────────────
      return this._buildFromIndex(index, albumFilter);
    }

    // ── Fallback path: filesystem scan (current behaviour, unchanged) ────
    const favorites = await this.getFavorites();
    const files: VaultFile[] = [];

    if (albumFilter !== undefined) {
      const dir = albumFilter
        ? `${this.rootDir}${this._safeAlbumName(albumFilter)}/`
        : this.rootDir;
      const album = albumFilter ?? null;
      await this._collectFilesFromDir(dir, album, favorites, files);
    } else {
      await this._collectFilesFromDir(this.rootDir, null, favorites, files);
      const albums = await this.listAlbums();
      for (const album of albums) {
        const dir = `${this.rootDir}${album}/`;
        await this._collectFilesFromDir(dir, album, favorites, files);
      }
    }

    const sorted = files.sort((a, b) => b.createdAt - a.createdAt);

    // Persist the scan result as the index for future loads.
    // If this write fails (disk full, permissions) we still return the
    // correct data — the next call will simply scan and retry.
    // Only build a full index when albumFilter is undefined (full scan);
    // a partial scan cannot represent the complete vault state.
    if (albumFilter === undefined) {
      this._persistIndexFromScan(sorted, favorites).catch(() => {
        // Non-fatal — index is advisory, not required for correctness
      });
    }

    return sorted;
  }

  /**
   * Record a newly encrypted file in the index.
   * Must be called by callers (useVaultOperations) after a successful
   * encryptImage() call. We cannot call this from inside encryptImage()
   * because encryption.ts has no vault context.
   *
   * Does a getInfoAsync to get the actual on-disk size — one IPC call per
   * encrypt, which is negligible compared to the AES/PBKDF2 work already done.
   * Fire-and-forget: if this fails the file still exists on disk and the
   * fallback scan will pick it up on next load.
   */
  async recordEncryptedFile(
    outPath: string,
    albumName: string | null,
    displayName?: string,
    hasThumb: boolean = false,
    colors?: string[] | null,
  ): Promise<void> {
    try {
      const info = await FileSystem.getInfoAsync(outPath);
      if (!info.exists) return;

      const name = outPath.split("/").pop()!;
      const entry: IndexEntry = {
        name,
        album: albumName,
        size: (info as any).size ?? 0,
        createdAt: Math.floor(
          (info as any).modificationTime ?? Date.now() / 1000,
        ),
        hasThumb,
        colors: colors ?? undefined,
        displayName,
      };

      const current = (await loadIndex(this.context)) ?? createIndex();
      const updated = indexAddEntry(current, entry);
      await saveIndex(this.context, updated);
    } catch {
      // Non-fatal — index will self-correct on next full scan
    }
  }

  /** Delete a vault file and its associated thumbnail sidecar if present. */
  async deleteVaultFile(uri: string): Promise<void> {
    await FileSystem.deleteAsync(uri, { idempotent: true });
    // Delete sidecar thumbnail if it exists
    const thumbUri = uri.replace(VAULT_EXTENSION, THUMB_EXTENSION);
    await FileSystem.deleteAsync(thumbUri, { idempotent: true });

    // Update index — fire-and-forget after filesystem delete succeeds
    this._removeFromIndex(uri.split("/").pop()!);
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

    // Update index — fire-and-forget after filesystem move succeeds
    this._updateAlbumInIndex(fileName, targetAlbum);

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

  // ── Tags (synced through VaultIndex; keyed by filename, not URI) ─────────

  private _normaliseTag(tag: string): string {
    const trimmed = tag.trim().replace(/\s+/g, " ");
    return trimmed
      .split(" ")
      .map((word) =>
        word.length === 0
          ? word
          : word[0].toUpperCase() + word.slice(1).toLowerCase(),
      )
      .join(" ");
  }

  async addTags(uri: string, tags: string[]): Promise<void> {
    const name = uri.split("/").pop()!;
    const normalisedNew = tags
      .map((t) => this._normaliseTag(t))
      .filter((t) => t.length > 0);
    if (normalisedNew.length === 0) return;

    const current = (await loadIndex(this.context)) ?? createIndex();
    const existingTags = current.tags[name] ?? [];
    const merged = [...existingTags];
    for (const tag of normalisedNew) {
      if (!merged.includes(tag)) merged.push(tag);
    }

    const updated = indexUpdateTags(current, name, merged);
    await saveIndex(this.context, updated);
  }

  async addTag(uri: string, tag: string): Promise<void> {
    await this.addTags(uri, [tag]);
  }

  async removeTag(uri: string, tag: string): Promise<void> {
    const name = uri.split("/").pop()!;
    const normalised = this._normaliseTag(tag);

    const current = await loadIndex(this.context);
    if (!current) return;

    const existingTags = current.tags[name] ?? [];
    const filtered = existingTags.filter((t) => t !== normalised);
    if (filtered.length === existingTags.length) return;

    const updated = indexUpdateTags(current, name, filtered);
    await saveIndex(this.context, updated);
  }

  async getAllTags(): Promise<string[]> {
    const index = await loadIndex(this.context);
    if (!index) return [];

    const distinct = new Set<string>();
    for (const tags of Object.values(index.tags)) {
      for (const tag of tags) distinct.add(tag);
    }
    return [...distinct].sort((a, b) => a.localeCompare(b));
  }

  async rebuildIndex(): Promise<void> {
    await this.ensureRootDir();
    const favorites = await this.getFavorites();
    const files: VaultFile[] = [];
    await this._collectFilesFromDir(this.rootDir, null, favorites, files);
    const albums = await this.listAlbums();
    for (const album of albums) {
      const dir = `${this.rootDir}${album}/`;
      await this._collectFilesFromDir(dir, album, favorites, files);
    }
    const sorted = files.sort((a, b) => b.createdAt - a.createdAt);
    await this._persistIndexFromScan(sorted, favorites);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Build a VaultFile[] from the index, applying the album filter and
   * merging current favorites from SecureStore.
   *
   * Favorites in the index are stored as filenames; SecureStore stores
   * them as full URIs. We read SecureStore here to stay consistent with
   * the existing addFavorite/removeFavorite API which has not been
   * migrated to the index yet (Phase 1C).
   */
  private async _buildFromIndex(
    index: VaultIndexData,
    albumFilter: string | null | undefined,
  ): Promise<VaultFile[]> {
    // Favorites still live in SecureStore for now — read once
    const favorites = await this.getFavorites();

    const results: VaultFile[] = [];

    for (const entry of Object.values(index.files)) {
      // Apply album filter
      if (albumFilter !== undefined) {
        const targetAlbum = albumFilter ?? null;
        if (entry.album !== targetAlbum) continue;
      }

      // Reconstruct the full URI from rootDir + optional album subdir + name
      const dir = entry.album ? `${this.rootDir}${entry.album}/` : this.rootDir;
      const uri = `${dir}${entry.name}`;

      const thumbUri = entry.hasThumb
        ? uri.replace(VAULT_EXTENSION, THUMB_EXTENSION)
        : null;

      results.push({
        name: entry.name,
        uri,
        thumbUri,
        colors: entry.colors ?? null,
        size: entry.size,
        createdAt: entry.createdAt,
        album: entry.album,
        isFavorite: favorites.has(uri),
        tags: index.tags[entry.name] ?? [],
        displayName: entry.displayName,
      });
    }

    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Build a VaultIndexData from the results of a full filesystem scan
   * and write it to disk.
   *
   * favorites: the Set<string> of full URIs already loaded during the scan.
   * We convert to filenames for storage in the index (URIs contain the
   * documentDirectory prefix which can change across app installs on Android).
   *
   * Called fire-and-forget from the fallback scan path; errors are caught
   * by the caller.
   */
  private async _persistIndexFromScan(
    files: VaultFile[],
    favorites: Set<string>,
  ): Promise<void> {
    let index = createIndex();

    // Build a reverse map: uri → filename for the favorites conversion
    const uriToName = new Map<string, string>(
      files.map((f) => [f.uri, f.name]),
    );

    // Convert full-URI favorites to filename-based favorites for the index
    const favoriteNames: string[] = [];
    for (const uri of favorites) {
      const name = uriToName.get(uri);
      if (name) favoriteNames.push(name);
    }
    index = { ...index, favorites: favoriteNames };

    // Add each scanned file as an index entry
    for (const file of files) {
      const entry: IndexEntry = {
        name: file.name,
        album: file.album,
        size: file.size,
        createdAt: file.createdAt,
        hasThumb: file.thumbUri !== null,
        colors: file.colors ?? undefined,
        displayName: file.displayName,
      };
      index = indexAddEntry(index, entry);
    }

    await saveIndex(this.context, index);
  }

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
        // Colors aren't recoverable from a filesystem rescan without
        // re-decrypting every file — same limitation this path already has
        // for tags. Falls back to the plain monochrome grid background.
        colors: null,
        size: (info as any).size ?? 0,
        createdAt: (info as any).modificationTime ?? Date.now(),
        album,
        isFavorite: favorites.has(uri),
        tags: [],
        displayName: undefined,
      });
    }
  }

  /** Strip characters unsafe for directory names. */
  private _safeAlbumName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_\-. ]/g, "_").trim();
  }

  // ── Private index mutation helpers ────────────────────────────────────────
  // All three are fire-and-forget — they swallow errors so callers never
  // need to handle index failures as part of their primary operation.

  private _removeFromIndex(name: string): void {
    (async () => {
      try {
        const current = await loadIndex(this.context);
        if (!current || !current.files[name]) return; // already absent
        const updated = indexRemoveEntry(current, name);
        await saveIndex(this.context, updated);
      } catch {
        /* non-fatal */
      }
    })();
  }

  private _updateAlbumInIndex(name: string, newAlbum: string | null): void {
    (async () => {
      try {
        const current = await loadIndex(this.context);
        if (!current) return;
        const updated = indexUpdateEntryAlbum(current, name, newAlbum);
        await saveIndex(this.context, updated);
      } catch {
        /* non-fatal */
      }
    })();
  }

  /**
   * Bulk-update every index entry whose album field matches oldSafeName
   * to newSafeName. Called after a successful renameAlbum filesystem move.
   * Uses sanitised names (already passed through _safeAlbumName) so they
   * match exactly what is stored in the index.
   */
  private _renameAlbumInIndex(oldSafeName: string, newSafeName: string): void {
    (async () => {
      try {
        const current = await loadIndex(this.context);
        if (!current) return;

        let changed = false;
        const files = { ...current.files };
        for (const name of Object.keys(files)) {
          if (files[name].album === oldSafeName) {
            files[name] = { ...files[name], album: newSafeName };
            changed = true;
          }
        }

        // Only write if something actually changed
        if (changed) {
          await saveIndex(this.context, { ...current, files });
        }
      } catch {
        /* non-fatal */
      }
    })();
  }

  private _purgeAlbumFromIndex(safeName: string): void {
    (async () => {
      try {
        const current = await loadIndex(this.context);
        if (!current) return;
        // Filter out all entries belonging to this album
        const filtered = Object.values(current.files).filter(
          (e) => e.album !== safeName,
        );
        const files: VaultIndexData["files"] = {};
        for (const entry of filtered) files[entry.name] = entry;
        await saveIndex(this.context, { ...current, files });
      } catch {
        /* non-fatal */
      }
    })();
  }
}
