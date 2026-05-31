# Image Vault

A minimal, secure, monochromatic image vault for iOS and Android built with Expo + React Native.

## Features

- **AES-256-CBC encryption** with PBKDF2-SHA256 key derivation (100,000 iterations)
- **Passcode stored as SHA-256 hash** — never in plaintext
- **Multi-image selection** from device library
- **Encrypted `.vault` files** saved to app documents directory
- **Decryption restores** images directly to your photo library
- **Pure monochromatic design** — black, white, gray only
- **Smooth animations** via `react-native-reanimated`

## Project Structure

```
ImageVault/
├── App.tsx                     # Root entry point, auth-aware routing
├── hooks/
│   ├── useAuth.tsx             # Auth context (lock/unlock/setup)
│   └── useVaultOperations.ts   # Encrypt/decrypt orchestration
├── screens/
│   ├── LockScreen.tsx          # Passcode entry + first-run setup
│   └── HomeScreen.tsx          # Dashboard, stats, action buttons
├── components/
│   ├── Button.tsx              # Animated pressable button
│   ├── Card.tsx                # Card + StatCard
│   ├── PasscodeInput.tsx       # 6-dot passcode keypad
│   └── ProgressOverlay.tsx     # Modal progress/result sheet
├── services/
│   ├── encryption.ts           # AES-256-CBC + PBKDF2 (pure JS, no native deps)
│   └── storage.ts              # SecureStore, FileSystem, activity log
└── utils/
    └── design.ts               # Design tokens (colors, spacing, typography)
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator or Android Emulator (or physical device with Expo Go)

### Install

```bash
cd ImageVault
npm install
```

### Run

```bash
# Start Expo dev server
npx expo start

# iOS
npx expo run:ios

# Android
npx expo run:android
```

## Security Architecture

### Key Derivation
```
passcode + random_salt → PBKDF2-SHA256 (100,000 iterations) → 256-bit key
```

### Encryption Format
```
[4 bytes: salt length] [32 bytes: salt] [16 bytes: IV] [ciphertext]
```

### Passcode Storage
- Passcode is **never stored**
- Only `SHA-256("vault:" + passcode + ":secure")` is kept in SecureStore
- Incorrect passcode → PKCS7 unpadding throws → graceful error shown

### Session Security
- Passcode lives in memory only during the unlocked session
- App re-locks when user taps the lock button
- For production: integrate `AppState` listener to auto-lock on background

## Notes

- The encryption is implemented in pure TypeScript (no native modules) for maximum Expo Go compatibility
- For very large images (>20MB), consider streaming or chunked processing
- The HMAC in PBKDF2 uses `expo-crypto` digest, which is hardware-accelerated on device

## Production Checklist

- [ ] Add `AppState` auto-lock (lock when app goes to background)
- [ ] Add biometric unlock option (`expo-local-authentication`)
- [ ] Add delete-after-encrypt toggle in UI
- [ ] Add ability to manage/delete vault files from the app
- [ ] Consider chunked encryption for images >20MB
- [ ] Add passcode change flow
