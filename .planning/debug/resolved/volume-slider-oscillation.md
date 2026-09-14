---
status: resolved
trigger: "Le slider du son il bug, ok genre j'ai à peine touché là en même temps il monte, il descend, il monte, il descend, il se mute tout seul, il monte, il descend, il monte, il descend, je comprends pas donc voilà trouve où est le bug."
created: 2026-09-14
updated: 2026-09-14
---

# Debug Session: volume-slider-oscillation

## Symptoms

- **Expected:** dragging the volume rail in the player overlay changes the volume smoothly and stays where released.
- **Actual:** on a light touch the volume oscillates up/down repeatedly and can drop to 0 (mute) on its own.
- **Errors:** none reported.
- **Timeline:** introduced with the on-screen brightness/volume sliders (commit `294f738`).
- **Reproduction:** open a video, show the controls overlay, touch the right-edge volume rail.
- **Asymmetry (key clue):** the *brightness* rail uses the identical `VerticalSlider` component and the same wrapper pattern, and does **not** misbehave. Only the volume rail does.

## Current Focus

hypothesis: PlayerScreen kept `volume` in local state AND continuously mirrored `snapshot.volume` back into it, while the slider wrote to the engine. The engine echoes the value through its `volumeChange` event, so the UI had two competing writers for the same value; whenever the echoed value differed from (or lagged) the value the drag just wrote, the controller snapped the slider back — once per move event. An echo of 0 produced the self-mute.
test: Remove the engine→state volume mirror and keep a single writer; confirm no other code path can write `volume`.
expecting: The volume rail becomes a single-writer control (like the brightness rail) and can no longer oscillate or self-mute.
next_action: done — fix applied and verified.

## Evidence

- 2026-09-14: `src/features/player/components/PlayerScreen.tsx:79` — `const [volume, setVolume] = useState(1.0)` (local state).
- 2026-09-14: `src/features/player/components/PlayerScreen.tsx:419-423` — `handleVolumeChange` wrote **both** `setVolume(clamped)` and `controls.setVolume(clamped)`.
- 2026-09-14: `src/features/player/components/PlayerScreen.tsx:242-245` — `useEffect(() => setVolume(snapshot.volume), [snapshot.volume])` mirrored the engine back into the same state. **Removed.**
- 2026-09-14: `src/features/player/FinoraPlayerEngine.ts:68-70,222-224,292-299` — setting `player.volume` emits `volumeChange`; the engine listener calls `updateSnapshot({volume})`, which notifies React via `useFinoraPlayer` → `setSnapshot`.
- 2026-09-14: `src/features/player/components/PlayerScreen.tsx:411-417` — the brightness handler applies via `expo-brightness` and never reads a value back; there is no brightness mirror effect. This is the only structural difference between the two rails, and matches the report that only the volume rail misbehaves.
- 2026-09-14: `src/features/player/components/VerticalSlider.tsx:62-65` — `onPanResponderGrant` set the value from the absolute touch position (`1 - locationY / height`), so a light touch jumped the value anywhere, including 0.
- 2026-09-14: `__mocks__/expo-video.js:51-54` — the mock echoes the exact value, so the feedback loop is a fixed point in tests; the defect only manifests when the engine's echo differs/lags (real device), which is why no existing suite caught it.

## Eliminated

- hypothesis: the `VerticalSlider` drag math is wrong (non-monotonic). Eliminated — `onPanResponderGrant` seeds `dragStartValueRef` and `onPanResponderMove` applies cumulative `gestureState.dy`, which is monotonic for a single gesture.
- hypothesis: two sliders share one callback / duplicated wiring. Eliminated — grep shows one `VerticalSlider` per side and distinct `handleBrightnessChange`/`handleVolumeChange` callbacks.
- hypothesis: the overlay's swipe gesture fires simultaneously with the slider. Eliminated — `PlayerGestures` is a sibling rendered below the overlay (`zIndex 15` vs `20`), so responder negotiation cannot reach it while the slider owns the touch.

## Resolution

root_cause: Two writers drove one value. The volume rail's `value` came from `PlayerScreen`'s `volume` state, which was written both by the user (`handleVolumeChange`) and, on every engine update, by a mirror effect `setVolume(snapshot.volume)`. Because `controls.setVolume` round-trips through the native player and back as a `volumeChange` event, the returned value could differ from / lag the value the drag had just written, so the mirror clobbered the drag on each move — the up/down oscillation. When the echoed value was 0, the slider muted itself. The brightness rail has no mirror, which is exactly why only the volume rail was affected.

fix:
- `PlayerScreen.tsx`: removed the engine→state mirror (`useEffect(() => setVolume(snapshot.volume), [snapshot.volume])`). `volume` now has a single writer, `handleVolumeChange` (state + `controls.setVolume`), mirroring the brightness rail's structure.
- `VerticalSlider.tsx`: switched `onPanResponderGrant` from absolute tap-to-set to grab semantics — the drag adjusts relative to the current value instead of jumping to the touch point, so a light touch can no longer slam the volume to 0. Also removed the dead `trackHeight` state (never read).

verification: `npx tsc --noEmit` → 0 errors. `npx jest src/features/player` → 40 failed / 65 passed, unchanged from the pre-change baseline (the failures are the pre-existing React 19 `react-test-renderer` `act` breakage). A true automated repro is not possible with the current mock because it echoes the exact volume, making the loop a fixed point — the defect needs a native echo that differs/lags.

files_changed: `src/features/player/components/PlayerScreen.tsx`, `src/features/player/components/VerticalSlider.tsx`
