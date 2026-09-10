# Project Research Summary

**Project:** FINORA — Watch your way  
**Domain:** Personal Media Streaming (Jellyfin Client)  
**Researched:** 2026-09-10  
**Confidence:** HIGH  

## Executive Summary

FINORA replaces the default Jellyfin frontend experience on mobile with a fast, cinematic, and native-feeling client. Unlike generic media frontends or web wrappers, FINORA is engineered specifically around React Native's New Architecture (Fabric/TurboModules), Hermes, and Expo Router, targeting steady 60/90/120 Hz render performance on modern Android smartphones, while retaining cross-platform readiness for tablets, foldables, Android TV, and iOS.

The foundation relies on an architectural separation between presentation, hooks, query cache (TanStack Query), domain repositories, and the underlying `@jellyfin/sdk`. Playback is anchored by `expo-video` encapsulated in a custom `FinoraPlayerEngine` and guided by a dedicated `PlaybackPlanner` to maximize Direct Play and minimize server transcoding overhead.

Security and resilience are first-class citizens: access tokens reside strictly in hardware keystores (`expo-secure-store`), logging redacts all credentials, URLs and TLS connections are validated, and a robust offline download subsystem powered by `expo-sqlite` and `expo-file-system` ensures playback continuity regardless of network stability.

## Key Findings

### Recommended Stack

- **Core Framework:** Expo SDK 52+ with React Native New Architecture and Hermes for rapid startup (<1.5s) and zero-bridge overhead.
- **Routing:** Expo Router v4 for file-based nested routing, type safety, and native transition isolation.
- **UI & Performance:** React Native Reanimated v3, React Native Gesture Handler v2, and `expo-image` for memory-efficient cached image rendering.
- **Playback:** `expo-video` wrapped in `FinoraPlayerEngine` abstraction with intelligent `PlaybackPlanner`.
- **State & Storage:** TanStack Query for server state cache, Zustand for lightweight client state, `expo-secure-store` for secrets, `expo-sqlite` for offline metadata.
- **Jellyfin SDK:** `@jellyfin/sdk` with `react-native-url-polyfill`.

### Expected Features

**Must have (table stakes):**
- Server connectivity with TLS validation (explicit warning for local unencrypted HTTP).
- Secure authentication, session restoration, and multi-server management.
- Dynamic Home screen with Hero banner and virtualized carousels (Continue Watching, Next Up, Recently Added).
- Comprehensive Movie and Series details with episode navigation.
- Stable video player with Direct Play preference, progress reporting to Jellyfin, and orientation resilience.
- Global search with debounced typing.

**Should have (competitive differentiators):**
- 60/90/120 FPS fluid navigation with touch feedback under 50ms.
- Trickplay scrubbing preview thumbnails.
- Skip Intro / Skip Credits timestamp support.
- Stats for Nerds technical diagnostic overlay.
- Offline downloads with private sandbox storage and reconnect progress sync.

**Defer (v2+):**
- Android TV 10-foot D-pad layout optimization.
- Multi-user live synchronized watching (party watch).

### Architecture Approach

Layered modular architecture ensuring UI components never perform raw SDK calls or direct credential manipulation. Screens invoke ViewModel-like hooks, hooks delegate to TanStack Query and Repositories, and repositories communicate with `@jellyfin/sdk` and `expo-secure-store`.

### Critical Pitfalls

1. **Missing URL Polyfill:** Must initialize `react-native-url-polyfill/auto` before `@jellyfin/sdk` loads.
2. **Carousel Re-rendering:** Keep Hero state and playback progress out of the carousel component trees.
3. **Oversized Images:** Enforce thumbnail dimensions in Jellyfin image URLs to avoid memory crashes.
4. **Playback Reset on Orientation:** Maintain player engine state independently of screen component remounts.
5. **Credential Leakage:** Discard passwords post-login; redact sensitive headers in centralized logging.

## Implications for Roadmap

The research directly validates the 10-phase development plan outlined in the master specification:

### Phase 0: Foundation
**Rationale:** Establishes Expo project, New Architecture, TypeScript strict, design system tokens, networking, secure storage, and polyfills before any feature code is written.
**Delivers:** Clean, runnable skeleton with polyfills, sanitized logger, and design system tokens.
**Avoids:** Missing polyfill runtime crashes and insecure storage architecture.

### Phase 1: Jellyfin Connection
**Rationale:** Validates server communication, TLS safety, and secure token lifecycle.
**Delivers:** Server discovery/addition, login, session persistence in SecureStore, multi-server switcher.
**Avoids:** Token leaks and credentials remaining in RAM.

### Phase 2: Jellyfin Data & Repositories
**Rationale:** Builds domain models, repositories, and image resolution optimization before UI construction.
**Delivers:** Library queries, item metadata, optimized image URLs, and favorites synchronization.
**Avoids:** Oversized backdrop downloads and direct SDK coupling.

### Phase 3: Cinematic Home
**Rationale:** Delivers the primary browsing surface with rigorous performance constraints.
**Delivers:** Dynamic Hero banner, virtualized horizontal carousels (Continue Watching, Next Up, Recently Added).
**Avoids:** 60/90/120 Hz frame drops and carousel re-render cascades.

### Phase 4: Media Details
**Rationale:** Enables users to drill down into movies and series before initiating playback.
**Delivers:** Movie details, Series details with season/episode selector, and metadata presentation.

### Phase 5: Player Foundation
**Rationale:** First half of core playback loop; focuses on rock-solid stream negotiation and stability.
**Delivers:** `FinoraPlayerEngine` abstraction, `PlaybackPlanner` (Direct Play > Direct Stream > Transcoding), and Jellyfin session progress reporting.
**Avoids:** Orientation change resets and false transcoding due to conservative device profiling.

### Phase 6: Premium Player Experience
**Rationale:** Upgrades playback to Netflix/Crunchyroll level of polish.
**Delivers:** Auto-fading controls, gestures (seek, brightness, volume, 2x boost), audio/subtitle tracks, trickplay, and stats for nerds.

### Phase 7: Search & Library
**Rationale:** Expands media discovery across full server catalogs.
**Delivers:** Debounced global search, category filtering, library browsing with sorting.

### Phase 8: UX Polish & Accessibility
**Rationale:** Elevates micro-interactions, haptics, transitions, and accessibility.
**Delivers:** Screen transitions, feedback animations, haptic cues, screen reader labels, and offline/empty state refinement.

### Phase 9: Offline Mode
**Rationale:** Adds standalone offline capability without destabilizing the online playback loop.
**Delivers:** Private download manager, SQLite offline metadata index, offline player playback, and reconnect sync.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified with current Expo SDK, React Native 0.76+ New Architecture, and @jellyfin/sdk |
| Features | HIGH | Comprehensive specifications aligned with leading streaming platforms |
| Architecture | HIGH | Clean repository pattern separating SDK from React presentation layer |
| Pitfalls | HIGH | Specific mitigations identified for memory, orientation, and polyfill gotchas |

**Overall confidence:** HIGH

## Sources

### Primary (HIGH confidence)
- Official Expo Documentation (`expo-video`, `expo-image`, `expo-secure-store`, `expo-router`)
- Official Jellyfin TypeScript SDK (`@jellyfin/sdk`)
- React Native New Architecture guides (Hermes, Fabric, TurboModules)

---
*Research completed: 2026-09-10*  
*Ready for roadmap: yes*
