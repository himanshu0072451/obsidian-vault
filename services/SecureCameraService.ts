/**
 * SecureCameraService — camera permission and photo capture.
 *
 * Responsibilities:
 *   1. Request camera permission, explaining why if denied.
 *   2. Launch the native camera via expo-image-picker.launchCameraAsync.
 *   3. Return the captured temp file URI, or null if cancelled/denied.
 *
 * This service does NOT encrypt — encryption is handled by the caller
 * (useVaultOperations.captureAndEncrypt) using the existing pipeline.
 *
 * The captured image lands in the OS temp/cache directory.
 * It is never saved to the device gallery — launchCameraAsync does not
 * write to the camera roll by default. The caller deletes the temp file
 * immediately after encryption.
 */

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
      "Image Vault needs camera access to capture photos directly into your vault. Enable it in Settings.",
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
