// Android's system navigation bar (3-button nav or the gesture pill) can
// overlap fixed bottom UI now that the app draws edge-to-edge
// (edgeToEdgeEnabled in app.json). iOS already gets correct bottom-inset
// behavior from the OS/SafeAreaView and isn't affected by that setting, so
// this returns 0 there — call sites can add it straight onto an existing
// fixed padding value without ever changing iOS layout.
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function useAndroidBottomInset(): number {
  const insets = useSafeAreaInsets();
  return Platform.OS === "android" ? insets.bottom : 0;
}
