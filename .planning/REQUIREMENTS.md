# Requirements: FINORA — Watch your way

**Defined:** 2026-09-10  
**Core Value:** The flawless, instant core loop: Open FINORA → Browse instantly → Choose content → Play → Watch smoothly → Resume anywhere.  

---

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation & Architecture (FOUND)

- [x] **FOUND-01**: Initialize Expo React Native project with New Architecture, Hermes, TypeScript strict, and Expo Router v4.
- [x] **FOUND-02**: Establish clean layered folder architecture (app, components, features, core, design-system, hooks, stores, types, utils).
- [x] **FOUND-03**: Implement centralized network client with timeouts, retry backoff, sanitized logging, and typed error hierarchy.
- [x] **FOUND-04**: Implement secure storage abstraction using expo-secure-store for tokens and AsyncStorage for non-sensitive preferences.
- [x] **FOUND-05**: Implement core FINORA Design System tokens (cinematic dark palette, typography, spacing, FinoraScreen, buttons, icons).

### Authentication & Multi-Server (AUTH)

- [x] **AUTH-01**: Add Jellyfin server with URL validation, strict TLS/HTTPS validation, and explicit warning for unencrypted local HTTP.
- [x] **AUTH-02**: Authenticate user via @jellyfin/sdk with proper client identification (FINORA, device info, persistent installation ID).
- [x] **AUTH-03**: Securely persist access tokens in hardware keystore, discard password immediately post-auth, and auto-restore session on startup.
- [x] **AUTH-04**: Support multi-server configurations and user switching without cross-contaminating cache or credentials.
- [x] **AUTH-05**: Implement clean logout, session revocation, and cache clearing.

### Jellyfin Data & Repositories (DATA)

- [x] **DATA-01**: Build FINORA repository abstraction layer (AuthRepository, MediaRepository, PlaybackRepository, SessionRepository, UserRepository).
- [x] **DATA-02**: Fetch and cache user libraries, items, collections, and metadata via TanStack Query.
- [x] **DATA-03**: Construct display-optimized image URLs with expo-image (memory/disk cache, blurhash placeholders, downsampled resolutions).
- [x] **DATA-04**: Synchronize user watch progress, resume timestamps, and favorites bidirectionally with Jellyfin.

### Home & Browsing (HOME)

- [x] **HOME-01**: Build dynamic cinematic Hero banner with backdrop, logo, metadata badges, quick play, and watchlist toggle.
- [x] **HOME-02**: Build virtualized horizontal carousels (Continue Watching with progress bars, Next Up, Recently Added, Movies, Series).
- [x] **HOME-03**: Maintain 60/90/120 Hz scroll performance with isolated render trees preventing carousel re-renders on Hero changes.

### Media Details (DET)

- [x] **DET-01**: Build Movie Details screen with cinematic backdrop, logo, synopsis, metadata, cast/crew, specs, and play/resume actions.
- [x] **DET-02**: Build Series Details screen with season switcher, episode cards, thumbnails, progress, and quick next-episode play.
- [x] **DET-03**: Implement smooth card-to-details transition continuity and touch feedback (<50ms).

### Playback Foundation (PLAY)

- [x] **PLAY-01**: Build FinoraPlayerEngine abstraction over expo-video isolating player logic from UI components.
- [x] **PLAY-02**: Implement PlaybackPlanner to negotiate stream mode (Direct Play > Direct Stream > Transcoding) based on DeviceProfile.
- [x] **PLAY-03**: Report playback progress to Jellyfin (Start, throttled periodic Progress, Stop final event).
- [x] **PLAY-04**: Maintain playback state across device orientation changes, backgrounding, and lock screen events without restarting stream.

### Premium Player & Controls (PPL)

- [ ] **PPL-01**: Implement minimalist cinematic overlay controls with auto-fade on inactivity and scrub timeline.
- [ ] **PPL-02**: Support audio track selection and subtitle selection (external/embedded) via sleek bottom sheets.
- [ ] **PPL-03**: Implement player touch gestures (double-tap seek +/-10s, vertical brightness/volume swipes, long-press 2x speed) with toggle options.
- [ ] **PPL-04**: Implement Trickplay preview scrubbing thumbnails when available from Jellyfin.
- [ ] **PPL-05**: Implement Skip Intro and Skip Credits actions when chapter/plugin timestamps are present.
- [ ] **PPL-06**: Implement Stats for Nerds overlay showing codecs, container, resolution, bitrate, HDR mode, and dropped frames (token redacted).

### Search & Library (SRCH)

- [ ] **SRCH-01**: Build global Jellyfin search with debounce, request cancellation, category filtering (movies, series, episodes, people), and local search history.
- [ ] **SRCH-02**: Build Library browse screen with sorting, filtering, and collection viewing.

### UX Polish & States (UX)

