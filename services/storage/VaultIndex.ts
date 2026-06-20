/**
 * VaultIndex — persistent metadata index for a single vault context.
 *
 * Phase 1A: schema definition + read/write helpers only.
 * Nothing in the existing codebase imports or calls this yet.
 * No existing behaviour is changed.
 *
 * Purpose:
 *   The current getVaultFiles() does O(2N) serial filesystem IPC calls
 *   (one getInfoAsync per .vault file + one per .thumb sidecar).
 *   At 10,000 files that is ~20,000 bridge crossings per load.
 *
 *   This index collapses that to a single FileSystem.readAsStringAsync call
 *   regardless of vault size. Phase 1B will wire getVaultFiles() to use it.
 *
 * Storage location:
 *   <documentDirectory>/vault/<context>/vault-index.json
 *
 *   Stored as plaintext JSON alongside encrypted vault files.
 *   The index contains only metadata (names, sizes, dates, album names,
 *   favorites, tags) — never decrypted image data or passcodes.
 *   The vault files themselves remain AES-256 encrypted as before.
 *
 * Concurrency model:
 *   All writes go through saveIndex(), which is the single serialisation
 *   point. Callers are responsible for not issuing concurrent writes.
 *   In practice every mutation path (encrypt, delete, favorite, tag)
 *   is already sequential in the current architecture.
 *
 * Schema versioning:
 *   The `version` field allows future migrations. Any reader that finds
 *   a version it does not recognise should treat the index as absent and
 *   fall back to a full filesystem reconciliation scan.
 */

import * as FileSystem from 'expo-file-system';
import type { VaultContext } from './types';

// ─── Schema ──────────────────────────────────────────────────────────────────

/** Current schema version. Increment when making breaking changes. */
const CURRENT_VERSION = 1;

/** Filename written inside the vault root directory. */
const INDEX_FILENAME = 'vault-index.json';

/**
 * Metadata for a single encrypted file as stored in the index.
 * Intentionally separate from VaultFile — the index entry does not
 * include `isFavorite` (derived from `favorites` set at read time)
 * and does not include the full `uri` (derived from rootDir + name).
 */
export interface IndexEntry {
  /** Filename including .vault extension, e.g. "photo_1705340000123.vault" */
  name: string;
  /**
   * Album subdirectory name, or null for files in the vault root.
   * Matches the directory name on disk (already sanitised).
   */
  album: string | null;
  /** File size in bytes. */
  size: number;
  /**
   * Unix timestamp in seconds (matches filesystem modificationTime).
   * Stored as a number, not a Date, for JSON round-trip safety.
   */
  createdAt: number;
  /**
   * Whether a .thumb sidecar exists for this file.
   * false until Phase 3 implements thumbnail generation.
   */
  hasThumb: boolean;
}

/**
 * The full index document written to vault-index.json.
 */
export interface VaultIndexData {
  /** Schema version. Must equal CURRENT_VERSION to be usable. */
  version: number;
  /**
   * Unix ms timestamp of the last write.
   * Used to detect external modifications during reconciliation.
   */
  lastModified: number;
  /**
   * Map of filename → entry metadata.
   * Key is IndexEntry.name (the .vault filename).
   * Using a Record rather than an array makes O(1) lookups and upserts
   * possible without scanning the full list.
   */
  files: Record<string, IndexEntry>;
  /**
   * Set of .vault filenames that are favorited.
   * Stored as an array for JSON serialisation; loaded as a Set.
   * Using filenames rather than full URIs keeps the index relocatable
   * if the documentDirectory path changes (e.g. app reinstall on Android).
   */
  favorites: string[];
  /**
   * Map of .vault filename → tag array.
   * Tags are lowercased and trimmed before storage.
   */
  tags: Record<string, string[]>;
}

// ─── Path helper ─────────────────────────────────────────────────────────────

/**
 * Returns the absolute path to vault-index.json for a given vault context.
 * Mirrors the rootDir convention in VaultStorage:
 *   <documentDirectory>/vault/<context>/vault-index.json
 */
export function getIndexPath(context: VaultContext): string {
  return `${FileSystem.documentDirectory}vault/${context}/${INDEX_FILENAME}`;
}

