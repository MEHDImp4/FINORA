# Changelog — FINORA

> 🇫🇷 *Une version française de ce changelog est disponible dans [CHANGELOG.fr.md](CHANGELOG.fr.md).*

All notable changes to the **FINORA** project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - Unreleased

### ✨ Key Features
- **Cinematic Playback Engine**: Modern integration of `expo-video` (AndroidX Media3 / ExoPlayer & AVPlayer) featuring playback resume, gesture controls (brightness, volume, 10s double-tap seek), multi-audio track switching, and subtitle modal styling.
- **Resilient Offline Downloads**: Background `DownloadManager` engineered to withstand network interruptions, app kills, and OS reboots with automatic HTTP Range resume, bandwidth throttling, and Android foreground worker integration.
- **Cinematic Discovery & Navigation**: Immersive dynamic hero backdrop banner, library carousels, continue-watching row, and live search with real-time suggestions and multi-server/user isolated history.
- **Secure Credential Storage**: Token storage via `expo-secure-store`, automatic credential sanitization in logs (`[REDACTED]`), strict cleartext local HTTP warnings, and zero analytics trackers.
- **Automated Continuous Delivery**: GitHub Actions workflows generating standalone APKs (`preview`, `beta`, `release`) published directly to GitHub Releases with SHA-256 checksums and direct 1-click downloads.

### 🔧 Release Hardening
- **Consistent Quality Gates**: Stable and RC Android pipelines run the same production dependency audit, TypeScript, version, i18n, Jest, and advisory Expo Doctor checks before build validation.
- **Sanitized Player Errors**: Player listener failures are routed through FINORA's redacting logger instead of direct console output.
- **Dependency Audit Remediation**: Updated the vulnerable transitive `brace-expansion` lockfile entry to 5.0.12 so the production high-severity audit gate passes.

### 🐛 Bug Fixes
- **Black Screen on Preview APK**: Switched preview packaging from `assembleDebug` to `assembleRelease` to bundle Hermes JavaScript bytecode and native assets directly into the standalone APK without requiring a local Metro server.
- **Timer & Jest Worker Lifecycle**: Hardened network timeouts (`httpClient`, `networkStatusService`) and ensured systematic instance cleanup (`FinoraPlayerEngine`, `DownloadManager`) for clean CI test runs with zero hanging workers.
- **Download State Persistence**: Fixed race conditions and metadata overwrites during persistence debouncing, ensuring full data isolation per server and user.
- **System Brightness Restoration**: Restored native system brightness when dismissing the video player.
- **Expo SDK 57 Test Alignment**: Jest 29 remains aligned with the SDK 57 test stack. `expo-doctor` is advisory for patch-only SDK package drift, which is reviewed separately before stable release.

---

## [1.0.0-preview] - 2026-09-16

### 📦 Preview Builds & Testing
- Automated standalone preview APK builds with Hermes bytecode pre-compilation.
- Direct release publishing to GitHub Releases enabling single-tap installation without zip archive extraction.
