# Quick Task: lazy-load-series-episodes

**Date:** 2026-09-14  
**Slug:** lazy-load-series-episodes  
**Type:** performance  
**Mode:** quick

## Task

Loading a series page with a very long season (e.g. Black Clover, ~170 episodes) is slow on first open.

User report (FR, summarized): opening a show page takes time because all episodes load at once; episodes should load lazily, ~10 at a time, as the user scrolls.

## Root Cause

`src/features/details/components/SeriesDetailsView.tsx` renders the season with `episodes.map(...)` inside a plain `ScrollView`. A `ScrollView` has no virtualization, so every `EpisodeCard` mounts immediately — and each card mounts an `expo-image` thumbnail. For a 170-episode season that is 170 cards plus 170 image requests on first paint, which is what makes the page slow.

The data fetch itself is a single `/Shows/{id}/Episodes` request and is not the bottleneck.

## Scope

Render episodes incrementally inside the existing `ScrollView`:

1. Keep the full episode list in memory (the Play button, "next unplayed" logic and the download modal rely on it) but only mount the first 10 cards.
2. On scroll, when the user gets near the bottom, reveal the next 10.
3. Reset the window to 10 when the selected season changes.

Out of scope: paginating the Jellyfin request (the response is small; rendering is the cost) and converting the screen to a `FlatList` (the page has a large non-virtualised header/cast/similar section).

## Task 1: Incrementally render the episode list

<files>
- src/features/details/components/SeriesDetailsView.tsx
</files>

<action>
- Add `EPISODES_PAGE_SIZE = 10` and `LOAD_MORE_THRESHOLD_PX = 600` module constants.
- Add `visibleEpisodeCount` state seeded at `EPISODES_PAGE_SIZE`, plus an `isLoadingMoreRef` guard.
- Reset the window (and the guard) whenever `selectedSeasonId` changes.
- Derive `visibleEpisodes = episodes.slice(0, visibleEpisodeCount)` with `useMemo`.
- Add an `onScroll` handler (`scrollEventThrottle={16}`) that reveals another page when `distanceFromBottom <= LOAD_MORE_THRESHOLD_PX` and more episodes remain; guard with the ref so a burst of scroll events only advances one page per render.
- Render `visibleEpisodes` instead of `episodes`; leave `nextEpisodeToPlay`, the empty state and the download flow on the full list.
</action>

<verify>
- `npx tsc --noEmit` → 0 errors.
- `npx jest src/features/details` matches the pre-change baseline.
- With > 10 episodes, only the first 10 `episode-card-*` testIDs are rendered initially; scrolling to the bottom adds 10 more.
- Switching season resets the rendered window to 10.
</verify>

<done>
Opening a 170-episode season mounts ~10 cards instead of 170, and further episodes appear in batches of 10 as the user scrolls. TypeScript clean, no test regressions.
</done>

## Verification (whole task)

```bash
npx tsc --noEmit
npx jest src/features/details
```

Manual: open a series with a long season → the page appears quickly showing ~10 episodes; scrolling down reveals the rest in batches.
