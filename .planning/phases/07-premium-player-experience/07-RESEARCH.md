# Phase 07: Premium Player Experience - Research

**Phase:** 07-premium-player-experience  
**Date:** 2026-09-11  
**Status:** In Progress  

---

## Technical Approach & Architecture

Phase 7 elevates the foundation built in Phase 6 to a premier cinematic playback experience comparable in polish and responsiveness to Netflix, Prime Video, and Crunchyroll.

### 1. Cinematic Overlay Controls & Auto-Fade (`PPL-01`)
- **Auto-Fade Inactivity Timer**:
  - Controls overlay (header, center play/pause/skip buttons, bottom scrubber & action bar) automatically fades out smoothly after 4 seconds of user inactivity while playing.
  - Tapping the video surface toggles overlay visibility instantly (<50ms).
  - Pausing video automatically keeps controls visible.
- **Scrub Timeline**:
  - Shows current elapsed time (e.g. `24:15`) and remaining or total duration (`1:48:30`).
  - Interactive slider/timeline bar with buffered progress indicator, played progress indicator (`#E50914`), and draggable seek head.
  - Scrubbing state temporarily pauses time updates to prevent jitter until release.

### 2. Audio & Subtitle Track Selection Bottom Sheets (`PPL-02`)
- **Metadata Extension**:
  - `MediaStreamInfo` in `src/types/media.ts` extended to include `index: number`, `language?: string`, `isExternal?: boolean`.
  - Filter streams into `audioStreams` (`type === "Audio"`) and `subtitleStreams` (`type === "Subtitle"`).
- **Track Selection Bottom Sheet (`TrackSelectionModal.tsx`)**:
  - Sleek modal bottom sheet with blurred glass background (`#14141A` with border `#2A2A38`).
  - Segmented control or tabs: **Audio** / **Subtitles** / **Quality**.
  - Audio: Lists languages, channel configuration (e.g. `English (5.1)`, `French (Stereo)`), and codec (`AAC`, `AC3`).
  - Subtitles: Lists "Off", followed by available subtitle tracks (e.g. `English [CC]`, `Spanish`, `French`).
  - Quality: Auto (Direct Play), 1080p (10 Mbps), 720p (4 Mbps), 480p (1.5 Mbps).
  - Selected options immediately update `FinoraPlayerEngine` and playback planner options.

### 3. Touch Gestures (`PPL-03`)
- **Double-Tap Seek**:
  - Double tapping left half of screen seeks backward by 10s (`seekBy(-10)`).
  - Double tapping right half seeks forward by 10s (`seekBy(10)`).
  - Visual ripple / chevron animation indicator (`<< 10s` / `10s >>`).
- **Vertical Swipe Gestures**:
  - Left edge vertical swipe adjusts screen brightness.
  - Right edge vertical swipe adjusts volume (`setVolume(vol)`).
  - HUD overlay pill displaying current brightness/volume level.
- **Long-Press 2x Speed**:
  - Holding down on screen temporarily sets `setRate(2.0)` with a subtle "2x »" badge.
  - Releasing restores previous playback speed (1.0x).
- **Configurable**: Gestures can be toggled on/off in player settings or preferences.

### 4. Trickplay Preview Thumbnails (`PPL-04`)
- **Jellyfin Trickplay Metadata**:
  - Jellyfin servers (v10.9+) provide trickplay BIF / tile images via `/Items/${itemId}/Trickplay/{width}/manifest.json` or storyboard tiles.
  - Thumbnail URL builder helper: `getTrickplayTileUrl(serverUrl, itemId, positionSeconds)`.
  - While dragging timeline scrub head, a floating preview card displays the scene thumbnail and timestamp above the scrubber thumb.

### 5. Skip Intro & Skip Credits (`PPL-05`)
- **Chapter & Marker Support**:
  - Extract chapters and intro markers (`IntroStart`, `IntroEnd`, `CreditsStart`) from Jellyfin item metadata.
  - Dynamic overlay button appears when `currentTimeSeconds >= introStart && currentTimeSeconds < introEnd`:
    - "Skip Intro" pill button with forward icon.
    - Tapping seeks directly to `introEnd`.
  - Dynamic "Next Episode" / "Skip Credits" pill appears during end credits.

### 6. Stats for Nerds Technical Diagnostic (`PPL-06`)
- **Diagnostic Sheet / Overlay**:
  - Displays:
    - Item ID & Title
    - Playback mode (`Direct Play`, `Direct Stream`, `Transcode`)
    - Container (`mp4`, `mkv`, etc.)
    - Video Codec & Resolution (`hevc 3840x2160`, `h264 1080p`)
    - Audio Codec & Channels (`eac3 5.1`, `aac Stereo`)
    - Stream Bitrate
    - Current Position & Buffer duration
    - Dropped frames (if provided by player)
  - **Security**: Strict token sanitization (`[REDACTED]`) on any stream URLs or query params shown in diagnostics.

---

## Validation Strategy

- Automated unit tests covering:
  - `TrackSelectionModal.test.tsx`: track listing, active selection, dismiss actions.
  - `TimelineScrubber.test.tsx`: progress bar rendering, drag seek calculations, trickplay positioning.
  - `PlayerGestures.test.tsx`: double tap detection, long press 2x rate acceleration.
  - `SkipMarkerButton.test.tsx`: visibility based on timestamp intervals and seek execution.
  - `StatsForNerds.test.tsx`: metric display and sensitive token redaction.
- Full suite verification: `npx tsc --noEmit` and `npm test`.
