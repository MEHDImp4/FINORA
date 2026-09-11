# Project Retrospective: FINORA — Watch your way

## Milestone: v1.0 — MVP

**Shipped:** 2026-09-11  
**Phases:** 10 | **Plans:** 26 | **Tests:** 161 passed (42 suites)

### What Was Built
- Production-grade Expo SDK 52 application on React Native New Architecture with Hermes and TypeScript strict.
- Secure Jellyfin client authentication via `@jellyfin/sdk` with strict TLS enforcement, hardware-backed keystore persistence (`expo-secure-store`), and zero plain tokens in logs or storage.
- Decoupled domain repository layer, TanStack Query caching, and display-optimized `expo-image` pipelines.
- Cinematic Home screen with dynamic Hero banner and virtualized carousels sustaining 60/120 Hz render loops.
- Comprehensive Movie and Series details screens with season switchers and episode cards.
- Core video streaming engine (`FinoraPlayerEngine` over `expo-video`) with `PlaybackPlanner` Direct Play negotiation and throttled session reporting.
- Premium player experience with auto-fading controls, interactive timeline scrubbing, track selection modals, swipe gestures, trickplay thumbnail scrubbing, chapter skip markers, and Stats for Nerds.
- Fast media discovery via debounced search, category filtering, search history, and virtualized 3-column library grid.
- Unified UX states (shimmer skeletons, empty views, error views, offline alert banners) and full accessibility support.
- Standalone offline subsystem with download manager, private sandbox storage, offline catalog, local playback, and reconnection progress sync flush.

### What Worked
- **Layered Architecture**: Strict separation of concerns (Screen -> Hook -> Repository -> SDK/Storage) made testing isolated and robust.
- **Wave-Based Plan Execution**: Incrementally verifying tasks within plans prevented regression cascades and ensured all 42 test suites stayed green throughout development.
- **Hardware-Backed Keystore**: Storing sensitive access tokens strictly in `expo-secure-store` while delegating non-sensitive preferences to `AsyncStorage` provided defense-in-depth.

### What Was Inefficient
- Missing summary/verification files across intermediate phases were detected during milestone audit and required retroactive reconciliation. Writing verification artifacts immediately upon phase completion is preferred.

### Patterns Established
- **Jest Mocking for Native Expo Modules**: Centralized, robust mocks in `__mocks__/` for `expo-video`, `expo-secure-store`, `expo-file-system`, and `@react-native-async-storage/async-storage`.
- **Display-Matched Image URL Builder**: Building image URLs requesting exact physical pixel dimensions matching device screen densities to maximize memory and rendering performance.

### Key Lessons
- Clean domain models insulating the UI from raw Jellyfin backend DTOs allowed the UI to evolve rapidly without breaking on backend API quirks.
- Early integration of TypeScript strict mode caught dozens of potential undefined errors and property mismatches during refactors.

---

## Cross-Milestone Trends

| Milestone | Date | Phases | Plans | Tests | Typecheck | Status |
|---|---|---|---|---|---|---|
| **v1.0 MVP** | 2026-09-11 | 10 | 26 | 161/161 | 0 errors | ✅ Shipped |
