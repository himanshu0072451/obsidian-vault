/**
 * services/storage/index.ts
 *
 * Drop-in replacement for the old services/storage.ts.
 * Existing imports (`from '../services/storage'`) continue to resolve here.
 *
 * Exports:
 *   realVault  — VaultStorage instance for the real vault
 *   decoyVault — VaultStorage instance for the decoy vault
 *
 *   All types are re-exported so callers don't need to know the file layout.
 */

export { VaultStorage } from './VaultStorage';
export type { VaultContext, VaultFile, ActivityEntry } from './types';
export { VAULT_EXTENSION, THUMB_EXTENSION } from './types';

import { VaultStorage } from './VaultStorage';

/**
 * Singleton for the real vault.
 * Use this everywhere unless the user has unlocked the decoy vault.
 */
export const realVault = new VaultStorage('real');

/**
 * Singleton for the decoy vault.
 * Only used after a decoy passcode is entered.
 * All storage operations on this instance are fully isolated from realVault.
 */
export const decoyVault = new VaultStorage('decoy');
