# Roadmap: FINORA — Watch your way

## Overview

FINORA is built incrementally from a rock-solid, production-grade native foundation up to a cinematic personal streaming experience. The roadmap begins with core architecture, security, and networking (Phase 1), establishes reliable Jellyfin authentication and session management (Phase 2), develops the data repository and image optimization layers (Phase 3), crafts the cinematic Home browsing experience (Phase 4), and builds rich media details (Phase 5). Next, it focuses on rock-solid video playback with `expo-video` and intelligent Direct Play planning (Phase 6), elevates the player with gestures, trickplay, and controls (Phase 7), adds search and catalog exploration (Phase 8), polishes transitions and accessibility (Phase 9), and culminates in full offline downloads and local playback (Phase 10).

## Phases

- [ ] **Phase 1: Foundation** - Expo New Architecture, TypeScript strict, Expo Router v4, design tokens, networking, secure storage, and polyfills
- [ ] **Phase 2: Jellyfin Connection** - Server discovery, URL & TLS validation, authentication, keystore session persistence, multi-server switcher, and server diagnostics
- [ ] **Phase 3: Jellyfin Data & Repositories** - Decoupled repository layer, TanStack Query caching, display-matched image optimization, and progress synchronization
- [ ] **Phase 4: Cinematic Home** - Dynamic Hero banner, virtualized horizontal carousels, isolated render trees, and 60/90/120 Hz scroll performance
- [ ] **Phase 5: Media Details** - Movie & Series detail screens, season picker, episode cards, and card-to-details micro-interactions
- [ ] **Phase 6: Player Foundation** - FinoraPlayerEngine abstraction, expo-video integration, PlaybackPlanner (Direct Play first), and session progress reporting
- [ ] **Phase 7: Premium Player Experience** - Auto-fading controls, swipe/tap gestures, audio/subtitle tracks, trickplay thumbnails, skip intro/credits, and stats for nerds
- [ ] **Phase 8: Search & Library** - Debounced global search, category filtering, library browser, sorting, and collections
- [ ] **Phase 9: UX Polish & Accessibility** - Screen transitions, haptic feedback, accessibility labels, reduced-motion fallbacks, and unified state handling
- [ ] **Phase 10: Offline Subsystem** - Download manager, private app storage, SQLite metadata index, offline player playback, and reconnection sync

## Phase Details

### Phase 1: Foundation
**Goal**: Establish a production-grade Expo React Native application with New Architecture, Hermes, strict TypeScript, file-based routing, sanitized networking, hardware-backed secure storage, and the foundational FINORA design system.
**Depends on**: Nothing (greenfield initialization)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05
**Success Criteria** (what must be TRUE):
  1. Expo app builds and runs cleanly with Hermes and New Architecture enabled.
  2. Expo Router v4 provides typed navigation and safe-area scaffolding with tab layouts.
  3. Centralized network client enforces timeouts, exponential backoff, and automatically redacts credentials (`Authorization: [REDACTED]`) in all logs.
  4. SecureStore correctly saves and retrieves test secrets from the hardware keystore; AsyncStorage stores preferences.
  5. Finora Design System tokens (cinematic dark palette, typography, layout) render correctly in base UI components.
**Plans**: 3 plans

Plans:
- [ ] 01-01: Initialize Expo project with New Architecture, Hermes, TypeScript strict, and Expo Router v4 navigation structure.
- [ ] 01-02: Implement centralized networking, error hierarchy, polyfills, and credential-scrubbed logger.
- [ ] 01-03: Implement SecureStore abstraction and core Finora Design System tokens (FinoraScreen, Button, Typography).

### Phase 2: Jellyfin Connection
**Goal**: Connect to any Jellyfin server securely, validate TLS certificates, authenticate credentials, persist session tokens in hardware storage, support multi-server switching, and provide live connection diagnostics.
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, DIAG-01
**Success Criteria** (what must be TRUE):
  1. User can input server URL, receive instant connection feedback, and see a warning if connecting over unencrypted HTTP.
  2. User can authenticate with username/password; client identifies as FINORA with persistent installation ID; password is immediately wiped from memory post-auth.
  3. Valid session token is stored in SecureStore and restored seamlessly when the app restarts without re-prompting login.
  4. User can add multiple servers/accounts and switch active server without cross-contaminating cache or credentials.
  5. Diagnostics screen shows live server reachability, HTTPS status, latency, and API health.
**Plans**: 3 plans

Plans:
- [ ] 02-01: Build Jellyfin client initialization with polyfills, client identification, and server connection/URL validation.
- [ ] 02-02: Implement authentication flow, password purging, SecureStore token storage, and session auto-restoration.
- [ ] 02-03: Implement multi-server account switching, logout teardown, and Server Diagnostics view.

