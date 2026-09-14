# Quick Task: fix-player-brightness-volume-controls

**Date:** 2026-09-14  
**Slug:** fix-player-brightness-volume-controls  
**Type:** bug-fix  
**Mode:** quick

## Task

Fix the two related player defects reported by the user (FR):

> dans le player le controle de luminosité et du son ne sont pas disponible, et quand j'appuie pour faire apparaître les options du player et que je réappuie à droite ou à gauche ça ne s'enlève pas il faut que j'appuie au milieu

Translation: in the player the brightness and sound controls are not available; and when the player options (overlay) are shown, tapping left or right does not dismiss them — only tapping in the middle does.

## Root Cause

Both symptoms come from the same layering defect, plus one real wiring gap.

1. **Overlay blocks the gesture surface.** In `src/features/player/components/PlayerScreen.tsx` the `PlayerGestures` tap/swipe surface (`gesture-touch-surface`, `zIndex: 15`) sits *below* `CinematicOverlay` (`overlayContainer`, `zIndex: 20`). Inside `CinematicOverlay.tsx` the `topBar` / `centerControls` / `bottomBar` wrappers are full-width `<View>`s with default `pointerEvents="auto"` and no explicit pass-through, so they shadow the full-screen `overlay-backdrop` Pressable across their bands. The backdrop is only reachable in the uncovered gaps, which is why dismissal appears to work only in some (centre) regions and not on the left/right. The same layering means vertical swipes never reach the `PlayerGestures` PanResponder while the overlay is visible, so the brightness/volume swipe controls are unreachable.
2. **Volume is cosmetic only.** In `PlayerGestures.tsx` the right-side vertical swipe writes `volumeRef.current` and shows the HUD but never applies the value to the player. `FinoraPlayerEngine.setVolume()` exists and is exposed as `controls.setVolume`, but nothing calls it from the UI. (Brightness is already applied through `expo-brightness`; it is only unreachable because of root cause 1.)

## Scope

1. `src/features/player/components/CinematicOverlay.tsx` — make the overlay non-blocking so taps anywhere and vertical swipes fall through to the gesture surface below.
2. `src/features/player/components/PlayerGestures.tsx` — emit an `onVolumeChange` callback from the right-side vertical swipe (via a ref so the `PanResponder` closure stays fresh).
3. `src/features/player/components/PlayerScreen.tsx` — pass `onVolumeChange` wired to `controls.setVolume`.

Out of scope: on-screen brightness/volume sliders, native system-volume bridge (`PLAY-VOLUME-NATIVE` remains: the swipe now controls the *in-app player* volume, which is what expo-video exposes).

## Task 1: Make the controls overlay non-blocking

<files>
- src/features/player/components/CinematicOverlay.tsx
</files>

<action>
- Remove the `overlay-backdrop` `Pressable` (lines ~103-108) and the now-unused `overlayBackdrop` style. Dismissal is delegated to the existing `gesture-touch-surface` in `PlayerGestures` (already wired to `handleToggleControls` via `onSingleTap`), which is exactly what the workflow goal requires and removes the dead hit-target that was shadowing taps.
- Add `pointerEvents="box-none"` to the `topBar`, `centerControls`, and `bottomBar` wrapper `<View>`s so empty space inside those bands no longer captures touches; only their real buttons (Pressables) do.
- Add `pointerEvents="none"` to the `titleColumn` `<View>` (purely presentational text) so the title band also falls through.
- Keep `overlayContainer` as `pointerEvents="box-none"` (already set) so the container itself never captures.
- Do NOT change button wiring, scrubber behaviour, or the auto-hide timer.
</action>

<verify>
- `getByTestId("overlay-backdrop")` is no longer referenced anywhere (`grep overlay-backdrop src` returns nothing).
- `CinematicOverlay` still renders top bar, centre controls, bottom bar and all buttons with their existing testIDs.
- Tap on empty overlay space now falls through to `gesture-touch-surface` → `onSingleTap` → `handleToggleControls` (dismiss from any side).
- Vertical swipe on empty overlay space reaches the `PlayerGestures` PanResponder (brightness on the left half, volume on the right half).
- `npx tsc --noEmit` reports 0 errors.
</verify>

<done>
Empty-space taps anywhere on the visible overlay dismiss it, and vertical brightness/volume swipes work while the overlay is visible. Buttons and the timeline scrubber keep working. TypeScript clean.
</done>

## Task 2: Wire the volume swipe to the player engine

<files>
- src/features/player/components/PlayerGestures.tsx
- src/features/player/components/PlayerScreen.tsx
</files>

<action>
- In `PlayerGestures.tsx`, add `onVolumeChange?: (volume: number) => void` to `PlayerGesturesProps`.
- Keep a `onVolumeChangeRef` updated via `useEffect` so the `useRef(PanResponder.create(...))` closure always calls the latest callback (the `PanResponder` is created once and would otherwise capture a stale prop).
- In the right-side branch of `onPanResponderMove`, after `volumeRef.current = newValue` and `showSwipeHUD("volume", newValue)`, call `onVolumeChangeRef.current?.(newValue)`.
- Leave the dead `applyVolume`/`applyBrightness` helpers alone unless they can be removed cleanly without touching the live PanResponder path (they are unused — remove only if safe; the live brightness path is inline in the PanResponder and must stay).
- In `PlayerScreen.tsx`, pass `onVolumeChange={(volume) => controls.setVolume(volume)}` to `<PlayerGestures>`.
</action>

<verify>
- `controls.setVolume` is now invoked from the UI (grep `onVolumeChange` in `src/features/player`).
- Swiping up on the right half increases the player volume; down decreases it; the HUD value matches.
- `npx tsc --noEmit` reports 0 errors.
- `npx jest src/features/player` passes (existing `PlayerGestures` and `PlayerScreen` suites).
</verify>

<done>
The right-side vertical swipe changes the actual expo-video player volume (clamped 0–1) as well as the HUD, and TypeScript + player test suites are green.
</done>

## Verification (whole task)

```bash
npx tsc --noEmit
npx jest src/features/player
```

Manual: open the player, tap to show the overlay, tap the left or right empty area → overlay hides; swipe up/down on the left half → brightness HUD + real screen brightness; on the right half → volume HUD + real player volume.
