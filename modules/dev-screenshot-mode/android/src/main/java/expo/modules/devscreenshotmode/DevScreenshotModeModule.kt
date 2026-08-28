package expo.modules.devscreenshotmode

import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// DEV-only. Hides/shows system bars via WindowInsetsControllerCompat —
// deliberately not the deprecated SYSTEM_UI_FLAG_* flags, and no
// adb/shell `policy_control`. Linked into every build (no per-build-type
// native exclusion in this Expo setup), but only ever called from
// `__DEV__`-gated JS (see index.ts and App.tsx's dev-menu registration),
// so it has zero effect on production behavior.
class DevScreenshotModeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DevScreenshotMode")

    AsyncFunction("setImmersiveMode") { enabled: Boolean ->
      val activity = appContext.currentActivity ?: return@AsyncFunction
      activity.runOnUiThread {
        val window = activity.window ?: return@runOnUiThread
        val controller = WindowCompat.getInsetsController(window, window.decorView)

        if (enabled) {
          // Let app content draw behind where the system bars normally
          // are — required for hiding them to actually look fullscreen
          // rather than leaving a blank bar-shaped gap.
          WindowCompat.setDecorFitsSystemWindows(window, false)
          controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BY_SWIPE
          controller.hide(WindowInsetsCompat.Type.systemBars())
        } else {
          controller.show(WindowInsetsCompat.Type.systemBars())
          WindowCompat.setDecorFitsSystemWindows(window, true)
        }
      }
    }
  }
}