### Phase 3: Jellyfin Data & Repositories
**Goal**: Build a decoupled repository architecture wrapping `@jellyfin/sdk`, integrate TanStack Query for caching, implement display-matched image optimization with `expo-image`, and synchronize user watch progress and favorites.
**Depends on**: Phase 2
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04
**Success Criteria** (what must be TRUE):
  1. Domain repositories (Auth, Library, Media, Playback, Session, User) insulate UI components from direct SDK models.
  2. TanStack Query queries fetch libraries, collections, and media items with background refresh and stale-while-revalidate caching.
  3. Image URLs are dynamically dimensioned to match physical screen densities, utilizing `expo-image` memory/disk caching and blurhash placeholders.
  4. User watch progress, resume timestamps, and favorite toggles sync bidirectionally with the server.
**Plans**: 3 plans

Plans:
- [ ] 03-01: Implement FINORA domain models and repository layer wrapping @jellyfin/sdk.
- [ ] 03-02: Setup TanStack Query provider, hooks, and responsive image URL builder with expo-image caching.
- [ ] 03-03: Implement user progress, resume point retrieval, and favorite mutation synchronization.

### Phase 4: Cinematic Home
**Goal**: Build an immersive, high-performance Home screen featuring a dynamic Hero banner and virtualized media carousels operating at 60/90/120 Hz without dropped frames or re-render cascades.
**Depends on**: Phase 3
**Requirements**: HOME-01, HOME-02, HOME-03
**Success Criteria** (what must be TRUE):
  1. Dynamic Hero banner showcases featured media with backdrop, logo/fallback, metadata badges, quick play, and watchlist actions with smooth cross-fade transitions.
  2. Horizontal carousels (Continue Watching with progress bars, Next Up, Recently Added, Movies, Series) render with virtualization.
  3. Scrolling horizontally and vertically sustains 60+ FPS (120 FPS on supported panels); Hero state updates do not trigger re-renders of carousels.
**Plans**: 2 plans

Plans:
- [ ] 04-01: Build dynamic Hero banner with backdrop, typography, logo fallback, and transition animations.
- [ ] 04-02: Build high-performance virtualized horizontal carousels (Continue Watching, Next Up, Media sections) with isolated render boundaries.

### Phase 5: Media Details
**Goal**: Build comprehensive, cinematic details screens for movies and television series with smooth card-to-details transitions and instant user interaction feedback.
**Depends on**: Phase 4
**Requirements**: DET-01, DET-02, DET-03
**Success Criteria** (what must be TRUE):
  1. Movie Details displays backdrop, logo, metadata, synopsis, cast/crew, specs, and play/resume actions.
  2. Series Details displays season switcher, episode cards with thumbnails, descriptions, and individual progress bars.
  3. Tapping a poster provides instant visual feedback (<50ms) and navigates with continuous backdrop visual continuity.
**Plans**: 2 plans

Plans:
- [ ] 05-01: Implement Movie Details screen with cinematic backdrop header, metadata badges, cast list, and action buttons.
- [ ] 05-02: Implement Series Details screen with season selector, episode list, thumbnails, and quick episode playback.

### Phase 6: Player Foundation
**Goal**: Implement the core streaming engine using `expo-video` wrapped in `FinoraPlayerEngine`, negotiate playback mode via `PlaybackPlanner` (preferring Direct Play), report playback sessions to Jellyfin, and maintain playback across lifecycle events.
**Depends on**: Phase 5
**Requirements**: PLAY-01, PLAY-02, PLAY-03, PLAY-04
**Success Criteria** (what must be TRUE):
  1. `FinoraPlayerEngine` abstracts video playback, allowing UI layers to operate cleanly without direct player dependencies.
  2. `PlaybackPlanner` evaluates media streams and device profile to select Direct Play whenever supported, falling back to Direct Stream or Transcoding only when necessary.
  3. Playback progress reports (Start, periodic throttled Progress, Stop) are accurately sent to the Jellyfin server.
  4. Device rotation to landscape maintains smooth video playback without resetting position or restarting stream.
**Plans**: 3 plans

Plans:
- [ ] 06-01: Create FinoraPlayerEngine abstraction wrapping expo-video with player state machine.
- [ ] 06-02: Implement PlaybackPlanner, DeviceProfile hardware capability detector, and stream URL resolver.
- [ ] 06-03: Implement Jellyfin playback session reporting (Start, Progress, Stop) and orientation/lifecycle resilience.

