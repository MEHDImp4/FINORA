# Features Breakdown: FINORA

**Domain:** Personal Media Streaming (Jellyfin Client)  
**Evaluation Date:** 2026-09-10  
**Confidence:** HIGH  

---

## 1. Table Stakes (Must Have for v1 Launch)

Features that users expect from any competitive streaming client:

- **Authentication & Multi-server**:
  - Add server with protocol/URL validation (HTTP local with warning, HTTPS strict TLS).
  - User login, password discarded post-auth, token secured in hardware keystore.
  - Automatic session restoration on app launch.
  - Multi-server / multi-user profile switching.
  - Clean logout and session teardown.
- **Home & Media Browsing**:
  - Dynamic Hero banner with backdrop, logo, metadata, quick play, watchlist toggle.
  - Continue Watching carousel with live watch percentages and resume capability.
  - Next Up (next episodes in series).
  - Recently Added media sections.
  - Virtualized carousels supporting large libraries with zero scroll stutter.
- **Media Details**:
  - Movie details: Backdrop, poster, logo, synopsis, year, runtime, genres, rating, cast/crew, specs.
  - Series details: Seasons selector, episode cards with thumbnails, descriptions, and progress bars.
  - Action buttons: Play, Resume, Favorite, Download.
- **Video Playback**:
  - Direct Play first, Direct Stream second, Transcoding fallback.
  - Auto-fade minimalist cinematic overlay controls.
  - Scrub timeline, accurate seeking (+/-10s double-tap).
  - Audio track and subtitle selection (external/embedded).
  - Playback progress reporting to Jellyfin (Start, Progress, Stop).
  - Orientation locking and background/PiP lifecycle resilience.
- **Search**:
  - Fast global search with debounced typing and cancellation of stale requests.
  - Filtering by movies, series, episodes, and people.

---

## 2. Competitive Differentiators (Premium Finishing)

Features that set FINORA apart from standard/generic clients:

- **60/90/120 Hz Target Framerate**: Zero dropped frames, UI-thread driven animations using Reanimated v3.
- **Netflix/Crunchyroll-grade Transitions**: Visual continuity between poster press and detail screen backdrop.
- **FinoraPlayerEngine & PlaybackPlanner**: Intelligent device profile matching to prevent unwanted server transcode load.
- **Trickplay Thumbnails**: Scrubbing preview thumbnails when generated on Jellyfin server.
- **Skip Intro / Skip Credits**: Instant one-tap timestamp skipping for episodic content.
- **Stats for Nerds**: On-demand overlay showing stream mode, codecs, container, bitrate, resolution, HDR format, and dropped frames (with token redaction).
- **Gesture Controls**: Vertical brightness (left side) and volume (right side) swipes; long-press 2x speed boost.
- **Offline Mode with Private Storage**: Download movies/episodes to sandbox storage with offline playback and sync-on-reconnect.

---

## 3. Anti-Features (Deliberately NOT Building in v1)

- **Arbitrary WebViews / HTML Injection**: Never run unvalidated web frames from server metadata to preserve zero-trust security.
- **Monolithic In-Memory Library Caching**: Never fetch all items in one call; use targeted pagination and TanStack Query caching.
- **Public Gallery Video Saving**: Media files stay in FINORA app storage; no dumping raw files into system gallery.
- **Plex/Emby/Stremio Protocol Multi-stack**: Strict specialization on Jellyfin ensures clean, bug-free domain logic.
- **Social Chat / Live Party Watch**: Distracts from the core streaming loop and adds server overhead.
