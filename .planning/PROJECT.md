# FINORA — Watch your way

## What This Is

FINORA is a premium personal streaming client for Jellyfin, built with Expo, React Native, and TypeScript. It replaces the frontend experience entirely with a smooth, modern, and cinematic interface comparable in polish and responsiveness to Netflix, Prime Video, or Crunchyroll, while maintaining an original identity.

## Core Value

The flawless, instant core loop:
**Open FINORA → Browse instantly → Choose content → Play → Watch smoothly → Resume anywhere.**
Quality over feature count, performance over visual gimmicks, and rock-solid playback over shortcuts.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **FOUND-01**: Initialize Expo React Native project with New Architecture, Hermes, TypeScript strict, Expo Router, and base folder structure
- [ ] **FOUND-02**: Implement FINORA Design System foundation (dark cinematic palette, typography, layout tokens, FinoraScreen, buttons, icons, feedback)
- [ ] **FOUND-03**: Centralize networking with resilient HTTP client, timeout, retry, backoff, sanitized logging, and error hierarchy
- [ ] **FOUND-04**: Implement secure storage layer with expo-secure-store for sensitive tokens and AsyncStorage for user preferences
- [ ] **AUTH-01**: Connect to Jellyfin server, validate HTTPS/TLS or warning for unencrypted local HTTP, and test connectivity
- [ ] **AUTH-02**: Authenticate user against Jellyfin via @jellyfin/sdk with proper client identification (FINORA, device info, persistent installation ID)
- [ ] **AUTH-03**: Securely store auth token, discard password immediately post-auth, restore session on app start, and support multi-server session switching
- [ ] **AUTH-04**: Implement logout and clean session invalidation
- [ ] **DATA-01**: Create FINORA Jellyfin client abstraction layer (Repositories: Auth, Library, Media, Playback, Session, User)
- [ ] **DATA-02**: Fetch user media libraries, collections, genres, and metadata with TanStack Query caching
- [ ] **DATA-03**: Construct optimized image URLs (expo-image) with display-matched resolutions, memory/disk cache, and smart prefetching
- [ ] **DATA-04**: Synchronize user watch progress, resume points, and favorites with Jellyfin server
- [ ] **HOME-01**: Build cinematic Home screen with dynamic Hero banner (backdrop, logo/fallback, metadata, quick play, watchlist toggle)
- [ ] **HOME-02**: Implement virtualized, high-performance horizontal carousels (Continue Watching, Next Up, Recently Added, Movies, Series)
- [ ] **HOME-03**: Maintain 60/90/120 Hz scroll performance with isolated render trees preventing carousel re-renders on Hero changes
- [ ] **DET-01**: Build Movie Details screen with cinematic backdrop, logo, synopsis, metadata badges, cast/crew, and technical specs
- [ ] **DET-02**: Build Series Details screen with season switcher, episode cards, thumbnails, progress, and quick next-episode play
- [ ] **DET-03**: Add seamless press feedback, micro-interactions, and visual continuity from poster/card to details screen
- [ ] **PLAY-01**: Build FinoraPlayerEngine abstraction over expo-video (with clean boundary for future native module extensions)
- [ ] **PLAY-02**: Implement PlaybackPlanner to negotiate playback mode (Direct Play > Direct Stream > Transcoding) using DeviceProfile capabilities
- [ ] **PLAY-03**: Implement Playback reporting to Jellyfin (Start, Progress with throttled reporting, Stop final event)
- [ ] **PLAY-04**: Handle playback lifecycle (backgrounding, lock screen, orientation changes without restarting playback, PiP)
- [ ] **PLAY-05**: Implement cinematic player overlay with auto-fade controls, scrub timeline, trickplay preview thumbnails, and stats for nerds
- [ ] **PLAY-06**: Support audio track selection, subtitle tracks (external/embedded, styling), and quality selection via bottom sheets
- [ ] **PLAY-07**: Implement player gestures (double tap seek +/-10s, vertical swipe brightness/volume, long press 2x boost) with toggle options
- [ ] **PLAY-08**: Support chapter navigation and Skip Intro / Skip Credits when timestamps are available
- [ ] **SRCH-01**: Build global Jellyfin search with debounce, request cancellation, category filtering (movies, series, episodes, people), and local search history
- [ ] **SRCH-02**: Build Library browse screen with sorting, filtering, and collection viewing
- [ ] **UX-01**: Implement consistent screen states: Loading skeletons, Content, Empty, Offline, and Error states with retry
- [ ] **UX-02**: Add subtle haptic feedback for key interactions, accessibility labels, and reduced-motion support
- [ ] **OFFL-01**: Implement offline download manager using expo-file-system and private app storage
- [ ] **OFFL-02**: Persist offline metadata, download queue, and pending watch progress sync with expo-sqlite
- [ ] **OFFL-03**: Implement offline playback from local storage with progress recording queued for reconnection sync
- [ ] **DIAG-01**: Implement Settings screen with Server Diagnostics (connectivity, API status, HTTPS, latency, playback health)

### Out of Scope

- **Desktop web application** — Mobile/native experience is priority; web browser client is not in v1 scope
- **Rewriting entirely in Kotlin/Swift** — Stick with Expo + React Native architecture; use targeted native modules only if expo-video has specific unresolvable limitations
- **Social features & live chat** — FINORA is focused on personal media playback, not a social network
- **Third-party streaming services (Plex, Emby, Stremio)** — FINORA is strictly dedicated to Jellyfin backend
- **Automatic public gallery export of downloads** — Media stays in FINORA private app storage for security and metadata integrity
- **Disabling TLS verification / trust-all-certs** — Insecure certificate bypass is forbidden; explicit cleartext HTTP permitted only for local LAN with warning

## Context

- **Platform Target**: Primary focus is Android smartphone (60Hz, 90Hz, 120Hz displays). Architecture must keep tablet, foldables, Android TV, and iOS accessible for future milestones without re-architecting.
- **Backend**: Jellyfin server (official REST API / @jellyfin/sdk).
- **Core Technology**: Expo (EAS / Dev Client compatible, CNG ready), React Native New Architecture (Fabric/TurboModules), Hermes engine, Expo Router.
- **Media Engine**: expo-video as base engine wrapped in FinoraPlayerEngine abstraction to enable Media3 / custom ExoPlayer native extension if ASS/PGS or advanced codec needs require it.
- **State Separation**: Server state managed by TanStack Query; client UI state in lightweight Zustand slices; sensitive tokens strictly in expo-secure-store.

## Constraints

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

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Expo + New Architecture + Hermes | Modern tooling, optimal performance, CNG native extensibility without losing Expo benefits | — Pending |
| expo-video wrapped in FinoraPlayerEngine | High performance native player foundation with clean separation for future native codec/subtitles extensions | — Pending |
| @jellyfin/sdk with FINORA Repository Layer | Official TypeScript support isolated behind app repositories for upgrade safety | — Pending |
| TanStack Query + Zustand separation | Network state cached intelligently without polluting global client stores | — Pending |
| expo-secure-store for credentials | Passwords never persisted, auth tokens encrypted at rest via hardware-backed keystore | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via /gsd-transition):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via /gsd:complete-milestone):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-10 after initialization*
