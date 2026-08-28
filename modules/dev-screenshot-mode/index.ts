import { Platform } from "react-native";
import { requireNativeModule } from "expo-modules-core";

type NativeModule = {
  setImmersiveMode(enabled: boolean): Promise<void>;
};

// Resolved lazily and only in dev — requireNativeModule throws if called
// in a build that hasn't picked up this local module (e.g. a production
// build made without a fresh prebuild), which must never surface as a
// crash here since this whole feature is a screenshot-taking convenience.
let nativeModule: NativeModule | null = null;
if (__DEV__ && Platform.OS === "android") {
  try {
    nativeModule = requireNativeModule<NativeModule>("DevScreenshotMode");
  } catch {
    nativeModule = null;
  }
}

/**
 * DEV-only: hides/shows the Android status + navigation bars via
 * WindowInsetsControllerCompat (see the native module's doc comment), for
 * taking clean marketing screenshots without system chrome in the way.
 *
 * This is a guaranteed no-op — never touches the window, never throws —
 * outside a `__DEV__` Android build. It is not wired into any production
 * code path; the only caller is App.tsx's `__DEV__`-gated dev-menu item.
 */
export async function setDevScreenshotMode(enabled: boolean): Promise<void> {
  if (!__DEV__ || !nativeModule) return;
  try {
    await nativeModule.setImmersiveMode(enabled);
  } catch {
    // Best-effort — a screenshot-mode toggle must never crash the dev menu.
  }
}
