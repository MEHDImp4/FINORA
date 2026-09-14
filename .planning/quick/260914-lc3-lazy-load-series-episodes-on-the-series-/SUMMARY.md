---
status: complete
---

# Summary: lazy-load-series-episodes

**Date:** 2026-09-14  
**Commit:** `7fe78a9`

## What was done

Series pages with a very long season (e.g. Black Clover, ~170 episodes) now mount ~10 episode cards instead of the whole season, revealing the rest in batches of 10 as the user scrolls.

## Root cause

`SeriesDetailsView` rendered the season with `episodes.map(...)` inside a plain `ScrollView`. A `ScrollView` does not virtualise, so every `EpisodeCard` mounted on first paint — and each card mounts an `expo-image` thumbnail. For 170 episodes that is 170 cards plus 170 image requests before the page settles. The Jellyfin fetch itself is a single small request and was not the bottleneck.

## Files changed

| File | Change |
|------|--------|
| `src/features/details/components/SeriesDetailsView.tsx` | Renders `visibleEpisodes` (first 10, +10 per scroll near the bottom) instead of the full list; resets the window when the season changes |

## Behaviour after change

- Opening a long season mounts 10 cards immediately; the page paints far sooner.
- Scrolling near the bottom (within 600px) reveals the next 10, one page per render (guarded by a ref so a burst of scroll events cannot skip pages).
- Switching seasons resets the window to 10.
- `nextEpisodeToPlay`, the empty state and the download flow still use the full episode array, so "Play S1:E1" and downloads are unaffected.

## Verification

- `npx tsc --noEmit` → 0 errors.
- `npx jest src/features/details` → 24 failed / 24, **identical to the pre-change baseline** (verified via `git stash`). The whole details suite is blocked by the pre-existing React 19 `react-test-renderer` `act is not a function` breakage, so no component regression test could be added.

## Notes / not covered

- The Jellyfin episode request is still unpaginated by design: the response is small, the cost was rendering.
- Converting the screen to a virtualised `FlatList` was not done — the page has a large non-virtualised header/cast/similar section, so batching inside the existing `ScrollView` was the lower-risk change.
