/**
 * Typed errors thrown by AlbumService.
 * useAlbums maps these to user-facing messages.
 * No raw filesystem errors should reach UI consumers.
 */

export class AlbumNotFoundError extends Error {
  readonly albumName: string;
  constructor(albumName: string) {
    super(`Album not found: "${albumName}"`);
    this.name = 'AlbumNotFoundError';
    this.albumName = albumName;
  }
}

export class AlbumAlreadyExistsError extends Error {
  readonly albumName: string;
  constructor(albumName: string) {
    super(`Album already exists: "${albumName}"`);
    this.name = 'AlbumAlreadyExistsError';
    this.albumName = albumName;
  }
}

export class InvalidAlbumNameError extends Error {
  readonly reason: 'empty' | 'too_long' | 'reserved';
  constructor(reason: 'empty' | 'too_long' | 'reserved', name?: string) {
    const messages: Record<typeof reason, string> = {
      empty:    'Album name cannot be empty.',
      too_long: 'Album name cannot exceed 50 characters.',
      reserved: `"${name}" is a reserved name and cannot be used.`,
    };
    super(messages[reason]);
    this.name = 'InvalidAlbumNameError';
    this.reason = reason;
  }
}
