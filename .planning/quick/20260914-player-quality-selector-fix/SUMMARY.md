---
status: complete
date: 2026-09-14
task: player-quality-selector-fix
---

# Quick Task Summary: Player Quality Selector & Dynamic Transcoding Plan

## Overview
Resolved the issue where selecting a stream quality in FINORA's player only updated local component state without being passed to `createPlaybackPlan()`, leaving the stream unchanged. Quality presets (Auto, Original, 4K, 1080p, 720p, 480p) are now fully connected end-to-end, injecting `maxWidth`, `maxHeight`, `videoBitRate`, and `maxVideoBitRate` into Jellyfin's streaming engine, triggering real-time stream renegotiation while preserving seamless playback position.

## Changes
1. **`src/features/player/qualityPresets.ts`**:
   - Created centralized quality preset configuration with:
     - `auto`: Auto (Recommandé - Direct Play / optimal stream)
     - `original`: Original (Direct Play / untouched source)
     - `4k`: 4K (2160p) - 40 Mbps (`maxWidth: 3840`, `maxHeight: 2160`, `maxBitrate: 40000000`)
     - `1080p`: 1080p HD - 10 Mbps (`maxWidth: 1920`, `maxHeight: 1080`, `maxBitrate: 10000000`)
     - `720p`: 720p HD - 4 Mbps (`maxWidth: 1280`, `maxHeight: 720`, `maxBitrate: 4000000`)
     - `480p`: 480p SD - 1.5 Mbps (`maxWidth: 854`, `maxHeight: 480`, `maxBitrate: 1500000`)

2. **`src/types/media.ts`**:
   - Added `bitRate?: number;` to `MediaStreamInfo` and `MediaItem`.

3. **`src/features/player/playbackPlanner.ts`**:
   - Added `quality?: string` to `PlaybackPlanOptions` and `PlaybackPlan` (with `bitrate`, `maxWidth`, `maxHeight`).
   - Implemented dynamic transcoding plan generation when constrained quality (4k, 1080p, 720p, 480p) is selected:
     - Injects `maxWidth`, `maxHeight`, `videoBitRate`, `maxVideoBitRate` into Jellyfin HLS master playlist URL.
     - Selects `mode: "transcode"` with appropriate downscaled video codec (`h264` or copy when already smaller than target).

4. **`src/features/player/components/TrackSelectionModal.tsx`**:
   - Replaced old hardcoded options with complete presets from `qualityPresets.ts`.

5. **`src/features/player/components/PlayerScreen.tsx`**:
   - Passed `quality: selectedQuality` to `createPlaybackPlan`.
   - Added `selectedQuality` to `useMemo` dependency array.
   - When user taps a quality option, `plan.url` updates, and `useFinoraPlayer` automatically replaces the active stream source while preserving exact playback position and playing state.

6. **Tests & Verification**:
   - Added 5 new unit tests in `src/features/player/__tests__/playbackPlanner.test.ts` verifying parameter injection for 720p, 480p, 1080p, original, and localPath.
   - Updated `src/features/player/__tests__/TrackSelectionModal.test.tsx` testing all quality tiers.
   - All 67 test suites (367 tests) passed at 100%.
   - Strict TypeScript check passed with 0 errors (`npm run typecheck`).