// ─── Empty index factory ─────────────────────────────────────────────────────

/**
 * Returns a new, empty VaultIndexData with the current schema version.
 * Used when no index file exists yet (first launch, or after a reset).
 */
export function createIndex(): VaultIndexData {
  return {
    version: CURRENT_VERSION,
    lastModified: Date.now(),
    files: {},
    favorites: [],
    tags: {},
  };
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Load the index from disk for the given vault context.
 *
 * Returns:
 *   - A parsed VaultIndexData if the file exists and is a recognised version.
 *   - null if the file does not exist (first launch).
 *   - null if the file is corrupt (unparseable JSON).
 *   - null if the schema version does not match CURRENT_VERSION.
 *
 * Callers that receive null must fall back to a full filesystem scan
 * (getVaultFiles()) and then call saveIndex() with the reconciled result.
 *
 * Never throws — all error paths return null so callers have a single
 * branch to handle rather than try/catch at every call site.
 */
export async function loadIndex(context: VaultContext): Promise<VaultIndexData | null> {
  const path = getIndexPath(context);

  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;

    const raw = await FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const parsed: VaultIndexData = JSON.parse(raw);

    // Version mismatch → treat as absent and trigger reconciliation
    if (parsed.version !== CURRENT_VERSION) return null;

    // Structural guard: ensure required fields are present
    if (
      typeof parsed.lastModified !== 'number' ||
      typeof parsed.files !== 'object' ||
      !Array.isArray(parsed.favorites) ||
      typeof parsed.tags !== 'object'
    ) {
      return null;
    }

    return parsed;
  } catch {
    // JSON.parse failure, file read error, or getInfoAsync error
    return null;
  }
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Persist the index to disk, stamping `lastModified` with the current time.
 *
 * Writes atomically: the JSON is serialised fully before the file write
 * begins, so a crash mid-write leaves the old file intact (FileSystem
 * writeAsStringAsync replaces the file in a single operation on both
 * iOS and Android).
 *
 * Throws if the write fails — callers should surface this as a non-fatal
 * warning; the app can continue without the index (it falls back to scan).
 */
export async function saveIndex(
  context: VaultContext,
  data: VaultIndexData
): Promise<void> {
  const path = getIndexPath(context);

  // Stamp the write time before serialising
  const payload: VaultIndexData = {
    ...data,
    lastModified: Date.now(),
  };

  await FileSystem.writeAsStringAsync(
    path,
    JSON.stringify(payload),
    { encoding: FileSystem.EncodingType.UTF8 }
  );
}

// ─── Incremental helpers ──────────────────────────────────────────────────────
// These are used by Phase 1B mutating paths (encrypt, delete, move).
// They operate on an in-memory VaultIndexData and return the updated copy;
// callers must call saveIndex() afterwards.

/**
 * Add or replace a single file entry in the index.
 * Returns the updated index (does not mutate the input).
 */
export function indexAddEntry(
  data: VaultIndexData,
  entry: IndexEntry
): VaultIndexData {
  return {
    ...data,
    files: {
      ...data.files,
      [entry.name]: entry,
    },
  };
}

/**
 * Remove a file entry from the index by filename.
 * Also removes any associated favorites and tags for that file.
 * Returns the updated index (does not mutate the input).
 */
export function indexRemoveEntry(
  data: VaultIndexData,
  name: string
): VaultIndexData {
  const files = { ...data.files };
  delete files[name];

  const tags = { ...data.tags };
  delete tags[name];

  const favorites = data.favorites.filter((f) => f !== name);

  return { ...data, files, tags, favorites };
}

/**
 * Rename a file entry (used when moveFile changes the album subdirectory,
 * which changes the filename's logical location but not the name itself —
 * however, if the file is moved and its album changes, this updates the
 * album field on the existing entry).
 * Returns the updated index (does not mutate the input).
 */
export function indexUpdateEntryAlbum(
  data: VaultIndexData,
  name: string,
  newAlbum: string | null
): VaultIndexData {
  const existing = data.files[name];
  if (!existing) return data;

  return {
    ...data,
    files: {
      ...data.files,
      [name]: { ...existing, album: newAlbum },
    },
  };
}
