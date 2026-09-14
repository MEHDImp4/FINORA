---
status: complete
---

# Summary: fix-player-brightness-volume-controls

**Date:** 2026-09-14  
**Commits:** `6d06d27`, `17ab9fa`

## What was done

Fixed the two player defects reported by the user:

1. The brightness/volume swipe controls were unreachable and tapping left or right did not dismiss the controls overlay (only some areas worked).
2. The right-side volume swipe was cosmetic — it never changed the actual player volume.

## Root cause

- `CinematicOverlay` (zIndex 20) renders above the `PlayerGestures` tap/swipe surface (zIndex 15). Its full-width `topBar` / `centerControls` / `bottomBar` wrappers had the default `pointerEvents="auto"`, which shadowed the full-screen backdrop across their bands. As a result only the uncovered gaps (perceived by the user as "the middle") dismissed the overlay, and vertical swipes never reached the brightness/volume PanResponder.
- The volume swipe only wrote a local ref and showed the HUD; `FinoraPlayerEngine.setVolume` (exposed as `controls.setVolume`) was never called from the UI.

## Files changed

| File | Change |
|------|--------|
| `src/features/player/components/CinematicOverlay.tsx` | Removed the redundant full-screen `overlay-backdrop` Pressable and its style; set `topBar`/`centerControls`/`bottomBar` to `pointerEvents="box-none"`, `titleColumn` to `none`, `headerActions` to `box-none` so empty space falls through to the gesture surface |
| `src/features/player/components/PlayerGestures.tsx` | Added an `onVolumeChange` prop, held in a ref so the once-created `PanResponder` never captures a stale callback; invoked it from the right-side swipe |
| `src/features/player/components/PlayerScreen.tsx` | Wired `onVolumeChange` to `controls.setVolume` |

## Behaviour after fix

- Tap anywhere on the empty overlay area (left, right or centre) → overlay hides.
- Vertical swipe on the left half → brightness HUD + real `expo-brightness` change.
- Vertical swipe on the right half → volume HUD + real expo-video player volume change.
- Buttons, timeline scrubber, double-tap seek and 2x long-press keep working.

## Verification

- `npx tsc --noEmit` → 0 errors.
- `npx jest src/features/player` → 65 passed / 40 failed, identical to the pre-change baseline (verified via `git stash`). The 40 failures are a pre-existing React 19 / `react-test-renderer` incompatibility (`act is not a function`), unrelated to this change.

## Notes / not covered

- Native system volume (the `PLAY-VOLUME-NATIVE` limitation) remains out of scope — the swipe now controls the in-app player volume, which is what `expo-video` exposes.
- Dead helpers `applyBrightness` / `applyVolume` in `PlayerGestures.tsx` were left untouched to keep the diff focused.
