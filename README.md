# FINORA — Watch your way

<p align="center">
  <img src="./assets/finora-logo-text.png" alt="FINORA Logo" width="380" />
</p>

<p align="center">
  <strong>A premium, cinematic personal streaming client for Jellyfin.</strong><br>
  Built with Expo SDK 57, React Native 0.86 (New Architecture & Hermes), and TypeScript.
</p>

<p align="center">
  <strong>🇬🇧 English</strong> •
  <a href="README.fr.md">🇫🇷 Français</a>
</p>

<p align="center">
  <a href="https://github.com/MEHDImp4/FINORA/releases/latest"><img src="https://img.shields.io/github/v/release/MEHDImp4/FINORA?color=6366f1&label=latest%20apk" alt="Latest Release" /></a>
  <a href="https://github.com/MEHDImp4/FINORA/actions/workflows/ci.yml"><img src="https://github.com/MEHDImp4/FINORA/actions/workflows/ci.yml/badge.svg" alt="CI Status" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-GPL--3.0-blue.svg" alt="License: GPL-3.0" /></a>
  <a href="https://expo.dev"><img src="https://img.shields.io/badge/Expo-SDK%2057-000020.svg?logo=expo" alt="Expo SDK 57" /></a>
  <a href="https://reactnative.dev"><img src="https://img.shields.io/badge/React%20Native-0.86-61DAFB.svg?logo=react" alt="React Native 0.86" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Strict-3178C6.svg?logo=typescript" alt="TypeScript Strict" /></a>
  <a href="https://jellyfin.org"><img src="https://img.shields.io/badge/Jellyfin-10.9%20%7C%2010.10-00A4DC.svg?logo=jellyfin" alt="Jellyfin Compatible" /></a>
</p>

<p align="center">
  <a href="https://github.com/MEHDImp4/FINORA/releases/latest">📥 <strong>Download Latest APK</strong></a> •
  <a href="#-getting-started">🚀 <strong>Quickstart</strong></a> •
  <a href="CONTRIBUTING.md">🤝 <strong>Contributing</strong></a> •
  <a href="https://github.com/MEHDImp4/FINORA/discussions">💬 <strong>Discussions</strong></a>