- [ ] **UX-01**: Implement unified screen state architecture: Loading skeletons, Content, Empty, Offline, and Error states with retry.
- [ ] **UX-02**: Add subtle haptic feedback for key actions, full accessibility labels, and reduced-motion animation fallbacks.

### Offline Subsystem (OFFL)

- [ ] **OFFL-01**: Implement offline download manager using expo-file-system and private app storage.
- [ ] **OFFL-02**: Persist offline metadata, download queue, and pending watch progress sync with expo-sqlite.
- [ ] **OFFL-03**: Implement offline playback from local storage with progress recording queued for reconnection sync.

### Diagnostics & Settings (DIAG)

- [x] **DIAG-01**: Implement Settings screen with Server Diagnostics (connectivity, API status, HTTPS, latency, playback health).

---

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Television & 10-Foot Experience (TV)

- **TV-01**: Android TV / Google TV 10-foot UI with D-pad navigation and focus management.
- **TV-02**: Auto-framerate matching on supported Android TV hardware.

### Synchronized Playback (SYNC)

- **SYNC-01**: Multi-user live synchronized watching (SyncPlay).

### Advanced Native Extensions (EXT)

- **EXT-01**: Custom Media3 native module with libass for complex stylized ASS/SSA subtitles if expo-video proves insufficient.

---

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Desktop web client | Focus is strictly on native mobile performance and polish. |
| Full Kotlin/Swift rewrite | Expo CNG architecture handles native requirements cleanly without duplicating codebase. |
| Insecure TLS bypass | Relaxing certificate validation is a major security vulnerability; forbidden. |
| Arbitrary WebViews | Disallowed to ensure zero-trust security and prevent XSS or unvalidated redirects. |
| Multi-backend support (Plex/Emby) | Focus is exclusively on delivering the ultimate Jellyfin client experience. |
| Social chat & commenting | FINORA is a streaming client, not a social network. |
| Public gallery media export | Downloaded media is stored securely in app private storage to protect metadata and integrity. |

---

## Traceability

Which phases cover which requirements.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1: Foundation | Complete |
| FOUND-02 | Phase 1: Foundation | Complete |
| FOUND-03 | Phase 1: Foundation | Complete |
| FOUND-04 | Phase 1: Foundation | Complete |
| FOUND-05 | Phase 1: Foundation | Complete |
| AUTH-01 | Phase 2: Jellyfin Connection | Complete |
| AUTH-02 | Phase 2: Jellyfin Connection | Complete |
| AUTH-03 | Phase 2: Jellyfin Connection | Complete |
| AUTH-04 | Phase 2: Jellyfin Connection | Complete |
| AUTH-05 | Phase 2: Jellyfin Connection | Complete |
| DIAG-01 | Phase 2: Jellyfin Connection | Complete |
| DATA-01 | Phase 3: Jellyfin Data & Repositories | Complete |
| DATA-02 | Phase 3: Jellyfin Data & Repositories | Complete |
| DATA-03 | Phase 3: Jellyfin Data & Repositories | Complete |
| DATA-04 | Phase 3: Jellyfin Data & Repositories | Complete |
| HOME-01 | Phase 4: Cinematic Home | Complete |
| HOME-02 | Phase 4: Cinematic Home | Complete |
| HOME-03 | Phase 4: Cinematic Home | Complete |
| DET-01 | Phase 5: Media Details | Complete |
| DET-02 | Phase 5: Media Details | Complete |
| DET-03 | Phase 5: Media Details | Complete |
| PLAY-01 | Phase 6: Player Foundation | Pending |
| PLAY-02 | Phase 6: Player Foundation | Pending |
| PLAY-03 | Phase 6: Player Foundation | Pending |
| PLAY-04 | Phase 6: Player Foundation | Pending |
| PPL-01 | Phase 7: Premium Player Experience | Pending |
| PPL-02 | Phase 7: Premium Player Experience | Pending |
| PPL-03 | Phase 7: Premium Player Experience | Pending |
| PPL-04 | Phase 7: Premium Player Experience | Pending |
| PPL-05 | Phase 7: Premium Player Experience | Pending |
| PPL-06 | Phase 7: Premium Player Experience | Pending |
| SRCH-01 | Phase 8: Search & Library | Pending |
| SRCH-02 | Phase 8: Search & Library | Pending |
| UX-01 | Phase 9: UX Polish & Accessibility | Pending |
| UX-02 | Phase 9: UX Polish & Accessibility | Pending |
| OFFL-01 | Phase 10: Offline Subsystem | Pending |
| OFFL-02 | Phase 10: Offline Subsystem | Pending |
| OFFL-03 | Phase 10: Offline Subsystem | Pending |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35
- Completed: 21
- Unmapped: 0 ✓

---
*Requirements defined: 2026-09-10*  
*Last updated: 2026-09-10 after Phase 1 completion*
