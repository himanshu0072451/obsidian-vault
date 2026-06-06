/**
 * useAuth — authentication context.
 *
 * Manages which vault is active (real or decoy) and exposes the
 * active VaultStorage instance to the rest of the app via useVault().
 *
 * unlock() tries the real vault first, then the decoy vault.
 * The result determines which VaultStorage instance becomes active.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { realVault, decoyVault, VaultStorage } from "../services/storage";
import type { VaultContext } from "../services/storage";
import {
  isBiometricEnabled,
  getPasscodeWithBiometrics,
  enrollBiometrics,
  disableBiometrics,
  getBiometricAvailability,
} from "../services/BiometricService";
import type {
  BiometricAvailability,
  BiometricResult,
} from "../services/BiometricService";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  /** Has a passcode been configured for the real vault? */
  isSetup: boolean;
  /** Is the app currently unlocked (either vault)? */
  isUnlocked: boolean;
  isLoading: boolean;
  /** In-memory passcode for the current session. Empty when locked. */
  passcode: string;
  /** Which vault context is currently active. Null when locked. */
  vaultContext: VaultContext | null;
  /** The active VaultStorage instance. Null when locked. */
  activeVault: VaultStorage | null;

  /**
   * Try to unlock with the given passcode.
   * Returns the context that was unlocked, or null if passcode is wrong.
   */
  unlock: (passcode: string) => Promise<VaultContext | null>;

  /** Set up the real vault passcode for the first time. */
  setup: (passcode: string) => Promise<void>;

  /** Set up the decoy vault passcode. Can be called any time after real setup. */
  setupDecoy: (passcode: string) => Promise<void>;

  /** Does the decoy vault have a passcode configured? */
  hasDecoy: boolean;

  /** Lock the app and clear all in-memory secrets. */
  lock: () => void;

  // ── Biometrics ──────────────────────────────────────────────────────────

  /** Whether biometric unlock is currently enabled by the user. */
  biometricEnabled: boolean;
  /** Hardware/enrollment availability — null while loading. */
  biometricAvailability: BiometricAvailability | null;
  /**
   * Try to unlock using the biometric-protected stored passcode.
   * Returns the unlocked VaultContext, or null if cancelled / failed.
   * Always falls back gracefully — never throws.
   */
  unlockWithBiometrics: () => Promise<VaultContext | null>;
  /**
   * Enroll biometrics using the currently active real-vault passcode.
   * Only valid when isUnlocked && vaultContext === 'real'.
   */
  enableBiometrics: () => Promise<void>;
  /** Remove the stored passcode and disable biometric unlock. */
  disableBiometrics: () => Promise<void>;
  /** Dismiss the biometric offer for this session without enabling. */
  skipBiometricOffer: () => void;
  /** Whether the user has skipped the offer this session. */
  skippedBiometricOffer: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isSetup, setIsSetup] = useState(false);
  const [hasDecoy, setHasDecoy] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [passcode, setPasscode] = useState("");
  const [vaultContext, setVaultContext] = useState<VaultContext | null>(null);
  const [activeVault, setActiveVault] = useState<VaultStorage | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailability, setBiometricAvailability] =
    useState<BiometricAvailability | null>(null);
  // In-memory only — resets on every app open, so offer shows once per session until enabled
  const [skippedBiometricOffer, setSkippedBiometricOffer] = useState(false);

  // Bootstrap: check which vaults have passcodes configured + biometric state
  useEffect(() => {
    Promise.all([
      realVault.hasPasscode(),
      decoyVault.hasPasscode(),
      isBiometricEnabled(),
      getBiometricAvailability(),
    ]).then(([hasReal, hasDec, bioEnabled, bioAvail]) => {
      setIsSetup(hasReal);
      setHasDecoy(hasDec);
      setBiometricEnabled(bioEnabled);
      setBiometricAvailability(bioAvail);
      setIsLoading(false);
    });
  }, []);

  // ── unlock ────────────────────────────────────────────────────────────────

  const unlock = useCallback(
    async (code: string): Promise<VaultContext | null> => {
      // Real vault takes priority
      if (await realVault.verifyPasscode(code)) {
        setPasscode(code);
        setVaultContext("real");
        setActiveVault(realVault);
        setIsUnlocked(true);
        return "real";
      }

      // Try decoy vault if one is configured
      if (hasDecoy && (await decoyVault.verifyPasscode(code))) {
        setPasscode(code);
        setVaultContext("decoy");
        setActiveVault(decoyVault);
        setIsUnlocked(true);
        return "decoy";
      }

      return null;
    },
    [hasDecoy],
  );

  // ── setup ─────────────────────────────────────────────────────────────────

  const setup = useCallback(async (code: string): Promise<void> => {
    await realVault.savePasscodeHash(code);
    await realVault.ensureRootDir();
    setPasscode(code);
    setVaultContext("real");
    setActiveVault(realVault);
    setIsSetup(true);
    setIsUnlocked(true);
  }, []);

  // ── setupDecoy ────────────────────────────────────────────────────────────

  const setupDecoy = useCallback(async (code: string): Promise<void> => {
    await decoyVault.savePasscodeHash(code);
    await decoyVault.ensureRootDir();
    setHasDecoy(true);
  }, []);

  // ── biometrics ────────────────────────────────────────────────────────────

  const unlockWithBiometrics =
    useCallback(async (): Promise<VaultContext | null> => {
      const result = await getPasscodeWithBiometrics();

      if (result.outcome === "cancelled") {
        // User tapped Cancel — stay on LockScreen, keep biometrics enabled
        return null;
      }

      if (result.outcome === "invalidated") {
        // Enrollment changed, device lock removed, or key gone.
        // Disable biometrics so the prompt stops firing on every app open.
        await disableBiometrics();
        setBiometricEnabled(false);
        return null;
      }

      // outcome === 'success' — route through the normal passcode unlock
      return unlock(result.passcode);
    }, [unlock]);

  const enableBiometrics = useCallback(async (): Promise<void> => {
    // Guard: only enroll when the real vault is active
    if (!passcode || vaultContext !== "real") return;
    await enrollBiometrics(passcode);
    setBiometricEnabled(true);
  }, [passcode, vaultContext]);

  const skipBiometricOfferCallback = useCallback(() => {
    setSkippedBiometricOffer(true);
  }, []);

  const disableBiometricsCallback = useCallback(async (): Promise<void> => {
    await disableBiometrics();
    setBiometricEnabled(false);
  }, []);

  // ── lock ──────────────────────────────────────────────────────────────────

  const lock = useCallback(() => {
    setPasscode("");
    setVaultContext(null);
    setActiveVault(null);
    setIsUnlocked(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isSetup,
        isUnlocked,
        isLoading,
        passcode,
        vaultContext,
        activeVault,
        unlock,
        setup,
        setupDecoy,
        hasDecoy,
        lock,
        biometricEnabled,
        biometricAvailability,
        unlockWithBiometrics,
        enableBiometrics,
        disableBiometrics: disableBiometricsCallback,
        skipBiometricOffer: skipBiometricOfferCallback,
        skippedBiometricOffer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/**
 * Returns the active VaultStorage instance.
 * Throws if called while the app is locked — use only in authenticated screens.
 */
export function useVault(): VaultStorage {
  const { activeVault } = useAuth();
  if (!activeVault) throw new Error("useVault called while app is locked");
  return activeVault;
}
