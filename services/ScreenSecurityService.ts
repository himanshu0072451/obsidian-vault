// Android: FLAG_SECURE (via expo-screen-capture) blocks screenshots,
// screen recording, and recents-thumbnails (recents renders the same
// surface, so it goes blank).
//
// iOS hard platform limitations, not fixable at the JS layer:
//   • Screenshots cannot be blocked — the OS captures at the GPU
//     compositor level before any app code runs. Apple provides no
//     interception API, only after-the-fact detection.
//   • Recents-thumbnails cannot be suppressed — the app-switcher snapshot
//     is taken by the OS with no public API to blank or replace it.

import * as ScreenCapture from "expo-screen-capture";

const SERVICE_KEY = "vault_screen_security";

/**
 * Activate screen protection.
 * Safe to call on simulators and in dev — failures are caught and swallowed.
 *
 * @returns A cleanup function. Pass it to useEffect's return value.
 */
export function activate(): () => void {
  (async () => {
    try {
      const available = await ScreenCapture.isAvailableAsync();
      if (!available) {
        // Web or a simulator without FLAG_SECURE support — not an error
        return;
      }
      await ScreenCapture.preventScreenCaptureAsync(SERVICE_KEY);
    } catch {
      // Never crash the app over a security enhancement
    }
  })();

  return () => {
    ScreenCapture.allowScreenCaptureAsync(SERVICE_KEY).catch(() => {
      // Ignore cleanup errors — the process is ending anyway
    });
  };
}
