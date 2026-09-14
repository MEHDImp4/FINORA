---
status: resolved
trigger: "Il y a un bug de luminosité, genre quand je quitte le player, la luminosité reste à l'état où je l'ai mis dans le player, alors que non, il faut qu'il reprenne la luminosité normale de mon telephone"
created: 2026-09-14
updated: 2026-09-14
---

# Debug Session: brightness-not-restored

## Symptoms

- **Expected:** leaving the player returns the screen to the phone's normal brightness.
- **Actual:** the screen keeps whatever brightness was set on the player's brightness rail.
- **Platform:** reproduces on Android (activity-level override outlives the player screen); iOS is affected too because the value persists until device lock.
- **Reproduction:** open a video, drag the brightness rail down, go back to the app — the screen stays dim.

## Current Focus

hypothesis: `PlayerScreen` applied `setBrightnessAsync` on every brightness change but never restored the previous value when the screen unmounted, so the override stayed in place after leaving the player.
test: capture the brightness on entry and hand it back on unmount — `restoreSystemBrightnessAsync()` on Android, `setBrightnessAsync(original)` on iOS.
expecting: leaving the player returns the screen to the brightness it had when the player opened.
next_action: done — fix applied and verified.

## Evidence

- 2026-09-14: `src/features/player/components/PlayerScreen.tsx:406-412` — `handleBrightnessChange` calls `BrightnessModule.setBrightnessAsync(clamped)` on every drag; nothing ever reverted it.
- 2026-09-14: `src/features/player/components/PlayerScreen.tsx:227-240` (before the fix) — the mount effect only *read* the brightness to seed the slider; its cleanup merely set `active = false` and did not restore anything.
- 2026-09-14: `node_modules/expo-brightness/build/Brightness.d.ts:38-47` — *"On Android, this setting only applies to the current activity; it will override the system brightness value whenever your app is in the foreground."* The player runs inside the app's single activity, so the override survives the player screen closing.
- 2026-09-14: `node_modules/expo-brightness/build/Brightness.d.ts:65-71` — `restoreSystemBrightnessAsync()` *"Resets the brightness setting of the current activity to use the system-wide brightness value rather than overriding it"* (Android). On iOS the value persists until lock, so the value captured on entry must be re-applied.
- 2026-09-14: `__mocks__/expo-brightness.js:3-7` — the test mock already exposes `getBrightnessAsync`, `setBrightnessAsync` and `restoreSystemBrightnessAsync`.

## Eliminated

- hypothesis: the player engine or the video surface resets/applies brightness. Eliminated — brightness is handled entirely through `expo-brightness` in `PlayerScreen`; the engine has no brightness code.
- hypothesis: the `VerticalSlider` keeps applying a stale value after unmount. Eliminated — the slider only fires `onValueChange` during a gesture; the lingering value comes from the OS/activity state, not from the component.

## Resolution

root_cause: `PlayerScreen` changed the screen brightness through `expo-brightness` but never restored it. On Android the brightness set through `setBrightnessAsync` is an activity-level override that outlives the player (same activity), and on iOS the value persists until the device is locked, so the screen stayed at the level chosen in the player.

fix: `src/features/player/components/PlayerScreen.tsx` — the brightness effect now captures the current brightness when the player opens (`originalBrightness`) and restores it in the effect cleanup on unmount:
- Android → `restoreSystemBrightnessAsync()` so the activity stops overriding and the OS (including auto-brightness) takes over again;
- otherwise (iOS) → `setBrightnessAsync(originalBrightness)`.

verification: `npx tsc --noEmit` → 0 errors. `npx jest src/features/player` → 66 passed / 40 failed, unchanged from the baseline (the 40 failures are the pre-existing React 19 `react-test-renderer` `act` breakage). No component-level regression test was added: that harness cannot run component tests until the mock is fixed.

files_changed: `src/features/player/components/PlayerScreen.tsx`
