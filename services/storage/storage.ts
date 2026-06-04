/**
 * Persistent storage service.
 * Passcode is NEVER stored raw — only a SHA-256 hash is kept.
 */

import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

const PASSCODE_HASH_KEY = 'vault_passcode_hash';
const VAULT_DIR = `${FileSystem.documentDirectory}vault/`;

export interface VaultFile {
  name: string;
  uri: string;
  size: number;
  createdAt: number;
}

export interface ActivityEntry {
  type: 'encrypt' | 'decrypt';
  fileCount: number;
  timestamp: number;
}

// ─── Passcode ─────────────────────────────────────────────────────────────

async function hashPasscode(passcode: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `vault:${passcode}:secure`
  );
}

export async function savePasscodeHash(passcode: string): Promise<void> {
  const hash = await hashPasscode(passcode);
  await SecureStore.setItemAsync(PASSCODE_HASH_KEY, hash);
}

export async function verifyPasscode(passcode: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PASSCODE_HASH_KEY);
  if (!stored) return false;
  const hash = await hashPasscode(passcode);
  return hash === stored;
}

export async function hasPasscode(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PASSCODE_HASH_KEY);
  return stored !== null;
}

// ─── Vault directory ──────────────────────────────────────────────────────

export async function ensureVaultDir(): Promise<string> {
  const info = await FileSystem.getInfoAsync(VAULT_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(VAULT_DIR, { intermediates: true });
  }
  return VAULT_DIR;
}

export async function getVaultFiles(): Promise<VaultFile[]> {
  await ensureVaultDir();
  const names = await FileSystem.readDirectoryAsync(VAULT_DIR);
  const files: VaultFile[] = [];

  for (const name of names.filter((n) => n.endsWith('.vault'))) {
    const uri = `${VAULT_DIR}${name}`;
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      files.push({
        name,
        uri,
        size: (info as any).size ?? 0,
        createdAt: (info as any).modificationTime ?? Date.now(),
      });
    }
  }

  return files.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteVaultFile(uri: string): Promise<void> {
  await FileSystem.deleteAsync(uri, { idempotent: true });
}

// ─── Activity log ─────────────────────────────────────────────────────────

const ACTIVITY_KEY = 'vault_activity';

export async function logActivity(entry: ActivityEntry): Promise<void> {
  const raw = await SecureStore.getItemAsync(ACTIVITY_KEY);
  const history: ActivityEntry[] = raw ? JSON.parse(raw) : [];
  history.unshift(entry);
  // Keep last 20 entries
  await SecureStore.setItemAsync(ACTIVITY_KEY, JSON.stringify(history.slice(0, 20)));
}

export async function getActivity(): Promise<ActivityEntry[]> {
  const raw = await SecureStore.getItemAsync(ACTIVITY_KEY);
  return raw ? JSON.parse(raw) : [];
}

export { VAULT_DIR };