</p>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Download & Installation](#-download--installation)
- [Tech Stack](#-tech-stack)
- [Project Architecture](#-project-architecture)
- [Getting Started](#-getting-started)
- [Automated Testing & CI](#-automated-testing--ci)
- [Security & Privacy](#-security--privacy)
- [Contributing](#-contributing)
- [Community & Support](#-community--support)
- [License](#-license)

---

## 🌟 Overview

**FINORA** is designed to replace the standard mobile Jellyfin interface with a fluid, modern, and cinematic streaming experience comparable in responsiveness and visual craft to Netflix, Prime Video, or Crunchyroll — while remaining 100% open-source, private, and customizable.

**Core Value Proposition:** The instant, frictionless streaming loop:
> **Open FINORA → Browse instantly → Choose content → Play → Watch smoothly → Resume anywhere.**

- **Buttery Performance**: 60–120 FPS high-refresh render loops with zero JS serialization bottlenecks (React Native New Architecture + Fabric + Hermes).
- **Cinematic Liquid Glass Design**: Apple-inspired volumetric cards, translucent glass navigation bars, and glowing specular accents.
- **Rock-Solid Playback**: Native media engine built on modern `expo-video` (AndroidX Media3 / ExoPlayer on Android and AVPlayer on iOS) with Direct Play stream negotiation.
- **Hardware-Backed Privacy**: Zero plaintext tokens, credentials strictly stored in `expo-secure-store`, and zero analytics trackers.

---

## ✨ Key Features

### 🎬 1. Modern Playback Engine (`FinoraPlayerEngine`)
- **AndroidX Media3 & AVPlayer**: Native low-overhead video decoding with hardware acceleration.
- **Stream Negotiation**: Dynamic decision pipeline (`PlaybackPlanner`) prioritizing Direct Play > Direct Stream > Transcode based on device capabilities.
- **Intuitive Gesture Controls**:
  - Vertical swipe on left side for **brightness control**.
  - Vertical swipe on right side for **volume adjustment**.
  - Double-tap on left/right edges for instant **10-second seek**.
- **Intro & Outro Skipping**: Automatic detection and skip markers for Jellyfin intros, recaps, and credits.
- **Subtitles & Multi-Audio**: Support for SubRip (SRT), WebVTT, picture-based subtitles (PGS), and Advanced SubStation Alpha (ASS) styling.
- **Watch State Synchronization**: Real-time playback progress reporting and resume points saved to the Jellyfin server.

### 💎 2. Liquid Glass UI & Cinematic Navigation
- **Hero Backdrop Banners**: Dynamic backdrops, high-resolution logos, and auto-computed watch progress bars.
- **Optimized Media Caching**: Powered by `expo-image` with multi-tier memory and disk caching, progressive JPEG/WebP decoding, and Blurhash placeholders.
- **Responsive Layout**: Fluid grids and carousels adapting seamlessly between portrait, landscape, and foldable form factors.

### 📥 3. Resilient Offline Download Subsystem
- **Background Downloads**: Uses Android foreground services (`react-native-background-actions`) to download large media files while the app is suspended.
- **Auto-Resume & Range Requests**: Automatically resumes paused or interrupted downloads after network drops without restarting from byte zero.
- **Isolated Sandboxing**: Offline media files and metadata are stored in private app sandbox storage (`expo-file-system`) and indexed locally.

### 🔍 4. Smart Library Discovery & Instant Search
- **Live Search**: Rapid search with real-time suggestions, recent search history, and multi-library results.
- **Multi-Server & User Isolation**: Search histories, download indexes, and view preferences are fully isolated per server and per user.
- **Rich Metadata Display**: Detailed cast lists, community ratings, studio badges, and media resolution tags (4K, HDR, 1080p, 5.1 Surround).

### 🛡️ 5. Zero-Trust Security & Privacy
- **Hardware Keystore**: Authentication tokens are stored exclusively in hardware-backed storage (`expo-secure-store`).
- **Memory Discard**: Passwords are wiped from JavaScript memory immediately following server authentication.
- **Sanitized Logging**: All network logs and debugging outputs automatically redact authorization headers, passwords, and tokens (`[REDACTED]`).
- **Zero Third-Party Trackers**: No analytics, telemetry, or third-party ads.

### 🔔 6. Background Notifications
- Periodic background fetch (`expo-background-task`) checks for newly released movies, seasons, and episodes on your Jellyfin server.

---

## 📱 Download & Installation

### Android (Direct APK)

Standalone `.apk` files are published automatically on every release:

| Build Channel | Recommended For | Link |
|---|---|---|
| **Stable / Latest** | All users looking for tested stability | [**Download Latest APK**](https://github.com/MEHDImp4/FINORA/releases/latest) |
| **Preview Builds** | Early testers wanting the freshest features | [**Browse All Releases**](https://github.com/MEHDImp4/FINORA/releases) |

#### How to install:
1. Download the `.apk` file directly on your Android phone from the release page.
2. Tap the downloaded file in your browser notifications or file manager.
3. If prompted, allow your browser or file manager to **"Install apps from this source"**.
4. Tap **Install** and launch FINORA!

### iOS

Due to Apple App Store restrictions on third-party streaming clients, iOS requires compiling from source:
1. Clone the repository on a macOS workstation.
2. Run `npx expo run:ios` to deploy to a physical iPhone or iOS simulator.

---

## 🛠️ Tech Stack

| Layer | Technologies | Purpose |
|---|---|---|
| **Framework** | [Expo SDK 57](https://expo.dev) | Managed native build plugins, modern runtime modules |
| **Runtime** | [React Native 0.86+](https://reactnative.dev) + [React 19](https://react.dev) | Native UI components, modern concurrent rendering |
| **Architecture**| New Architecture (Fabric + Bridgeless) | Elimination of the JS bridge bottleneck for 120 FPS render loops |
| **JS Engine** | [Hermes](https://hermesengine.dev) | Sub-second cold startup, minimal memory footprint |
| **Routing** | [Expo Router v4](https://docs.expo.dev/router/introduction/) | Typed file-based routing with native transitions |
| **Player** | [`expo-video`](https://docs.expo.dev/versions/latest/sdk/video/) | AndroidX Media3 / ExoPlayer & Apple AVPlayer |
| **Images** | [`expo-image`](https://docs.expo.dev/versions/latest/sdk/image/) | Native disk/memory caching with blurhash support |
| **State** | [TanStack Query v5](https://tanstack.com/query) + [Zustand](https://zustand.docs.pmnd.rs) | Server state caching & lightweight atomic UI stores |
| **Security** | [`expo-secure-store`](https://docs.expo.dev/versions/latest/sdk/securestore/) | Hardware-backed keystore (Android Keystore / iOS Keychain) |
| **SDK** | [`@jellyfin/sdk`](https://github.com/jellyfin/jellyfin-sdk-typescript) | Official typed Jellyfin API client |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | Strict mode type-safety across the entire codebase |

---

## 🏗️ Project Architecture

FINORA enforces a strict separation of concerns to keep business logic maintainable, testable, and isolated:

```text
FINORA Architecture
┌────────────────────────────────────────────────────────┐
│                   Expo Router Pages                    │  (app/)
│     Screen Presentation & Reanimated Transitions       │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Custom Hooks                        │  (src/features/*/hooks/)
│        UI Lifecycle, Gesture Arbitrators, Queries      │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│              Domain & State Layer (TanStack/Zustand)   │  (src/stores/, src/features/)
│      PlaybackPlanner, DownloadManager, OfflineEngine   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                   Repository Layer                     │  (src/core/repositories/)
│     AuthRepo, MediaRepo, PlaybackRepo, SessionRepo     │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│          Native Modules & Jellyfin Engine              │  (expo-video, SecureStore, SDK)
│       AndroidX Media3, Keystore, @jellyfin/sdk         │
└────────────────────────────────────────────────────────┘
```

### Directory Structure

```text
FINORA/
├── app/                  # Expo Router typed file-based navigation
├── assets/               # Branding assets, logos, and icons
├── src/
│   ├── core/             # Foundational infrastructure
│   │   ├── network/      # Sanitized HTTP client, logger, network listener
│   │   ├── repositories/ # Decoupled Jellyfin domain repositories
│   │   ├── security/     # Keystore encryption & sanitization wrappers
│   │   └── storage/      # Secure store & preferences handlers
│   ├── features/         # Feature modules
│   │   ├── auth/         # Login, server discovery, multi-account
│   │   ├── player/       # FinoraPlayerEngine, controls, gestures, audio/subtitles
│   │   ├── downloads/    # DownloadManager, background worker, resume logic
│   │   ├── home/         # Hero banner, media carousels, resume watching
│   │   ├── library/      # Responsive media grid, filters, sorting
│   │   └── search/       # Live search, history, suggestions
│   ├── stores/           # Atomic Zustand stores (player, settings, downloads)
│   └── components/       # Design system components, GlassCard, modals
├── .github/              # Issue templates, PR template, CI workflows
└── package.json
```

---

## 🚀 Getting Started

> ⚠️ **FINORA requires an Expo development build — it cannot run in Expo Go.**
> Native modules used by FINORA (`expo-video`, `expo-secure-store`, `expo-background-task`, etc.) require native code compilation.

### Prerequisites

- [Node.js](https://nodejs.org/) v22+ (LTS recommended)
- [npm](https://www.npmjs.com/) v10+
- [JDK 17](https://adoptium.net/) (Temurin 17 recommended)
- [Android Studio](https://developer.android.com/studio) with Android SDK Platform 35+ and Android NDK
- A running [Jellyfin Media Server](https://jellyfin.org/)

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MEHDImp4/FINORA.git
   cd FINORA
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run on Android (generates native project and launches dev build):**
   ```bash
   npx expo run:android
   ```

4. **Run on iOS (macOS required):**
   ```bash
   npx expo run:ios
   ```

5. **Start the Metro development server:**
   ```bash
   npx expo start --dev-client
   ```

### Handy npm Scripts

| Command | Action |
|---|---|
| `npm start` | Start Metro development bundler |
| `npm test` | Run complete automated Jest test suite (77 suites, 478 tests) |
| `npm run test:watch` | Run Jest in interactive watch mode |
| `npm run typecheck` | Run TypeScript compiler in strict mode without emitting files |
| `npm run android` | Compile and launch native Android development build |
| `npm run ios` | Compile and launch native iOS development build |

---

## 🧪 Automated Testing & CI

FINORA maintains an extensive automated test suite with full branch coverage across repositories, player planning, download recovery, and state managers:

```bash
# Run unit & integration tests
npm test

# Run TypeScript strict validation
npm run typecheck
```

Continuous Integration runs on every push and pull request to `master` via GitHub Actions:
- **Linting & TypeScript Strict Validation**
- **Jest Unit Test Suite Execution**
- **Native Android Prebuild Compilation**
- **Continuous APK Packaging & Release Deployment**

---

## 🛡️ Security & Privacy

- **Zero Plaintext Secrets**: Passwords are wiped from memory immediately after authentication and are never logged or persisted.
- **Hardware-Encrypted Keystore**: Access tokens are stored exclusively in hardware-backed storage (`expo-secure-store`).
- **Sanitized Logging**: All network logs and debugging outputs automatically redact authentication headers, tokens, and query credentials (`[REDACTED]`).
- **No Third-Party Trackers**: Zero telemetry, zero analytics, zero external user tracking.
- **Responsible Disclosure**: Please see our [Security Policy](SECURITY.md) to report vulnerabilities privately.

---

## 🤝 Contributing

We welcome contributions of all kinds from the community!
- 🐛 Found a bug? Open a [Bug Report](https://github.com/MEHDImp4/FINORA/issues/new?template=bug_report.yml) or [Playback Issue](https://github.com/MEHDImp4/FINORA/issues/new?template=playback_issue.yml).
- 💡 Have an idea? Submit a [Feature Request](https://github.com/MEHDImp4/FINORA/issues/new?template=feature_request.yml).
- 💻 Want to write code? Read our [Contributing Guide](CONTRIBUTING.md) and check our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 💬 Community & Support

- **GitHub Discussions**: Share setup tips, show off your server configuration, or discuss feature ideas in [Discussions](https://github.com/MEHDImp4/FINORA/discussions).
- **Issue Tracker**: Track ongoing fixes and feature developments in [Issues](https://github.com/MEHDImp4/FINORA/issues).
- **Releases**: Download the latest standalone builds from [Releases](https://github.com/MEHDImp4/FINORA/releases).

---

## 📄 License & Acknowledgements

FINORA is free software, licensed under the **GNU General Public License v3.0** (GPL-3.0). See [LICENSE](LICENSE) for details.

### Acknowledgements & Credits
- The awesome [Jellyfin](https://jellyfin.org/) project and community for creating the best open-source media system.
- The [Expo](https://expo.dev/) and [React Native](https://reactnative.dev/) teams for the modern mobile development ecosystem.
