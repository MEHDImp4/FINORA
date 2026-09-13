# Quick Task: Player Quality Selector & Dynamic Transcoding Plan

## Problem Description
In FINORA's player:
- The quality selector in `TrackSelectionModal` only displays basic options (Auto, 1080p, 720p, 480p).
- When the user selects a quality with `setSelectedQuality(q)`, `createPlaybackPlan()` is NOT invoked with the quality preference, nor is `selectedQuality` in the `useMemo` dependency array in `PlayerScreen.tsx`.
- `PlaybackPlan` does not inject `maxWidth`, `maxHeight`, `videoBitRate`, or renegotiate transcoding with Jellyfin.
- Consequently, selecting a quality tier is purely cosmetic and the stream is never renegotiated.

## Implementation Steps
1. **Define Playback Quality Presets**:
   - Create `src/features/player/qualityPresets.ts` with:
     - `auto`: Auto (Direct Play if supported, otherwise Transcode)
     - `original`: Original (Force native stream without downscaling/bitrate limits)
     - `4k`: 4K (2160p) - 40 Mbps (`maxWidth: 3840`, `maxHeight: 2160`, `bitrate: 40000000`)
     - `1080p`: 1080p HD - 10 Mbps (`maxWidth: 1920`, `maxHeight: 1080`, `bitrate: 10000000`)
     - `720p`: 720p HD - 4 Mbps (`maxWidth: 1280`, `maxHeight: 720`, `bitrate: 4000000`)
     - `480p`: 480p SD - 1.5 Mbps (`maxWidth: 854`, `maxHeight: 480`, `bitrate: 1500000`)

2. **`src/features/player/playbackPlanner.ts`**:
   - Accept `quality?: string` in `PlaybackPlanOptions`.
   - When quality is NOT `"auto"` or `"original"` (e.g. `4k`, `1080p`, `720p`, `480p`):
     - Lookup the preset.
     - If the media exceeds the requested resolution or bitrate, or a specific quality cap is enforced:
       - Transcode with Jellyfin parameters: `maxWidth=${preset.maxWidth}&maxHeight=${preset.maxHeight}&videoBitRate=${preset.maxBitrate}&maxVideoBitRate=${preset.maxBitrate}`.
       - Mode is `"transcode"`.
       - `reason: \`Transcoding to requested quality: ${preset.label}\``.
     - Include `quality`, `bitrate`, `maxWidth`, `maxHeight` in `PlaybackPlan`.

3. **`src/features/player/components/TrackSelectionModal.tsx`**:
   - Update `QUALITY_OPTIONS` to use the comprehensive list: Auto, Original, 4K, 1080p, 720p, 480p.

4. **`src/features/player/components/PlayerScreen.tsx`**:
   - Pass `quality: selectedQuality` into `createPlaybackPlan`.
   - Include `selectedQuality` in the `useMemo` dependency array.
   - When `selectedQuality` changes, `plan.url` changes, triggering seamless stream replacement in `useFinoraPlayer` while preserving current playback position.

5. **Tests & Verification**:
   - Unit tests in `playbackPlanner.test.ts` verifying that quality selection injects `maxWidth`, `maxHeight`, `videoBitRate`, and updates the plan mode/URL.
   - Unit tests in `TrackSelectionModal.test.tsx` and `PlayerScreen.test.tsx`.
   - Run `npm test` and `npm run typecheck`.
