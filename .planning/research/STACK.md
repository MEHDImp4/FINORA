# Technology Stack: FINORA

**Domain:** Personal Media Streaming (Jellyfin Client)  
**Target Platform:** Android Smartphone (Priority), expandable to Tablet, Foldable, Android TV, iOS  
**Evaluation Date:** 2026-09-10  
**Confidence:** HIGH  

---

## 1. Core Framework & Engine

| Component | Selection | Version / Target | Rationale |
|---|---|---|---|
| Framework | **Expo SDK** (CNG) | Latest Stable (SDK 52+) | Provides managed native build plugins, EAS build support, and reliable native module ecosystem without lock-in. |
| Runtime | **React Native** | 0.76+ | Required for modern TurboModules and Fabric renderer. |
| Architecture | **New Architecture** | Enabled (Fabric + Bridgeless) | Native concurrency, eliminated serialization bottleneck, essential for 60/90/120 FPS render loops. |
| JS Engine | **Hermes** | Enabled | Fast startup (<1.5s cold start), minimal memory footprint, bytecode pre-compilation. |
| Routing | **Expo Router** | v4 | File-based typed routing, deep linking, native stack animations, nested route layout isolation. |
| Language | **TypeScript** | Strict mode | Mandatory type safety for complex Jellyfin API models and streaming engine states. |

---

## 2. UI, Animations & Rendering

| Component | Selection | Rationale |
|---|---|---|
| Animations | **React Native Reanimated (v3)** | UI-thread driving for zero-JS-frame-drop 60/90/120 Hz micro-interactions, gestures, and transitions. |
| Gestures | **React Native Gesture Handler (v2)** | Native touch arbitration for scrubbers, double-tap seek, and volume/brightness control. |
| Media Images | **expo-image** | High-performance native caching (memory + disk), progressive rendering, blurhash placeholders, downscaled Jellyfin asset requests. |
| Safe Area | **react-native-safe-area-context** | Proper handling of notches, punch-holes, and system navigation bars across devices. |

---

## 3. Video Playback

| Component | Selection | Rationale |
|---|---|---|
| Base Player | **expo-video** | Modern Expo video engine built on AndroidX Media3 / ExoPlayer on Android and AVPlayer on iOS. Replaces deprecated `expo-av`. |
| Player Abstraction | **FinoraPlayerEngine** | App-internal abstraction wrapper isolating UI from raw player APIs; enables plug-in of custom Media3 native modules if ASS/PGS or specialized codecs require it. |
| Stream Negotiation | **PlaybackPlanner** | Dynamic decision pipeline negotiating Direct Play -> Direct Stream -> Transcoding using device capabilities. |

---

## 4. State Management & Storage

| Component | Selection | Rationale |
|---|---|---|
| Server Cache | **@tanstack/react-query** | Automatic deduplication, background invalidation, stale-while-revalidate, request cancellation for Jellyfin APIs. |
| Client State | **Zustand** | Minimalist atomic stores for player controls, UI settings, active server state. Zero provider overhead. |
| Secrets / Auth | **expo-secure-store** | Hardware-backed keystore (Android Keystore / iOS Keychain) for Jellyfin access tokens. Passwords discarded post-auth. |
| Preferences | **AsyncStorage** | Non-sensitive preferences (theme, subtitle size, playback gesture toggles). |
| Offline DB | **expo-sqlite** | Fast relational offline store for download indexes, metadata cache, and offline progress synchronization. |
| File Storage | **expo-file-system** | App private sandbox storage for encrypted/isolated offline media downloads. |

---

## 5. Jellyfin Integration & Networking

| Component | Selection | Rationale |
|---|---|---|
| API SDK | **@jellyfin/sdk** | Official typed TypeScript SDK from Jellyfin project. |
| Repository Layer | **FINORA Repositories** | Decoupled domain wrappers (`AuthRepository`, `MediaRepository`, `PlaybackRepository`, `SessionRepository`, `UserRepository`). |
| Network Polyfills | Centralized Polyfills | React Native runtime polyfills (`react-native-url-polyfill`) ensuring `@jellyfin/sdk` operates identically to web/node environments. |

---

## 6. What NOT to Use and Why

- **expo-av**: Deprecated, replaced by `expo-video` with superior AndroidX Media3 foundation.
- **Pure JavaScript Image (`<Image />`)**: Lacks progressive disk/memory caching and blurhash, causing frame drops during rapid scrolling.
- **AsyncStorage for tokens**: Vulnerable to root extraction and unencrypted storage; `expo-secure-store` is required.
- **Heavy UI component libraries (NativeBase, Paper)**: Excessive re-renders and JS thread overhead prevent 120 FPS smooth scrolling. Custom Finora Design System is required.
- **Monolithic global stores**: Putting server API payloads into Zustand causes full-app re-renders. Use TanStack Query selectors instead.
