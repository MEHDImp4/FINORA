# Quick Task: add-vertical-brightness-and-volume-sliders

**Date:** 2026-09-14  
**Slug:** add-vertical-brightness-and-volume-sliders  
**Type:** feature  
**Mode:** quick

## Task

Add on-screen sliders for brightness and volume in the player.

User report (FR):

> ya pas les slider pour le volume et la luminosité

Decisions confirmed with the user before planning:

- **Layout:** vertical edge sliders — brightness on the left edge, volume on the right edge, shown together with the existing controls overlay.
- **Feedback:** live value update with a percentage label while dragging.

## Scope

1. New `VerticalSlider` component (PanResponder-driven, no new dependencies).
2. Render a brightness rail (left) and a volume rail (right) inside `CinematicOverlay`.
3. Lift brightness/volume state into `PlayerScreen` so the sliders and the existing swipe gestures share one source of truth:
   - brightness applied through `expo-brightness`
   - volume applied through `controls.setVolume` (expo-video)
4. `PlayerGestures` becomes a controlled consumer: it reports swipe changes through `onBrightnessChange` / `onVolumeChange` instead of applying brightness itself, so sliders and swipes never disagree.

## Task 1: Create the VerticalSlider component

<files>
- src/features/player/components/VerticalSlider.tsx (new)
</files>

<action>
Build a self-contained vertical slider with `PanResponder` (matching the existing `TimelineScrubber` pattern — the project does not use react-native-gesture-handler):

- Props: `value` (0–1), `onValueChange`, `iconName`, `label`, `accessibilityLabel`, `testID`.
- Grant maps the touch's `locationY` against the measured track height to a value (tap-to-set); move applies `-gestureState.dy / trackHeight` from the drag start value (robust when the finger leaves the track).
- Track measured via `onLayout`; fill height and thumb position driven by the value; percentage label updates live.
- Dark translucent panel consistent with the existing swipe HUD (`rgba(0,0,0,0.55)`, rounded), icon at the top.
- `onValueChange` held in a ref so the once-created PanResponder never reads a stale callback.
</action>

<verify>
- `npx tsc --noEmit` → 0 errors.
- Component renders icon, track, fill, thumb and `%` value with the given `testID` suffixes.
</verify>

<done>
`VerticalSlider` exists, is typed, uses no new dependencies, and reports values in the 0–1 range.
</done>

## Task 2: Integrate the sliders and centralize brightness/volume state

<files>
- src/features/player/components/CinematicOverlay.tsx
- src/features/player/components/PlayerGestures.tsx
- src/features/player/components/PlayerScreen.tsx
</files>

<action>
- `CinematicOverlay`: add required `brightness`, `onBrightnessChange`, `volume`, `onVolumeChange` props; render an absolutely positioned `sideRail` on each edge (vertically centred) containing a `VerticalSlider` ("Luminosité" left / "Son" right, `testID` `brightness-slider` / `volume-slider`). Wrap the change handlers to `resetTimer()` so the auto-hiding overlay does not vanish mid-drag.
- `PlayerScreen`: own `brightness` / `volume` state. Seed brightness from `BrightnessModule.getBrightnessAsync()` and keep volume in sync with `snapshot.volume`. Add `handleBrightnessChange` (sets state + `setBrightnessAsync`) and `handleVolumeChange` (sets state + `controls.setVolume`). Pass both down to `PlayerGestures` and `CinematicOverlay`.
- `PlayerGestures`: accept `brightness` / `volume` props plus `onBrightnessChange` / `onVolumeChange`. Replace the internal-only refs with props-seeded refs, drop the direct `expo-brightness` usage and the dead `applyBrightness` / `applyVolume` helpers, and report swipe changes through the callbacks.
</action>

<verify>
- `npx tsc --noEmit` → 0 errors.
- `npx jest src/features/player` matches the pre-change baseline (40 failed / 65 passed — pre-existing React 19 / react-test-renderer `act` failures).
- `grep onBrightnessChange src/features/player` shows the slider and the swipe gesture both routed through `PlayerScreen`.
</verify>

<done>
The overlay shows vertical brightness (left) and volume (right) sliders with live percentage labels; dragging either one updates the shared state, the real screen brightness (`expo-brightness`) and the real player volume (`controls.setVolume`); swipe gestures stay in sync and TypeScript is clean.
</done>

## Verification (whole task)

```bash
npx tsc --noEmit
npx jest src/features/player
```

Manual: open the player → the overlay shows a brightness rail on the left and a volume rail on the right; drag either one; the icon, fill and `%` label update live; brightness dims the screen; volume changes the audio.
