<!-- GSD:project-start source:PROJECT.md -->

## Project

**FINORA — Watch your way**

FINORA is a premium personal streaming client for Jellyfin, built with Expo, React Native, and TypeScript. It replaces the frontend experience entirely with a smooth, modern, and cinematic interface comparable in polish and responsiveness to Netflix, Prime Video, or Crunchyroll, while maintaining an original identity.

**Core Value:** The flawless, instant core loop:
**Open FINORA → Browse instantly → Choose content → Play → Watch smoothly → Resume anywhere.**
Quality over feature count, performance over visual gimmicks, and rock-solid playback over shortcuts.

### Constraints

- **Tech Stack**: Expo, React Native New Architecture, TypeScript strict, Expo Router, Hermes, Reanimated, Gesture Handler, expo-video, expo-image, expo-secure-store, expo-file-system, expo-sqlite, @jellyfin/sdk, TanStack Query, Zustand.
- **Performance Budget**:
  - Cold startup: < 1.5–2.0s on target device
  - Touch feedback: < 50ms visual response
  - Scrolling: 60+ FPS minimum, 120 FPS on high-refresh panels
  - Zero ANR, zero memory leaks
- **Security Standards**:
  - No passwords or tokens logged; sanitize Authorization headers (Authorization: [REDACTED])
  - No tokens in AsyncStorage, Zustand persist, or unencrypted SQLite
  - Strict HTTPS / TLS validation; cleartext local HTTP marked with explicit warning
  - No arbitrary WebViews or unvalidated server redirect execution
- **Code Quality**:
  - TypeScript strict mode (no loose any without documented reason)
  - Atomic Git commits with conventional commit messages (feat, fix, perf, refactor, chore, docs, security)
  - Separated concerns: Screen -> Hook -> Query/UseCase -> Repository -> Jellyfin SDK

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## 1. Core Framework & Engine

| Component | Selection | Version / Target | Rationale |
|---|---|---|---|
| Framework | **Expo SDK** (CNG) | Latest Stable (SDK 52+) | Provides managed native build plugins, EAS build support, and reliable native module ecosystem without lock-in. |
| Runtime | **React Native** | 0.76+ | Required for modern TurboModules and Fabric renderer. |
| Architecture | **New Architecture** | Enabled (Fabric + Bridgeless) | Native concurrency, eliminated serialization bottleneck, essential for 60/90/120 FPS render loops. |
| JS Engine | **Hermes** | Enabled | Fast startup (<1.5s cold start), minimal memory footprint, bytecode pre-compilation. |
| Routing | **Expo Router** | v4 | File-based typed routing, deep linking, native stack animations, nested route layout isolation. |
| Language | **TypeScript** | Strict mode | Mandatory type safety for complex Jellyfin API models and streaming engine states. |

## 2. UI, Animations & Rendering

| Component | Selection | Rationale |
|---|---|---|
| Animations | **React Native Reanimated (v3)** | UI-thread driving for zero-JS-frame-drop 60/90/120 Hz micro-interactions, gestures, and transitions. |
| Gestures | **React Native Gesture Handler (v2)** | Native touch arbitration for scrubbers, double-tap seek, and volume/brightness control. |
| Media Images | **expo-image** | High-performance native caching (memory + disk), progressive rendering, blurhash placeholders, downscaled Jellyfin asset requests. |
| Safe Area | **react-native-safe-area-context** | Proper handling of notches, punch-holes, and system navigation bars across devices. |

## 3. Video Playback

| Component | Selection | Rationale |
|---|---|---|
| Base Player | **expo-video** | Modern Expo video engine built on AndroidX Media3 / ExoPlayer on Android and AVPlayer on iOS. Replaces deprecated `expo-av`. |
| Player Abstraction | **FinoraPlayerEngine** | App-internal abstraction wrapper isolating UI from raw player APIs; enables plug-in of custom Media3 native modules if ASS/PGS or specialized codecs require it. |
| Stream Negotiation | **PlaybackPlanner** | Dynamic decision pipeline negotiating Direct Play -> Direct Stream -> Transcoding using device capabilities. |

## 4. State Management & Storage

| Component | Selection | Rationale |
|---|---|---|
| Server Cache | **@tanstack/react-query** | Automatic deduplication, background invalidation, stale-while-revalidate, request cancellation for Jellyfin APIs. |
| Client State | **Zustand** | Minimalist atomic stores for player controls, UI settings, active server state. Zero provider overhead. |
| Secrets / Auth | **expo-secure-store** | Hardware-backed keystore (Android Keystore / iOS Keychain) for Jellyfin access tokens. Passwords discarded post-auth. |
| Preferences | **AsyncStorage** | Non-sensitive preferences (theme, subtitle size, playback gesture toggles). |
| Offline DB | **expo-sqlite** | Fast relational offline store for download indexes, metadata cache, and offline progress synchronization. |
| File Storage | **expo-file-system** | App private sandbox storage for encrypted/isolated offline media downloads. |

## 5. Jellyfin Integration & Networking

| Component | Selection | Rationale |
|---|---|---|
| API SDK | **@jellyfin/sdk** | Official typed TypeScript SDK from Jellyfin project. |
| Repository Layer | **FINORA Repositories** | Decoupled domain wrappers (`AuthRepository`, `MediaRepository`, `PlaybackRepository`, `SessionRepository`, `UserRepository`). |
| Network Polyfills | Centralized Polyfills | React Native runtime polyfills (`react-native-url-polyfill`) ensuring `@jellyfin/sdk` operates identically to web/node environments. |

## 6. What NOT to Use and Why

- **expo-av**: Deprecated, replaced by `expo-video` with superior AndroidX Media3 foundation.
- **Pure JavaScript Image (`<Image />`)**: Lacks progressive disk/memory caching and blurhash, causing frame drops during rapid scrolling.
- **AsyncStorage for tokens**: Vulnerable to root extraction and unencrypted storage; `expo-secure-store` is required.
- **Heavy UI component libraries (NativeBase, Paper)**: Excessive re-renders and JS thread overhead prevent 120 FPS smooth scrolling. Custom Finora Design System is required.
- **Monolithic global stores**: Putting server API payloads into Zustand causes full-app re-renders. Use TanStack Query selectors instead.

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
