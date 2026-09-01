// Does NOT encrypt — that's useVaultOperations.captureAndEncrypt's job.
// The captured image lands in the OS temp/cache directory and is never
// saved to the device gallery (launchCameraAsync doesn't write to the
// camera roll by default); the caller deletes the temp file after encrypt.

import * as ImagePicker from "expo-image-picker";
import { Alert, Linking } from "react-native";

/**
 * Request camera permission and launch the native camera.
 *
 * Returns the temp file URI of the captured photo, or null if:
 *   - The user denied camera permission
 *   - The user cancelled without taking a photo
 *
 * Never throws — all error paths return null so callers need no try/catch.
 */
export async function capturePhoto(): Promise<string | null> {
  // Check current permission status first to avoid redundant system prompts
  const { status: existing } = await ImagePicker.getCameraPermissionsAsync();

  let granted = existing === "granted";

  if (!granted) {
    const { status: requested } =
      await ImagePicker.requestCameraPermissionsAsync();
    granted = requested === "granted";
  }

  if (!granted) {
    // Permission denied — show a helpful Alert with a Settings shortcut
    Alert.alert(
      "Camera Access Required",
      "Veilo needs camera access to capture photos directly into your vault. Enable it in Settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => Linking.openSettings(),
        },
      ],
    );
    return null;
  }

  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 1,
      // allowsEditing: false — no crop step, get the raw frame immediately
      allowsEditing: false,
    });

    if (result.canceled || result.assets.length === 0) return null;

    return result.assets[0].uri;
  } catch {
    // Camera dismissed or hardware error — treat as cancel
    return null;
  }
}
