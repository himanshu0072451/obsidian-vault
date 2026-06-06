/**
 * AlbumService — business logic for album management.
 *
 * Sits between VaultStorage (filesystem) and useAlbums (React state).
 * Responsibilities:
 *   • Validate album names before touching the filesystem
 *   • Translate raw storage errors into typed AlbumErrors
 *   • Log all mutating operations to the activity timeline
 *   • Never import from React or hooks
 *
 * Usage:
 *   const svc = new AlbumService(vault);  // vault = VaultStorage instance
 */

import * as FileSystem from 'expo-file-system';
import { VaultStorage } from './storage/VaultStorage';
import type { VaultFile } from './storage/types';
import {
  AlbumNotFoundError,
  AlbumAlreadyExistsError,
  InvalidAlbumNameError,
} from './AlbumErrors';

// Names reserved by the filesystem layout — match VaultContext values
const RESERVED_NAMES = new Set(['real', 'decoy']);
const MAX_NAME_LENGTH = 50;

export class AlbumService {
  private readonly vault: VaultStorage;

  constructor(vault: VaultStorage) {
    this.vault = vault;
  }

  // ── Queries ──────────────────────────────────────────────────────────────

  /** Return all album names for the active vault, sorted alphabetically. */
  async listAlbums(): Promise<string[]> {
    return this.vault.listAlbums();
  }

  /**
   * Return all vault files, optionally scoped to one album.
   *   albumFilter = undefined → all files across every album + root
   *   albumFilter = null      → files in vault root only
   *   albumFilter = 'name'    → files in that album only
   */
  async getFiles(albumFilter?: string | null): Promise<VaultFile[]> {
    return this.vault.getVaultFiles(albumFilter);
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  /**
   * Create a new album.
   * @throws {InvalidAlbumNameError} if the name fails validation
   * @throws {AlbumAlreadyExistsError} if an album with that name already exists
   */
  async createAlbum(name: string): Promise<void> {
    const validated = this._validateName(name);

    try {
      await this.vault.createAlbum(validated);
    } catch (e: any) {
      this._rethrow(e, validated);
    }

    await this.vault.logActivity({
      type: 'album_create',
      fileCount: 0,
      timestamp: Date.now(),
      detail: validated,
    });
  }

  /**
   * Rename an existing album.
   * @throws {InvalidAlbumNameError} if either name fails validation
   * @throws {AlbumNotFoundError} if the source album does not exist
   * @throws {AlbumAlreadyExistsError} if the target name is already taken
   */
  async renameAlbum(oldName: string, newName: string): Promise<void> {
    // Validate both sides before touching the filesystem
    const validatedOld = this._validateName(oldName);
    const validatedNew = this._validateName(newName);

    // Renaming to the same name is a no-op, not an error
    if (validatedOld === validatedNew) return;

    try {
      await this.vault.renameAlbum(validatedOld, validatedNew);
    } catch (e: any) {
      this._rethrow(e, validatedNew);
    }

    await this.vault.logActivity({
      type: 'album_rename',
      fileCount: 0,
      timestamp: Date.now(),
      detail: `${validatedOld} → ${validatedNew}`,
    });
  }

  /**
   * Delete an album and all encrypted files inside it.
   * @throws {AlbumNotFoundError} if the album does not exist
   */
  async deleteAlbum(name: string): Promise<void> {
    const validated = this._validateName(name);

    // Check existence before delegating — deleteAlbum is idempotent in
    // VaultStorage, so we'd never know if the name was wrong otherwise.
    const albums = await this.vault.listAlbums();
    if (!albums.includes(validated)) {
      throw new AlbumNotFoundError(validated);
    }

    // Count files first so the activity entry is accurate
    const files = await this.vault.getVaultFiles(validated);
    const fileCount = files.length;

    await this.vault.deleteAlbum(validated);

    await this.vault.logActivity({
      type: 'album_delete',
      fileCount,
      timestamp: Date.now(),
      detail: validated,
    });
  }

  /**
   * Move a vault file to a different album (or to the root if targetAlbum is null).
   * Returns the new URI of the moved file.
   * @throws {AlbumNotFoundError} if targetAlbum is specified but does not exist
   */
  async moveFile(fileUri: string, targetAlbum: string | null): Promise<string> {
    if (targetAlbum !== null) {
      const validated = this._validateName(targetAlbum);
      const albums = await this.vault.listAlbums();
      if (!albums.includes(validated)) {
        throw new AlbumNotFoundError(validated);
      }
    }

    let newUri: string;
    try {
      newUri = await this.vault.moveFile(fileUri, targetAlbum);
    } catch (e: any) {
      // Filesystem errors during move are unexpected; surface as-is
      throw new Error(`Failed to move file: ${e?.message ?? 'unknown error'}`);
    }

    await this.vault.logActivity({
      type: 'move',
      fileCount: 1,
      timestamp: Date.now(),
      detail: targetAlbum ?? '(root)',
    });

    return newUri;
  }

  // ── Validation ────────────────────────────────────────────────────────────

  /**
   * Validate and normalise an album name.
   * Returns the trimmed name if valid.
   * @throws {InvalidAlbumNameError}
   */
  private _validateName(name: string): string {
    const trimmed = name.trim();

    if (trimmed.length === 0) {
      throw new InvalidAlbumNameError('empty');
    }

    if (trimmed.length > MAX_NAME_LENGTH) {
      throw new InvalidAlbumNameError('too_long');
    }

    if (RESERVED_NAMES.has(trimmed.toLowerCase())) {
      throw new InvalidAlbumNameError('reserved', trimmed);
    }

    return trimmed;
  }

  // ── Error translation ─────────────────────────────────────────────────────

  /**
   * Translate sentinel error messages thrown by VaultStorage into typed errors.
   * VaultStorage uses `Error('ALBUM_NOT_FOUND:name')` and
   * `Error('ALBUM_ALREADY_EXISTS:name')` as its signal format.
   */
  private _rethrow(e: any, contextName: string): never {
    const msg: string = e?.message ?? '';

    if (msg.startsWith('ALBUM_NOT_FOUND:')) {
      const name = msg.slice('ALBUM_NOT_FOUND:'.length) || contextName;
      throw new AlbumNotFoundError(name);
    }

    if (msg.startsWith('ALBUM_ALREADY_EXISTS:')) {
      const name = msg.slice('ALBUM_ALREADY_EXISTS:'.length) || contextName;
      throw new AlbumAlreadyExistsError(name);
    }

    // Unknown storage error — rethrow as-is
    throw e;
  }
}
