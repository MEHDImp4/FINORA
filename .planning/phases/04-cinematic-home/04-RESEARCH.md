# Phase 04: Cinematic Home - Research

**Phase:** 04-cinematic-home  
**Date:** 2026-09-10  
**Status:** Completed  

---

## Technical Approach & Architecture

### 1. Cinematic Hero Banner Architecture (HOME-01)
- **Visual Presentation**:
  - Full-width container (height: ~48-52% of window height or ~440dp).
  - Background: Backdrop image loaded with `expo-image` at quality 80, sized to display width.
  - Overlay: Multi-stop linear gradient (`expo-linear-gradient`):
    - Top: subtle dark vignette (`rgba(10, 10, 12, 0.4)`).
    - Middle: transparent.
    - Bottom: deep pitch black fade (`#0A0A0C`) cleanly blending into screen surface.
  - Content Overlay:
    - Logo image if `item.logoImageTag` exists (max height 60dp, max width 220dp, contain resize mode).
    - If no logo, typographic display title (`FinoraText` variant `title`, 26px bold with subtle text shadow).
    - Badge row: Release year (e.g. `2024`), runtime badge (e.g. `2h 14m`), community star rating (`★ 8.5` in gold `#FFB800`), genre chips.
    - Action buttons:
      - Primary: `FinoraButton` "Play" (primary red accent, play icon).
      - Secondary: `FinoraIconButton` Watchlist / Favorite toggle (`★` / `+` bookmark).
- **Featured Selection**:
  - Derives featured item from `useRecentlyAdded` or `useResumeItems` with backdrops.
  - Cycles featured content smoothly without resetting carousel scroll states.

### 2. High-Performance Virtualized Media Carousels (HOME-02)
- **Component**: `MediaCarousel.tsx`:
  - Section title (`Continue Watching`, `Recently Added`, `Movies`, `TV Shows`).
  - Virtualized `FlatList` with horizontal scrolling.
  - Optimizations:
    - `horizontal={true}`
    - `showsHorizontalScrollIndicator={false}`
    - `initialNumToRender={4}`
    - `maxToRenderPerBatch={4}`
    - `windowSize={4}`
    - `getItemLayout` for fixed width items to enable instant scroll calculation.
- **Media Card (`MediaCard.tsx`)**:
  - Two distinct card variants:
    - `poster` (2:3 aspect ratio, width: ~130dp, height: ~195dp) for standard movie/series browsing.
    - `backdrop` / `thumbnail` (16:9 aspect ratio, width: ~220dp, height: ~124dp) for "Continue Watching" with active progress bar overlay.
  - Features:
    - `<Image>` from `expo-image` with memory/disk cache and blurhash placeholders.
    - Title caption beneath card with year.
    - Progress bar: red accent line `#E50914` over track `#262633` indicating percentage watched.
    - Immediate visual touch feedback (<50ms press scale 0.97).

### 3. Isolated Render Trees & 60/90/120 Hz Scroll Performance (HOME-03)
- **Isolation Strategy**:
  - `HeroBanner` is wrapped in `React.memo` and isolates its own animation hooks.
  - Each `MediaCarousel` is an independent memoized component that subscribes only to its own data slice.
  - Changes to Hero state (e.g. favorite toggle, next featured item) trigger re-renders ONLY within `HeroBanner`, leaving carousel flat lists untouched.
  - Scroll performance sustained at 60 FPS on 60Hz panels and 120 FPS on 120Hz displays.

---

## Validation Architecture

### Test Infrastructure
- **Framework**: Jest with `ts-jest` & `react-test-renderer`
- **Config**: `jest.config.js`
- **Command**: `npm test -- home` and `npm run typecheck && npm test`
- **Estimated runtime**: ~6 seconds

### Automated Verification Targets
1. `HOME-01`: `HeroBanner` renders backdrop, title/logo fallback, metadata badges (year, rating, runtime), and action buttons. Favorite toggle triggers mutation.
2. `HOME-02`: `MediaCard` renders poster and thumbnail variants, progress bar for watched percentage, and image placeholders. `MediaCarousel` renders horizontal virtualized items.
3. `HOME-03`: Memoization and render isolation verification: Hero banner updates do not cause re-render cascades in carousels. Full test suite and TypeScript check clean.
