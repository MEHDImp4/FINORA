# FINORA — Watch your way

<p align="center">
  <img src="./assets/finora-logo-text.png" alt="FINORA Logo" width="380" />
</p>

<p align="center">
  <strong>A premium, cinematic Jellyfin client built with Expo &amp; React Native — fast, private, offline-ready, and designed for a modern streaming experience.</strong><br>
  Built with Expo SDK 57, React Native 0.86 (New Architecture &amp; Hermes), and TypeScript.
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
  <a href="https://github.com/MEHDImp4/FINORA/discussions">💬 <strong>Discussions</strong></a> •
  <a href="SECURITY.md">🛡️ <strong>Security</strong></a>
</p>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [FINORA in Action](#-finora-in-action)
- [Highlights](#-highlights)
- [Download & Installation](#-download--installation)
- [Detailed Features](#-detailed-features)
- [Tech Stack](#-tech-stack)
- [Project Architecture](#-project-architecture)
- [Getting Started](#-getting-started)
- [Automated Testing & CI](#-automated-testing--ci)
- [Security & Privacy](#-security--privacy)
- [Contributing](#-contributing)
- [Community & Support](#-community--support)
- [License & Acknowledgements](#-license--acknowledgements)

---

## 🌟 Overview

**FINORA** is an open-source personal media client focused on delivering a modern, cinematic mobile streaming experience for [Jellyfin](https://jellyfin.org/).

Built with Expo SDK 57, React Native 0.86, and TypeScript, it combines native hardware-accelerated playback, resilient background downloads, responsive navigation, and privacy-focused credential storage in a polished mobile interface.

**The Core Experience:**
> **Open FINORA → Browse instantly → Choose content → Play → Watch smoothly → Resume anywhere.**

- **Smooth Navigation**: Optimized for high-refresh-rate displays (up to 120 Hz) using React Native's New Architecture (Fabric renderer and Hermes engine).
- **Modern Dark & Glass Aesthetic**: Refined dark theme with translucent glass navigation, subtle elevation, and responsive cards.
- **Native Video Engine**: Built on modern `expo-video` (AndroidX Media3 / ExoPlayer on Android and AVPlayer on iOS) with automated stream negotiation.
- **Privacy by Default**: Authentication tokens stored in hardware-backed keystores where supported by the platform, passwords discarded immediately after authentication, and zero third-party telemetry.

---

## 📱 FINORA in Action

<!--
  SCREENSHOT INSTRUCTIONS:
  To display screenshots in this section:
  1. Capture 9:16 or 9:19.5 aspect ratio screenshots from a device or emulator.
  2. Save them into `docs/screenshots/` using the filenames:
     - 01-home.png (Home feed & carousels)
     - 02-details.png (Media details & episodes)
     - 03-player.png (Video player with gesture overlay)
     - 04-search.png (Library search & filters)
     - 05-downloads.png (Offline download manager)
  3. Uncomment the img tags below:

  <p align="center">
    <img src="docs/screenshots/01-home.png" alt="Home Screen" width="19%" />
    <img src="docs/screenshots/02-details.png" alt="Media Details" width="19%" />
    <img src="docs/screenshots/03-player.png" alt="Video Player" width="19%" />
    <img src="docs/screenshots/04-search.png" alt="Library & Search" width="19%" />
    <img src="docs/screenshots/05-downloads.png" alt="Offline Downloads" width="19%" />
  </p>
-->

| 🏠 Home | 🎬 Details | ▶️ Player | 🔍 Search | 📥 Downloads |
| :---: | :---: | :---: | :---: | :---: |
| *Hero banners, continue watching & library carousels* | *Rich metadata, season picker & episode grids* | *Low-overhead playback, gestures & skip markers* | *Instant multi-library search with live filters* | *Background download manager with auto-resume* |

---

## ✨ Highlights

- 🎬 **Native Jellyfin Playback** — Low-overhead hardware decoding via AndroidX Media3 (ExoPlayer) & AVPlayer.
- 📥 **Resilient Offline Downloads** — Background media caching with HTTP Range resume after network drops or app restarts.
- 🔐 **Secure Credential Storage** — Hardware-backed storage (`expo-secure-store`) where available; passwords wiped immediately from memory post-auth.
- 🔎 **Fast Library Search** — Instant multi-library search with live suggestions and per-user history isolation.
- 🎞️ **Intro & Credits Skipping** — Dynamic skip markers based on Jellyfin chapter metadata.
- 🔊 **Multi-Audio & Subtitles** — Flexible track selection with custom subtitle overlay (SRT, WebVTT, ASS styling).
- 📱 **Modern Responsive UI** — Fluid dark interface optimized for portrait, landscape, and foldable form factors.
- 🚫 **Strict Privacy** — No advertisements, third-party analytics, or telemetry.

---

## 📥 Download & Installation

### Android (Direct APK)

<p align="center">
  <a href="https://github.com/MEHDImp4/FINORA/releases/latest">
    <img src="https://img.shields.io/badge/Download-Latest%20APK-6366f1?style=for-the-badge&logo=android&logoColor=white" alt="Download Latest APK" height="40" />
  </a>
</p>

Standalone APKs are built automatically on every release:

| Build Channel | Recommended For | Link |
|---|---|---|
| **Stable / Latest** | All users looking for tested stability | [**Download Latest APK**](https://github.com/MEHDImp4/FINORA/releases/latest) |
| **All Releases** | Release history, preview builds, and changelogs | [**Browse All Releases**](https://github.com/MEHDImp4/FINORA/releases) |

#### How to install on Android:
1. Download the `.apk` file directly on your Android phone from the [latest release page](https://github.com/MEHDImp4/FINORA/releases/latest).
2. Tap the downloaded file in your browser notifications or file manager.
3. If prompted, allow your browser or file manager to **"Install unknown apps"**.
4. Tap **Install** and launch FINORA.

### iOS

Due to platform restrictions on third-party streaming clients, running FINORA on iOS requires compiling from source:
1. Clone the repository on a macOS machine with Xcode installed.
2. Run `npx expo run:ios` to compile and deploy to a connected iPhone or iOS simulator.

---

## 🎬 Detailed Features

### 1. Modern Playback Engine (`FinoraPlayerEngine`)
- **AndroidX Media3 & AVPlayer**: Native video decoding with hardware acceleration and low memory footprint.
- **Stream Negotiation**: Automated decision pipeline (`PlaybackPlanner`) prioritizing Direct Play > Direct Stream > Transcoding based on device profile.
- **Intuitive Gesture Controls**:
  - Vertical swipe on the left edge for **brightness control**.
  - Vertical swipe on the right edge for **volume adjustment**.
  - Double-tap on the left/right edges for instant **10-second seek**.
- **Intro & Credits Skipping**: Automatic skip marker detection for Jellyfin intros, recaps, and credits chapters.
- **Subtitles & Multi-Audio**: Support for SubRip (SRT), WebVTT, picture-based subtitles (PGS), and Advanced SubStation Alpha (ASS) styling via a dedicated subtitle overlay.
- **Watch State Synchronization**: Real-time playback progress reporting and resume points synced directly with your Jellyfin server.

### 2. Interface Design & Navigation
- **Hero Backdrop Banners**: Dynamic backdrops, high-resolution logos, and auto-computed watch progress bars.
- **Optimized Media Caching**: Powered by `expo-image` with multi-tier memory and disk caching, progressive JPEG/WebP decoding, and Blurhash placeholders.
- **Responsive Layout**: Fluid grids and carousels adapting seamlessly between portrait, landscape, and foldable form factors.

### 3. Offline Download Subsystem
- **Background Downloads**: Uses Android foreground services (`react-native-background-actions`) to download large media files while the app is suspended.
- **Auto-Resume & Range Requests**: Automatically resumes interrupted downloads after network drops or app restarts without restarting from byte zero.
- **Isolated Sandboxing**: Offline media files and metadata are stored in private app sandbox storage (`expo-file-system`) and indexed locally per server and per user.

### 4. Library Discovery & Instant Search
- **Live Search**: Rapid search with real-time suggestions, recent search history, and multi-library results.
- **Multi-Server & User Isolation**: Search histories, download indexes, and view preferences are fully isolated per server and per user.
- **Rich Metadata Display**: Detailed cast lists, community ratings, studio badges, and media resolution tags (4K, HDR, 1080p, 5.1 Surround).

### 5. Zero-Trust Security Architecture
- **Hardware Keystore**: Authentication tokens are stored in hardware-backed storage (`expo-secure-store`) where available on device.
- **Memory Hygiene**: Passwords are wiped from JavaScript memory immediately following server authentication.
- **Sanitized Logging**: All network logs and debugging outputs automatically redact authorization headers, passwords, and tokens (`[REDACTED]`).
- **Zero Third-Party Trackers**: No analytics, telemetry, or third-party ads.

### 6. Background Notifications
- Periodic background fetch (`expo-background-task`) checks for newly released movies, seasons, and episodes on your Jellyfin server.

---

## 🛠️ Tech Stack

| Layer | Technologies | Purpose |
|---|---|---|
| **Framework** | [Expo SDK 57](https://expo.dev) | Managed native build plugins, modern runtime modules |
| **Runtime** | [React Native 0.86+](https://reactnative.dev) + [React 19](https://react.dev) | Native UI components, modern concurrent rendering |
| **Architecture**| New Architecture (Fabric + Bridgeless) | Direct native synchronous invocation via JSI, removing legacy bridge overhead |
| **JS Engine** | [Hermes](https://hermesengine.dev) | Fast startup time and lightweight memory footprint via bytecode precompilation |
| **Routing** | [Expo Router v4](https://docs.expo.dev/router/introduction/) | Typed file-based routing with native transitions |
| **Player** | [`expo-video`](https://docs.expo.dev/versions/latest/sdk/video/) | AndroidX Media3 / ExoPlayer on Android & AVPlayer on iOS |
| **Images** | [`expo-image`](https://docs.expo.dev/versions/latest/sdk/image/) | Native disk/memory caching with blurhash support |
| **State** | [TanStack Query v5](https://tanstack.com/query) + [Zustand](https://zustand.docs.pmnd.rs) | Server state caching & lightweight atomic UI stores |
| **Security** | [`expo-secure-store`](https://docs.expo.dev/versions/latest/sdk/securestore/) | Hardware-backed keystore (Android Keystore / iOS Keychain) where supported |
| **SDK** | [`@jellyfin/sdk`](https://github.com/jellyfin/jellyfin-sdk-typescript) | Official typed Jellyfin API client |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | Strict mode type-safety across the entire codebase |

---

## 🏗️ Project Architecture

FINORA enforces a strict separation of concerns to keep business logic maintainable, testable, and isolated:

```text
FINORA Architecture
┌────────────────────────────────────────────────────────┐
│                   Expo Router Pages                    │  (src/app/)
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
├── assets/               # Branding assets, logos, and icons
├── docs/                 # Documentation & release checklists
├── src/
│   ├── app/              # Expo Router typed file-based navigation
│   │   ├── (tabs)/       # Main tab navigation (Home, Search, Downloads, Settings)
│   │   ├── details/      # Media and series details view
│   │   └── player/       # Fullscreen video player route
│   ├── core/             # Foundational infrastructure
│   │   ├── jellyfin/     # Auth repository, SDK clients, and restore logic
│   │   ├── network/      # Sanitized HTTP client, logger, and network status
│   │   ├── repositories/ # Media, playback, user, and user-data repositories
│   │   ├── security/     # Keystore encryption, sanitization, and token storage
│   │   └── storage/      # Secure store & preferences handlers
│   ├── features/         # Feature modules
│   │   ├── details/      # Media details, season picker, episode cards
│   │   ├── home/         # Hero banner, media carousels, resume watching
│   │   ├── library/      # Responsive media grid, filters, sorting
│   │   ├── notifications/# Background notifications for new server content
│   │   ├── offline/      # DownloadManager, background worker, resume logic
│   │   ├── onboarding/   # Server discovery and authentication
│   │   ├── player/       # FinoraPlayerEngine, controls, gestures, subtitles
│   │   ├── search/       # Live search, history, suggestions
│   │   └── settings/     # Server diagnostics, playback & subtitle preferences
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
| `npm test` | Run complete automated Jest test suite (79 suites, 489 tests) |
| `npm run typecheck` | Run TypeScript compiler in strict mode without emitting files |
| `npm run android` | Compile and launch native Android development build |
| `npm run ios` | Compile and launch native iOS development build |

---

## 🧪 Automated Testing & CI

FINORA maintains an automated test suite covering repository caching, playback planning, download recovery, and state managers:

```bash
# Run unit & integration tests
npm test

# Run TypeScript strict validation
npm run typecheck
```

Continuous Integration runs on every push and pull request to `master` via GitHub Actions:
- **Linting & TypeScript Strict Validation** (0 strict errors)
- **Jest Unit & Integration Test Execution** (79 suites, 489 tests passing)
- **Dependency Security Audit** (`npm audit`)
- **Expo Doctor Health Checks**
- **Automated Standalone APK Packaging** via GitHub Actions (`build-apk.yml`)

---

## 🛡️ Security & Privacy

- **Zero Plaintext Secrets**: Passwords are wiped from memory immediately after authentication and are never logged or persisted.
- **Hardware-Encrypted Keystore**: Access tokens are stored in hardware-backed storage (`expo-secure-store`) where available on device.
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
- **Feature Requests**: Propose enhancements and discuss ideas via [Feature Requests](https://github.com/MEHDImp4/FINORA/issues/new?template=feature_request.yml).
- **Releases**: Download standalone builds and review changelogs in [Releases](https://github.com/MEHDImp4/FINORA/releases).

---

## 📄 License & Acknowledgements

FINORA is free software, licensed under the **GNU General Public License v3.0** (GPL-3.0). See [LICENSE](LICENSE) for details.

### Acknowledgements & Credits
- The awesome [Jellyfin](https://jellyfin.org/) project and community for creating the open-source media system.
- The [Expo](https://expo.dev/) and [React Native](https://reactnative.dev/) teams for the modern mobile development platform.
