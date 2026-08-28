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
