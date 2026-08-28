// Typed errors from AlbumService are caught here and converted to
// human-readable strings stored in `error`; unknown errors are re-thrown
// so they still surface in crash reporters.

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useVault } from './useAuth';
import { AlbumService } from '../services/AlbumService';
import {
  AlbumNotFoundError,
  AlbumAlreadyExistsError,
  InvalidAlbumNameError,
} from '../services/AlbumErrors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseAlbumsResult {
  /** Sorted list of album names for the active vault. */
  albums: string[];
  isLoading: boolean;
  /** User-facing error message from the last failed operation, or null. */
  error: string | null;
  /** Clear the current error. Call after the UI has displayed it. */
  clearError: () => void;
  /** Reload the album list from disk. */
  refresh: () => Promise<void>;
  /** Create a new album. Returns true on success, false on expected error. */
  createAlbum: (name: string) => Promise<boolean>;
  /** Rename an album. Returns true on success, false on expected error. */
  renameAlbum: (oldName: string, newName: string) => Promise<boolean>;
  /** Delete an album and all its encrypted files. Returns true on success. */
  deleteAlbum: (name: string) => Promise<boolean>;
  /**
   * Move a file to a different album (or root if targetAlbum is null).
   * Returns the new URI on success, or null on expected error.
   */
  moveFile: (fileUri: string, targetAlbum: string | null) => Promise<string | null>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAlbums(): UseAlbumsResult {
  const vault = useVault();

  // AlbumService instance is stable for the lifetime of the vault session
  const service = useMemo(() => new AlbumService(vault), [vault]);

  const [albums, setAlbums]       = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // ── Load ────────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    try {
      const list = await service.listAlbums();
      setAlbums(list);
    } catch (e) {
      // listAlbums failing is unexpected; don't mask it
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Error mapping ────────────────────────────────────────────────────────

  /**
   * Converts typed AlbumService errors into display strings.
   * Returns true if the error was expected (caller should not re-throw).
   * Returns false for unknown errors (caller should re-throw).
   */
  function handleError(e: unknown): boolean {
    if (e instanceof InvalidAlbumNameError) {
      setError(e.message);
      return true;
    }
    if (e instanceof AlbumAlreadyExistsError) {
      setError(`An album named "${e.albumName}" already exists.`);
      return true;
    }
    if (e instanceof AlbumNotFoundError) {
      setError(`Album "${e.albumName}" was not found.`);
      return true;
    }
    return false;
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createAlbum = useCallback(
    async (name: string): Promise<boolean> => {
      setError(null);
      try {
        await service.createAlbum(name);
        await refresh();
        return true;
      } catch (e) {
        if (handleError(e)) return false;
        throw e;
      }
    },
    [service, refresh]
  );

  const renameAlbum = useCallback(
    async (oldName: string, newName: string): Promise<boolean> => {
      setError(null);
      try {
        await service.renameAlbum(oldName, newName);
        await refresh();
        return true;
      } catch (e) {
        if (handleError(e)) return false;
        throw e;
      }
    },
    [service, refresh]
  );

  const deleteAlbum = useCallback(
    async (name: string): Promise<boolean> => {
      setError(null);
      try {
        await service.deleteAlbum(name);
        await refresh();
        return true;
      } catch (e) {
        if (handleError(e)) return false;
        throw e;
      }
    },
    [service, refresh]
  );

  const moveFile = useCallback(
    async (fileUri: string, targetAlbum: string | null): Promise<string | null> => {
      setError(null);
      try {
        return await service.moveFile(fileUri, targetAlbum);
      } catch (e) {
        if (handleError(e)) return null;
        throw e;
      }
    },
    [service]
  );

  return {
    albums,
    isLoading,
    error,
    clearError,
    refresh,
    createAlbum,
    renameAlbum,
    deleteAlbum,
    moveFile,
  };
}
