# Changelog

All notable changes to Obsidian are documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project does not yet follow strict semantic versioning guarantees (v1.0.0
is the first public release), but version numbers will be bumped meaningfully
going forward.

## [1.0.0] — 2026-08-23

Initial public release. Feature-complete for the core private-photo-vault
use case on Android; iOS code paths are implemented but not yet verified
on-device (see README → Known Limitations).

### Added

**Vault core**
- AES-256-CBC encryption with PBKDF2-SHA256 key derivation, via
  `react-native-aes-crypto`.
- Real vault + independent decoy vault, each with its own passcode,
  storage root, and settings.
- First-time passcode setup and unlock flow (`LockScreen`).
- Vault index (metadata: album, tags, favorites, display name, size,
  created date) stored separately from the encrypted file contents.
- Activity log for encrypt/decrypt operations.
- Rebuild Vault Index (rescans files from disk if the index is lost or
  corrupted, without touching the encrypted files themselves).

**Import & Make Private**
- Multi-select import from the device gallery.
- Android: custom local native Expo module
  (`modules/media-store-resolver`) using `Intent.ACTION_OPEN_DOCUMENT` and
  persistable URI permissions, replacing `expo-image-picker`'s unreliable
  asset-ID resolution on Android.
- "Make Private" confirmation sheet shown before any gallery deletion is
  attempted, explaining the deletion behavior and the Google Photos/cloud
  backup caveat up front.
- Deterministic, non-destructive gallery deletion: `DocumentsContract
  .deleteDocument()` primary path, `MediaStore.createDeleteRequest()`
  fallback (Android); standard `expo-media-library` deletion (iOS). Deletion
  is only ever attempted after the encrypted copy is verified on disk and
  recorded in the index.
- Direct-to-vault secure camera capture — captured photos are encrypted
  immediately and never written to the device gallery.
- Fixed a race where backgrounding during native camera capture (most
  visible with Camouflage Mode + "Lock on Background" both enabled) could
  re-lock the vault mid-encrypt and lose the captured photo; background-lock
  suppression now spans the full capture-through-record operation.

**Organization**
- Albums — create, rename, delete, move files between albums (per-file and
  batch).
- Tags — add/remove per file, tag filter chips generated from the vault's
  existing tags.
- Favorites — star/unstar, filter to favorites only.
- List and Grid views with a shared thumbnail cache.
- Multi-select batch actions (delete, favorite, move, tag).

**Viewing & export**
- Custom full-screen Image Viewer — pinch-to-zoom, double-tap zoom, momentum
  panning, swipe-down-to-close, auto-hiding chrome.
- Encrypted per-file thumbnails (separately encrypted `.thumb` sidecar,
  resized/compressed) with sampled dominant colors for the grid's adaptive
  background.
- Export to Gallery — decrypt a single photo back to the device's normal
  Photos/Gallery via `MediaLibrary.saveToLibraryAsync`, without modifying or
  deleting the encrypted vault copy.
- **Export All to Gallery** (Settings → Vault) — batch-export every photo
  currently in the vault, with per-photo progress and a clear success/
  failure summary. One failed file no longer aborts the rest of the batch.

**Security & privacy**
- Biometric unlock (Face ID / Fingerprint) for the real vault, gated via a
  biometric-protected SecureStore key; automatically disabled if enrollment
  is invalidated at the OS level. Never enrolled for the decoy vault.
- Camouflage Mode — disguises the entire app as a working calculator;
  entering the real passcode via the calculator's keypad silently unlocks
  the vault.
- Screen capture protection (`FLAG_SECURE` / `preventScreenCaptureAsync`)
  blocking screenshots, screen recording, and recents-thumbnails on Android
  while the app is open; iOS screenshot-detection/black-out where the
  platform allows it.
- "Lock on Background" — optional auto-relock when the app is backgrounded.
- No network calls anywhere in the app; no backend, no accounts, no
  analytics.

**Onboarding**
- 3-screen first-launch intro covering what Obsidian is, how Make Private
  works (including the Google Photos caveat), and the vault's
  unlock/disguise options — shown once, before passcode setup.

### Changed / Fixed (release hardening)

- Removed ~500 lines of dead, commented-out pure-JS AES/PBKDF2 code from
  `services/encryption.ts` (superseded by `react-native-aes-crypto`).
- Removed unused dependencies: `expo-document-picker`, `aes-js`, `pbkdf2`,
  `buffer`, `react-native-image-viewing`, `@react-navigation/stack`.
- Removed dead files: `services/storage/VaultStorageOld.ts`,
  `services/AlbumServiceOld.ts`, `hooks/useSession.tsx` (unused, superseded
  by `useAuth`'s session handling), `screens/TRASH/` scratch files, an
  unused Expo Router template stub (`app/index.tsx`), and a stray
  `appOld.json` backup.
- Stripped all `console.log`/`__DEV__` diagnostic logging and a temporary
  debug HUD that were added during development/debugging.
- Fixed two real TypeScript type errors (`Card.tsx` style prop typing,
  `ImageViewer.tsx` `ImageStyle` vs `ViewStyle` mismatch).
- Restored `ScreenSecurityService`'s real implementation — it had been
  temporarily stubbed out to a no-op during development and was left that
  way; screen capture protection is active again.
- Removed unnecessary Android permissions from the shipped manifest
  (`RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`) by fixing their source (an
  `expo-image-picker` plugin default and an Expo template scaffold default,
  respectively) rather than hand-editing the generated manifest.
- `tsc --noEmit` and `tsc --noEmit --noUnusedLocals --noUnusedParameters`
  both pass with zero errors as of this release.

### Known limitations

See the README's [Known Limitations](README.md#known-limitations) section —
summarized: iOS not yet verified on-device, cloud-backed photos (Google
Photos etc.) can't be deleted by design, gallery deletion depends on source
provider support, no automated test suite yet, no Play Store listing yet.
