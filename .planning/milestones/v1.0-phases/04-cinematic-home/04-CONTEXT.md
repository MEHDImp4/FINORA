# Phase 04: Cinematic Home - Context

**Gathered:** 2026-09-10  
**Status:** Ready for planning  
**Source:** FINORA Master Development Prompt & ROADMAP.md  

<domain>
## Phase Boundary

Phase 4 creates the signature visual experience of FINORA: the Cinematic Home screen. It delivers a dynamic featured Hero banner with backdrop imagery, logo fallback, metadata badges, quick play and watchlist actions, and horizontal virtualized media carousels (Continue Watching with progress bars, Next Up, Recently Added, Movies, Series) sustaining 60/90/120 Hz render performance with isolated render trees preventing carousel re-renders on Hero state changes.
</domain>

<decisions>
## Implementation Decisions

### 1. Dynamic Cinematic Hero Banner (HOME-01)
- **Visual Composition**:
  - High-resolution display-matched backdrop (`imageUrlBuilder.getBackdropUrl`).
  - Dark gradient overlay fading seamlessly into `#0A0A0C` background (`expo-linear-gradient`).
  - Clear logo presentation with high-contrast typography fallback when logo image is unavailable.
  - Metadata badges: Release year, content rating/runtime, community star rating (e.g. `★ 8.8`), genre tags.
  - Primary CTA: "Play" button with prominent play icon and instant touch feedback (<50ms).
  - Secondary CTA: Watchlist / Favorite toggle button integrated with `useToggleFavorite` for optimistic bookmarking.
- **Micro-Interactions**:
  - Smooth cross-fade when cycling featured items or switching tabs.
  - Subtle breathing/parallax elevation effect.

### 2. Virtualized Media Carousels (HOME-02)
- **Sections**:
  - **Continue Watching (Resume)**: Horizontal cards showcasing resume progress bars (`playedPercentage`), episode/movie title, and quick resume trigger.
  - **Next Up**: Next unplayed episodes in series currently being watched.
  - **Recently Added**: Newly ingested movies and episodes with new indicator badges.
  - **Browse Libraries**: Horizontal carousels representing active libraries (Movies, TV Shows).
- **Media Card Architecture (`MediaCard.tsx`)**:
  - Fixed aspect ratio (2:3 for posters, 16:9 for episode thumbnails / continue watching).
  - `expo-image` progressive rendering with blurhash placeholder.
  - Progress bar overlay for in-progress media.
  - Touch feedback <50ms with subtle scale press effect.

### 3. Isolated Render Boundaries & 120 FPS Performance (HOME-03)
- **Isolated Component Trees**:
  - `HeroBanner` maintains its own internal animation/timer state; timer ticks and backdrop cross-fades MUST NOT trigger re-renders in carousel flat lists.
  - Each `MediaCarousel` is wrapped with `React.memo` and consumes isolated TanStack Query selector hooks.
  - `FlatList` virtualization parameters configured:
    - `horizontal={true}`
    - `showsHorizontalScrollIndicator={false}`
    - `initialNumToRender={5}`
    - `maxToRenderPerBatch={5}`
    - `windowSize={5}`
    - `removeClippedSubviews={Platform.OS === 'android'}`
    - `keyExtractor={(item) => item.id}`
- **Memory & Frame Rate Budget**:
  - Sustains 60+ FPS on standard devices, 120 FPS on high-refresh panels (ROG Zephyrus, Galaxy S24, Pixel 9, iPhone Pro).
  - Zero dropped frames during vertical and horizontal scrolling arbitration.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing:**
- `.planning/PROJECT.md` — Core value and performance budget (60/90/120 FPS, <50ms touch response)
- `.planning/REQUIREMENTS.md` — HOME-01, HOME-02, HOME-03
- `src/types/media.ts` — `MediaItem`, `MediaLibrary` domain models
- `src/core/repositories/imageUrlBuilder.ts` — `getBackdropUrl`, `getPosterUrl`, `getLogoUrl`
- `src/hooks/useMediaQueries.ts` — `useResumeItems`, `useRecentlyAdded`, `useLibraries`, `useLibraryItems`
- `src/hooks/useUserDataMutations.ts` — `useToggleFavorite`
</canonical_refs>

<specifics>
## Specific Requirements Covered

- **HOME-01**: Build dynamic cinematic Hero banner with backdrop, logo, metadata badges, quick play, and watchlist toggle.
- **HOME-02**: Build virtualized horizontal carousels (Continue Watching with progress bars, Next Up, Recently Added, Movies, Series).
- **HOME-03**: Maintain 60/90/120 Hz scroll performance with isolated render trees preventing carousel re-renders on Hero changes.
</specifics>

<deferred>
## Deferred Ideas
- Movie Details & Series Details screens navigation target → Phase 5 (Media Details)
- Direct video playback engine instantiation from Play button → Phase 6 (Player Foundation)
</deferred>