### Phase 7: Premium Player Experience
**Goal**: Elevate playback to a premium streaming experience with auto-fading cinematic controls, gesture navigation, track selection bottom sheets, trickplay thumbnails, skip intro/credits, and stats for nerds.
**Depends on**: Phase 6
**Requirements**: PPL-01, PPL-02, PPL-03, PPL-04, PPL-05, PPL-06
**Success Criteria** (what must be TRUE):
  1. Player overlay controls fade smoothly on user inactivity and appear on screen tap.
  2. Touch gestures allow double-tap seek (+/-10s), vertical swipe brightness/volume, and long-press temporary 2x speed boost.
  3. Sleek bottom sheets allow changing audio tracks, selecting external/embedded subtitle tracks, and choosing playback qualities.
  4. Trickplay preview thumbnails display during timeline scrubbing when provided by Jellyfin.
  5. Skip Intro / Skip Credits buttons appear dynamically when timestamps are available.
  6. Stats for Nerds overlay displays technical stream parameters (codecs, container, bitrate, HDR, dropped frames) with tokens redacted.
**Plans**: 3 plans

Plans:
- [ ] 07-01: Build cinematic auto-fading player overlay, scrub timeline bar, and bottom sheets for audio/subtitle/quality selection.
- [ ] 07-02: Implement player gestures (double-tap seek, vertical swipes, 2x speed) and Trickplay preview scrubbing.
- [ ] 07-03: Implement Skip Intro / Skip Credits buttons and Stats for Nerds technical diagnostic overlay.

### Phase 8: Search & Library
**Goal**: Enable fast media discovery through global debounced search with category filtering and a comprehensive library browsing experience with sorting and collection support.
**Depends on**: Phase 4
**Requirements**: SRCH-01, SRCH-02
**Success Criteria** (what must be TRUE):
  1. User can search across entire server catalog with debounced typing (<300ms) and automatic cancellation of stale requests.
  2. Search results can be filtered by movies, series, episodes, and people, with local search history preserved.
  3. Library browse screen enables filtering by genre, sorting by name/date/rating, and exploring box sets/collections.
**Plans**: 2 plans

Plans:
- [ ] 08-01: Build global search screen with debounced input, request cancellation, category chips, and search history.
- [ ] 08-02: Build Library browse screen with grid virtualization, filters, sorting options, and collection views.

### Phase 9: UX Polish & Accessibility
**Goal**: Deliver a tier-one user experience with fluid screen transitions, subtle haptics, full accessibility screen reader support, and unified screen states (loading skeletons, content, empty, offline, error).
**Depends on**: Phase 8
**Requirements**: UX-01, UX-02
**Success Criteria** (what must be TRUE):
  1. Every major screen gracefully handles Loading (shimmer skeletons), Content, Empty, Offline, and Error states with retry.
  2. Haptic feedback triggers on meaningful actions (favorites, playback controls) without annoying overuse.
  3. Full screen reader support with meaningful accessibility labels and reduced-motion animation alternatives.
**Plans**: 2 plans

Plans:
- [ ] 09-01: Implement reusable screen state components (shimmer skeletons, empty state, offline notice, error banner with retry).
- [ ] 09-02: Add haptic feedback, accessibility labels, and reduced-motion animation accessibility fallbacks.

### Phase 10: Offline Subsystem
**Goal**: Enable complete offline video playback by downloading media items to private app sandbox storage, tracking metadata in an `expo-sqlite` database, and synchronizing watch progress once reconnected.
**Depends on**: Phase 6
**Requirements**: OFFL-01, OFFL-02, OFFL-03
**Success Criteria** (what must be TRUE):
  1. User can download movies and episodes to app private sandbox storage with pause, resume, and cancellation.
  2. `expo-sqlite` tracks offline media records, file sizes, qualities, and pending watch progress timestamps.
  3. User can play downloaded media completely offline, with watch progress recorded locally and synced to Jellyfin upon reconnection.
**Plans**: 3 plans

Plans:
- [ ] 10-01: Implement offline download manager using expo-file-system and private storage.
- [ ] 10-02: Implement SQLite database schema for offline media indexing and pending watch progress sync queue.
- [ ] 10-03: Implement offline media playback and reconnection progress synchronization.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/3 | Not started | - |
| 2. Jellyfin Connection | 0/3 | Not started | - |
| 3. Jellyfin Data & Repositories | 0/3 | Not started | - |
| 4. Cinematic Home | 0/2 | Not started | - |
| 5. Media Details | 0/2 | Not started | - |
| 6. Player Foundation | 0/3 | Not started | - |
| 7. Premium Player Experience | 0/3 | Not started | - |
| 8. Search & Library | 0/2 | Not started | - |
| 9. UX Polish & Accessibility | 0/2 | Not started | - |
| 10. Offline Subsystem | 0/3 | Not started | - |
