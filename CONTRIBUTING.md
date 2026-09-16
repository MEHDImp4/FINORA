# Contributing to FINORA

> 🇫🇷 *Une version française de ce guide de contribution est disponible dans [CONTRIBUTING.fr.md](CONTRIBUTING.fr.md).*

Thank you for your interest in contributing to **FINORA**! 🎉

FINORA is an open-source, cinematic personal streaming client for [Jellyfin](https://jellyfin.org/) built with Expo, React Native (New Architecture & Hermes), and TypeScript.

Our primary goal is to deliver a flawless, high-performance user experience:
> **Open FINORA → Browse instantly → Choose content → Play → Watch smoothly → Resume anywhere.**

Please read this guide before submitting code or opening an issue.

---

## 📜 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please treat everyone with respect and kindness.

---

## 🚀 How Can I Contribute?

### 1. Reporting Bugs
- Search existing [GitHub Issues](https://github.com/MEHDImp4/FINORA/issues) before opening a new one.
- Use our [Bug Report Form](https://github.com/MEHDImp4/FINORA/issues/new?template=bug_report.yml) or [Playback Issue Form](https://github.com/MEHDImp4/FINORA/issues/new?template=playback_issue.yml).
- Include clear reproduction steps, device details, Jellyfin server version, and sanitized logs.

### 2. Suggesting Features
- We love ideas that enhance performance, playback reliability, or visual elegance!
- Open a feature request using our [Feature Request Form](https://github.com/MEHDImp4/FINORA/issues/new?template=feature_request.yml).
- Explain the user problem and provide mockups or references if applicable.

### 3. Submitting Pull Requests
Whether fixing a bug or adding a feature, follow the development workflow below.

---

## 💻 Local Development Setup

### Prerequisites
1. **Node.js**: v22+ (LTS recommended)
2. **npm**: v10+
3. **Java**: JDK 17 (e.g. Temurin 17)
4. **Android Studio**: Android SDK Build-Tools 35+, Android SDK Platform 35+, Android NDK
5. **EAS CLI** (optional for cloud builds): `npm install -g eas-cli`
6. A running [Jellyfin Server](https://jellyfin.org/) (local or remote) for live testing.

> ⚠️ **Note:** FINORA relies on native TurboModules and the React Native New Architecture (`expo-video`, `expo-secure-store`, `expo-background-fetch`, etc.). It **cannot** run inside the Expo Go sandbox app — you must use an **Expo development build**.

### Getting the Code

```bash
# 1. Fork the repository on GitHub, then clone your fork:
git clone https://github.com/<YOUR_USERNAME>/FINORA.git
cd FINORA

# 2. Add the upstream remote:
git remote add upstream https://github.com/MEHDImp4/FINORA.git

# 3. Install npm dependencies:
npm install
```

### Running on Android

```bash
# Generate native Android project and build the debug development APK:
npx expo run:android

# Once the app is installed on your device or emulator, start the Metro bundler:
npx expo start --dev-client
```

### Running on iOS (macOS required)

```bash
# Install CocoaPods and run on iOS simulator:
npx expo run:ios
```

---

## 🧪 Testing & Verification

FINORA enforces strict automated testing and TypeScript strict mode. All checks must pass before a pull request can be merged:

```bash
# Run the full automated test suite:
npm test

# Run tests in watch mode during development:
npm run test:watch

# Run TypeScript typechecks in strict mode:
npm run typecheck
```

---

## 📐 Architecture & Coding Standards

To maintain 60/120 FPS rendering and high reliability, please follow these guidelines:

### 1. Layered Separation of Concerns
```text
Screen (UI / Animations)
  └── Hook (Lifecycle / Local state)
        └── TanStack Query / UseCase (Data fetching & business rules)
              └── Repository (Domain abstraction)
                    └── Jellyfin SDK / Storage Engines
```
- **Screens** focus purely on presentation, user interactions, and animations.
- **Hooks** coordinate state and queries.
- **Repositories** abstract API calls, caching, and database storage.

### 2. Security & Credentials
- **Never store authentication tokens or passwords in `AsyncStorage` or unencrypted SQLite.**
- Always use `expo-secure-store` for sensitive access tokens.
- Never log passwords or authorization tokens. Internal logs must sanitize headers with `[REDACTED]`.

### 3. UI Performance & Animations
- Keep JavaScript re-renders to a minimum. Use TanStack Query selectors instead of storing full API payloads in global state.
- Always use `expo-image` for media poster backdrops and thumbnails (never raw `<Image />`).
- Run fluid gesture-driven animations on the UI thread with React Native Reanimated (v3).

---

## 🔀 Git Workflow & Commit Guidelines

### Branching
1. Always create your feature or bugfix branch from `master`:
   ```bash
   git checkout master
   git pull upstream master
   git checkout -b fix/playback-subtitle-sync
   ```

### Conventional Commits
We follow [Conventional Commits](https://www.conventionalcommits.org/) to keep history readable and generate changelogs cleanly:

- `feat:` A new user-facing feature
- `fix:` A bug fix
- `perf:` A code change that improves performance
- `refactor:` A code change that neither fixes a bug nor adds a feature
- `test:` Adding or updating tests
- `docs:` Documentation changes
- `chore:` Maintenance tasks, dependency updates, build tooling

**Examples:**
- `feat(player): add gesture brightness control slider`
- `fix(offline): handle download retry on network reconnection`
- `docs(readme): add contributing guide link`

---

## 🚀 Submitting a Pull Request

1. Push your branch to your GitHub fork:
   ```bash
   git push origin fix/playback-subtitle-sync
   ```
2. Open a Pull Request against the `master` branch on the upstream repository.
3. Fill out the **Pull Request Template** completely.
4. Ensure all CI automated checks (tests, typecheck, Expo prebuild) pass cleanly.
5. Our team will review your PR, suggest improvements if needed, and merge it!

Thank you for helping make FINORA the best personal streaming client! 🎬🍿
