---
status: resolved
trigger: "Le slider de champ ne marche pas vraiment. Genre, je, j'essaie de changer le son, ben le son commence à bugger, bugger, bugger, bugger, bugger à mort. Genre il fait comme des aller-viens, viens, allez, viens, allez, viens, allez, viens, allez, viens, allez, viens, allez. Et si je le diminue, genre je le mute, ben rien ne se passe. Il y a encore du son à bugger, tu comprends. Donc c'est tout buggé, essaie de trouver une solution pour ça, merci."
created: 2026-09-14
updated: 2026-09-14
---

# Debug Session: volume-slider-android-bug

## Symptoms

- **Expected:** dragging the volume control down lowers the audio; reaching 0 silences it.
- **Actual / error:** the audio jumps to full volume around 0 and audibly alternates low/full while dragging ("bugger à mort", "aller-retour"); muting appears to do nothing — sound remains.
- **Timeline:** since the volume control started applying to the real player (release of the on-screen rails).
- **Reproduction:** Android device, video playing, drag the volume rail (or the right-side swipe) toward zero.
- **Platform:** Android. On iOS `volume = 0` behaves correctly, which is why this looks intermittent/platform-specific.

## Current Focus

hypothesis: `FinoraPlayerEngine.setVolume` assigned `player.volume = clamped` directly, including 0. On Android, `volume = 0` is treated as **full volume** (known Expo bug), so every sub-zero drag event played at 100% — the volume slammed between the dragged level and full, and muting could never take effect.
test: Dragging to 0 must not write `volume = 0`; it must set `muted` instead, and raising the volume must unmute and apply the level.
expecting: The audio follows the drag monotonically and reaching 0 silences the player.
next_action: done — fix applied and covered by a regression test.

## Evidence

- 2026-09-14: `src/features/player/FinoraPlayerEngine.ts:292-299` (original) — `setVolume` did `this.player.volume = clamped`, writing `0` when the drag reached the bottom. **Fixed.**
- 2026-09-14: external reference — [expo/expo#39209](https://github.com/expo/expo/issues/39209): *"Volume 0 on Android seems to be equal to volume 1"* — setting volume 0 does not mute on Android and rapid volume changes behave erratically.
- 2026-09-14: `node_modules/expo-video/build/VideoPlayer.types.d.ts:73-78` — `volume` is a float 0–1 and `muted` is an independent boolean; the docs state *"Muting the player doesn't affect the volume … setting the volume doesn't unmute the player."* So silence must be requested through `muted` explicitly.
- 2026-09-14: `src/features/player/FinoraPlayerEngine.ts:68-70` — the engine reacts to `volumeChange`; because `setVolume` never updated its own snapshot, the reported state depended entirely on the native echo (now updated optimistically).
- 2026-09-14: `src/features/player/components/PlayerScreen.tsx:414-418` and `src/features/player/components/PlayerGestures.tsx:140-155` — both the rail and the right-side swipe clamp to `[0, 1]`, so both hit exactly `0` and triggered the Android bug.

## Eliminated

- hypothesis: a React feedback loop between the slider and `snapshot.volume`. Eliminated for this report — the mirror that caused the earlier oscillation was already removed (`a182742`); the only remaining writer is `handleVolumeChange`, so the on-screen value is monotonic.
- hypothesis: the engine is detached / not applying volume. Eliminated — `attachPlayer` runs once from the `useVideoPlayer` effect, `isDestroyed` is never set while the screen is mounted, and the audio *does* change (audibly), which proves `player.volume` is reaching the native player.
- hypothesis: two sliders share a handler. Eliminated — grep shows one rail per side with distinct handlers.

## Resolution

root_cause: Android treats `player.volume = 0` as **full volume**. `FinoraPlayerEngine.setVolume` wrote the clamped value straight to `player.volume`, so as soon as a drag reached 0 (every sub-zero move clamps to 0) the audio jumped to 100% and back — the "monte/descend" churn — and muting could never silence the player. The native player's own `muted` flag is the reliable way to silence on Android, and expo-video keeps `volume` and `muted` independent.

fix: `src/features/player/FinoraPlayerEngine.ts` — `setVolume` now:
- updates the snapshot optimistically (`volume` + `isMuted`) instead of waiting for the native echo;
- never assigns `volume = 0`; it sets `muted = true` when the requested level is 0 and leaves the last level untouched;
- when the level is above 0, clears `muted` and assigns the volume;
- wraps the native writes in try/catch so a released player cannot throw back into the UI.

verification: `npx tsc --noEmit` → 0 errors. `npx jest src/features/player/__tests__/FinoraPlayerEngine.test.ts` → 7/7 pass, including the new regression test *"mutes through the muted flag instead of assigning volume 0"*, which asserts `volume` is not written to 0, `muted` becomes true, and raising the volume unmutes. Full player suite: 66 passed / 40 failed, unchanged baselines apart from the new test (the 40 failures are the pre-existing React 19 `react-test-renderer` `act` breakage).

files_changed: `src/features/player/FinoraPlayerEngine.ts`, `src/features/player/__tests__/FinoraPlayerEngine.test.ts`
