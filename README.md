# FINORA — Watch your way

<p align="center">
  <img src="./assets/finora-logo-text.png" alt="FINORA Logo" width="360" />
</p>

FINORA is a modern, high-performance personal streaming client for [Jellyfin](https://jellyfin.org/), built with Expo, React Native (New Architecture & Hermes), and TypeScript.

It delivers a cinematic, polished streaming experience comparable to Netflix, Prime Video, or Crunchyroll, with instant playback, smooth 60/120 FPS navigation, Apple-inspired Liquid Glass aesthetics, and offline media caching.

---

## Features

- **Cinematic Experience**: Immersive Hero banner with backdrops, logos, and auto-computed watch progress indicators.
- **Apple Liquid Glass UI**: Modern translucent glass navigation bar, glowing specular highlights, and volumetric cards without frame drops.
- **Jellyfin Intro Skipper**: Automatic detection and skip markers for intros, recaps, and credits.
- **High-Performance Player**: Custom `FinoraPlayerEngine` abstraction built on modern `expo-video` (AndroidX Media3 / ExoPlayer on Android and AVPlayer on iOS) supporting Direct Play, Direct Stream, and dynamic stream negotiation.
- **Offline Subsystem**: Sandboxed downloads with pause, resume, cancel, and reconnection watch progress sync.
- **Hardware-Secured Credentials**: Zero plaintext storage. Authentication tokens are managed strictly via `expo-secure-store` (Android Keystore / iOS Keychain). Passwords are discarded immediately from memory upon authentication.
- **Comprehensive Media Library**: Multi-column responsive grid, live search with history, and instant category filtering.
- **Background Notifications**: Background fetch checks for new Jellyfin content (new episodes, movies, series) while the app is suspended.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Framework** | Expo SDK 52+, React Native 0.86+ |
| **Engine** | Hermes Bytecode Engine, New Architecture (Fabric + Bridgeless) |
| **Routing** | Expo Router v4 (Typed File-based routing) |
| **Video Playback** | `expo-video` (AndroidX Media3 / ExoPlayer & AVPlayer) |
| **Images & Caching**| `expo-image` (multi-tier memory + disk caching) |
| **State Management**| TanStack Query v5 (server cache), Zustand (client stores) |
| **Security & Auth** | `expo-secure-store`, `react-native-url-polyfill` |
| **Background Tasks** | `expo-background-fetch`, `expo-task-manager` |
| **Language** | TypeScript Strict Mode |

---

## Getting Started

> **FINORA requires a [development build](https://docs.expo.dev/develop/development-builds/introduction/) — it cannot run on Expo Go.**
>
> Native modules used by FINORA (`expo-video`, `expo-background-fetch`, `expo-task-manager`, `expo-secure-store`, etc.) are not available in the Expo Go sandbox.

### Prerequisites

- [Node.js](https://nodejs.org/) v22+ (LTS recommended)
- [npm](https://www.npmjs.com/)
- [EAS CLI](https://docs.expo.dev/eas/): `npm install -g eas-cli`
- An Android emulator / physical device **or** an iOS simulator / physical device
- A running [Jellyfin Server](https://jellyfin.org/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MEHDImp4/FINORA.git
   cd FINORA
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build a local development build:**
   ```bash
   # Android
   npx expo run:android

   # iOS (macOS only)
   npx expo run:ios
   ```

   Or build via EAS and install on your device:
   ```bash
   eas build --profile development --platform android
   # Then install the generated .apk / scan the QR from EAS dashboard
   ```

4. **Start the dev server** (after installing the development build on your device/emulator):
   ```bash
   npx expo start --dev-client
   ```

---

## Verification & Testing

FINORA enforces strict automated testing, TypeScript validation, and CI on every push:

```bash
# Run the full test suite (71 test suites, 393 unit tests)
npm test

# Run TypeScript typecheck in strict mode
npm run typecheck
```

CI runs automatically via GitHub Actions on every push and PR to `master` — see [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## Security & Privacy Commitment

- **Zero Plaintext Secrets**: Passwords are wiped from memory immediately after authentication and are never logged or persisted.
- **Encrypted Keystore**: Access tokens are stored exclusively in hardware-backed storage (`expo-secure-store`).
- **Sanitized Logging**: All network logs and debugging outputs automatically redact authentication headers, tokens, and query credentials (`[REDACTED]`).
- **No Third-Party Trackers**: No analytics or telemetry trackers.

---

## License

Private repository. All rights reserved. Open-source release planned.
