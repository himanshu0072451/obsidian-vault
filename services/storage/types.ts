/**
 * Shared types for the vault storage system.
 * Import from here, not from individual service files.
 */

/** Which vault context is active in the current session. */
export type VaultContext = 'real' | 'decoy';

/** A single encrypted file entry returned by the storage layer. */
export interface VaultFile {
  name: string;
  uri: string;
  /** URI to the encrypted thumbnail sidecar, if it exists. */
  thumbUri: string | null;
  size: number;
  /** Unix timestamp in seconds (from filesystem modificationTime). */
  createdAt: number;
  /** Album name (subdirectory), or null if in the vault root. */
  album: string | null;
}

/** A single activity log entry. */
export interface ActivityEntry {
  type: 'encrypt' | 'decrypt' | 'delete' | 'import' | 'move' | 'album_create' | 'album_delete';
  fileCount: number;
  timestamp: number;
  /** Optional detail — e.g. album name for move/album actions. */
  detail?: string;
}

/** File extensions the vault system recognises as encrypted content. */
export const VAULT_EXTENSION = '.vault';
export const THUMB_EXTENSION = '.thumb';
