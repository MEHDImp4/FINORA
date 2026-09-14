---
status: complete
---

# Summary: add-vertical-brightness-and-volume-sliders

**Date:** 2026-09-14  
**Commits:** `cf5a18a`, `294f738`

## What was done

Added on-screen sliders for brightness and volume in the player, as requested (*"ya pas les slider pour le volume et la luminosité"*).

Confirmed with the user before planning: vertical edge sliders — brightness on the left, volume on the right — shown together with the controls overlay, updating live with a percentage label.

## Files changed

| File | Change |
|------|--------|
| `src/features/player/components/VerticalSlider.tsx` | New PanResponder-driven vertical slider (tap-to-set + drag, live `%` label, accessible adjustable role) |
| `src/features/player/components/CinematicOverlay.tsx` | Added `brightness`/`onBrightnessChange`/`volume`/`onVolumeChange` props and the two absolute side rails; change handlers reset the auto-hide timer |
| `src/features/player/components/PlayerGestures.tsx` | Now a controlled consumer: takes `brightness`/`volume` props plus change callbacks; removed the direct `expo-brightness` usage and the dead `applyBrightness`/`applyVolume` helpers |
| `src/features/player/components/PlayerScreen.tsx` | Owns `brightness`/`volume` state; applies brightness via `expo-brightness` and volume via `controls.setVolume`; passes both down to the overlay and gestures |

## Behaviour after change

- The overlay shows a brightness rail (left edge) and a volume rail (right edge), vertically centred.
- Tapping a rail sets the value; dragging adjusts it with live track fill, thumb and `%` label.
- Brightness changes the real screen brightness; volume changes the real player volume.
- Sliders and swipe gestures stay in sync through shared `PlayerScreen` state.
- Interacting with a slider keeps the auto-hiding overlay open.

## Verification

- `npx tsc --noEmit` → 0 errors.
- `npx jest src/features/player` → 40 failed / 65 passed, identical to the pre-change baseline. The failures are the pre-existing React 19 / `react-test-renderer` (`act is not a function`) incompatibility, unrelated to this change.

## Notes / not covered

- No dedicated unit test for `VerticalSlider`: the mocked `react-test-renderer` in this repo does not export `act`, so component tests currently cannot pass (same reason the existing suites fail).
- Native system volume (`PLAY-VOLUME-NATIVE`) remains out of scope — the slider controls the in-app expo-video player volume.
