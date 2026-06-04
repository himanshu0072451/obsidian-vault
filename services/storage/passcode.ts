/**
 * Passcode hashing utilities.
 * The vault context is baked into the hash salt so real and decoy
 * passcode hashes are cryptographically independent even if the
 * user sets the same PIN for both (not recommended, but safe).
 */

import * as Crypto from 'expo-crypto';
import type { VaultContext } from './types';

/**
 * Produces a SHA-256 hash of the passcode, namespaced by vault context.
 * The context is part of the salt so hashes across vaults are independent.
 */
export async function hashPasscode(
  passcode: string,
  context: VaultContext
): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `obsidian:${context}:${passcode}:v1`
  );
}
