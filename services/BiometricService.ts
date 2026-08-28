// Only the REAL vault passcode is ever stored here — the decoy vault is
// never enrolled for biometrics. Biometric failure always returns null,
// never throws. The SecureStore key uses requireAuthentication:true, which
// ties retrieval to the device biometric/Keychain at the OS level.

import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

// ─── SecureStore keys ─────────────────────────────────────────────────────────
// Global keys — not per-vault, because biometric enrollment is always
// for the real vault passcode only.

const KEY_PASSCODE = "obsidian_biometric_passcode";
const KEY_ENABLED = "obsidian_biometric_enabled";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BiometricAvailability {
  /** Device has biometric hardware (sensor present). */
  supported: boolean;
  /** At least one biometric is enrolled in device settings. */
  enrolled: boolean;
  /** Human-readable label for the available biometric type. */
  label: "Face ID" | "Fingerprint" | "Biometrics";
}

/**
 * Discriminated union returned by getPasscodeWithBiometrics.
 *
 *   success    — passcode retrieved; proceed with unlock
 *   cancelled  — user tapped Cancel; keep biometrics enabled, do nothing
 *   invalidated — biometric set changed, device lock removed, or key gone;
 *                 caller must disable biometrics and prompt manual passcode
 */
export type BiometricResult =
  | { outcome: "success"; passcode: string }
  | { outcome: "cancelled" }
  | { outcome: "invalidated" };

// ─── Availability ─────────────────────────────────────────────────────────────

/**
 * Check whether biometrics can be used on this device.
 * Does not trigger any prompt — safe to call on every app open.
 */
export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  const supported = await LocalAuthentication.hasHardwareAsync();
  const enrolled = supported && (await LocalAuthentication.isEnrolledAsync());

  let label: BiometricAvailability["label"] = "Biometrics";
  if (supported) {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (
      types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
    ) {
      label = "Face ID";
    } else if (
      types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
    ) {
      label = "Fingerprint";
    }
  }

  return { supported, enrolled, label };
}

// ─── Preference ───────────────────────────────────────────────────────────────

/** Returns true if the user has enabled biometric unlock. */
export async function isBiometricEnabled(): Promise<boolean> {
  const raw = await SecureStore.getItemAsync(KEY_ENABLED);
  return raw === "true";
}

/** Persist the user's biometric preference. */
async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEY_ENABLED, enabled ? "true" : "false");
}

// ─── Passcode storage ─────────────────────────────────────────────────────────

/**
 * Enroll biometrics: store the real-vault passcode in a biometric-protected key.
 * Also sets the enabled preference to true.
 *
 * IMPORTANT: only call this with the real vault passcode.
 *            Never call with decoy vault passcode.
 */
export async function enrollBiometrics(
  realVaultPasscode: string,
): Promise<void> {
  await SecureStore.setItemAsync(KEY_PASSCODE, realVaultPasscode, {
    requireAuthentication: true,
    authenticationPrompt: "Confirm your identity to enable biometric unlock",
  });
  await setBiometricEnabled(true);
}

/**
 * Retrieve the stored passcode by authenticating with biometrics.
 * Triggers the OS biometric prompt (Face ID / fingerprint sheet).
 *
 * Returns a BiometricResult discriminated union — never throws:
 *
 *   success    — passcode retrieved, call unlock()
 *   cancelled  — user tapped Cancel; keep biometrics enabled
 *   invalidated — key gone or biometric set changed; caller must
 *                 disable biometrics so the UI stops prompting
 *
 * Platform notes:
 *
 *   iOS:  expo-secure-store uses kSecAccessControlBiometryCurrentSet.
 *         Any enrollment change (add/remove print, remove device passcode)
 *         invalidates the key. The Keychain throws on read — we inspect
 *         the error message to distinguish cancel from invalidation.
 *         After a non-cancel failure we also call isEnrolledAsync() to
 *         confirm the biometric state rather than relying on error strings alone.
 *
 *   Android: KeyPermanentlyInvalidatedException is caught inside
 *         expo-secure-store and returned as null (not a throw).
 *         User cancellation throws an AuthenticationException.
 *         So: throw → check if cancel; null → check if we expected a value.
 */
export async function getPasscodeWithBiometrics(): Promise<BiometricResult> {
  try {
    const passcode = await SecureStore.getItemAsync(KEY_PASSCODE, {
      requireAuthentication: true,
      authenticationPrompt: "Unlock Image Vault",
    });

    if (passcode != null) {
      return { outcome: "success", passcode };
    }

    // getItemAsync returned null without throwing.
    //
    // This means either:
    //   (a) The key was never written (biometrics were never enrolled in this app).
    //       Should not happen if the button is gated on biometricEnabled, but
    //       handle it gracefully — treat as cancelled so the button stays visible.
    //   (b) Android: KeyPermanentlyInvalidatedException was silently caught by
    //       the library and returned as null (key existed but was invalidated).
    //
    // Distinguish (a) from (b): check isBiometricEnabled().
    // If the preference flag is true, a key should exist — its absence means
    // the Android Keystore invalidated it. If the flag is false, the key was
    // never written and this call should never have been made.
    const wasEnabled = await isBiometricEnabled();
    if (!wasEnabled) {
      // Key was never stored — nothing to do, don't penalise the user
      return { outcome: "cancelled" };
    }
    return { outcome: "invalidated" };
  } catch (e: any) {
    // A throw from getItemAsync means either:
    //   (a) user cancelled the biometric prompt, or
    //   (b) the key exists but cannot be read (auth failed, lockout, etc.)
    //
    // Distinguish (a) from (b) by checking the error message and then
    // verifying current enrollment state.
    const msg: string = e?.message ?? "";

    // iOS errSecUserCanceled / Android AuthenticationException for cancel
    // both produce messages containing "cancel" or "User canceled".
    const isCancelMessage =
      msg.toLowerCase().includes("cancel") || msg.includes("user_cancel");

    if (isCancelMessage) {
      return { outcome: "cancelled" };
    }

    // For any other error (auth failed, lockout, not enrolled, no passcode
    // set, hardware unavailable), verify the current enrollment state.
    // If biometrics are no longer enrolled or the device has no lock screen,
    // this is an invalidation — disable and require manual passcode.
    try {
      const stillEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!stillEnrolled) {
        return { outcome: "invalidated" };
      }
    } catch {
      // isEnrolledAsync failed — treat conservatively as invalidated
      return { outcome: "invalidated" };
    }

    // Biometrics are still enrolled but the read failed (e.g. key was
    // invalidated by an enrollment change that isEnrolledAsync doesn't
    // reflect, or the key was corrupted). Treat as invalidated.
    return { outcome: "invalidated" };
  }
}

/**
 * Disable biometric unlock and remove the stored passcode.
 * Call when the user turns off biometrics in settings.
 */
export async function disableBiometrics(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_PASSCODE);
  await setBiometricEnabled(false);
}
