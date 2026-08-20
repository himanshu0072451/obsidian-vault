/**
 * ScreenSecurityService — screen capture and recording protection.
 *
 * Android:
 *   Sets FLAG_SECURE on the app window via expo-screen-capture.
 *   FLAG_SECURE blocks:
 *     • Screenshots (OS refuses to capture the window surface)
 *     • Screen recording (media projection checks the flag)
 *     • Recent-apps thumbnails (recents renders the same surface → blank frame)
 *
 * iOS:
 *   preventScreenCaptureAsync observes UIScreen.capturedDidChangeNotification.
 *   When screen recording starts, a black overlay covers the app window.
 *   When recording stops, the overlay is removed.
 *
 *   Limitations (hard platform constraints, not fixable at the JS layer):
 *
 *   • Screenshots cannot be blocked on iOS. The OS captures the screen at the
 *     GPU compositor level before any app code runs. Apple provides no
 *     interception API. The library can detect a screenshot after the fact
 *     (UIApplication.userDidTakeScreenshotNotification) but cannot cancel it.
 *
 *   • Recent-apps thumbnails cannot be suppressed on iOS. The app switcher
 *     snapshot is taken by the OS at UIApplicationWillResignActive time.
 *     There is no public API to blank or replace it.
 *
 * Usage:
 *   Call activate() once at app startup (inside App.tsx useEffect).
 *   The returned cleanup function calls allowScreenCaptureAsync() — pass it
 *   to the useEffect return so it runs on unmount.
 */

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
