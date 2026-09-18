# Quick Plan: PiP, Trickplay Thumbnails & Local/Remote Detection

**Goal:** Implement reliable Picture-in-Picture (PiP), real Jellyfin Trickplay thumbnail scrubbing, and automatic Local vs Remote Jellyfin server detection.

## Task 1: Reliable Picture-in-Picture (PiP)
- [x] Connect `videoViewRef` to `VideoView` in `PlayerScreen.tsx`.
- [x] Enable `startsPictureInPictureAutomatically` on `VideoView`.
- [x] Implement `handleTogglePiP()` invoking `videoViewRef.current?.startPictureInPicture()`.
- [x] Handle PiP lifecycle callbacks (`onPictureInPictureStart`, `onPictureInPictureStop`) to adapt UI overlays.
- [x] Add explicit PiP button in `CinematicOverlay.tsx` (top control bar).
- [x] Add translations in `en.ts` and `fr.ts`.

## Task 2: Trickplay Thumbnails During Scrubbing
- [x] Implement proper Jellyfin Trickplay resolution in `trickplayHelper.ts`:
  - Jellyfin 10.9+ trickplay URL pattern: `/Videos/{itemId}/Trickplay/{width}/{tileIndex}.jpg`
  - Fallback to chapter thumbnail: `/Items/{itemId}/Images/Chapter/{index}`
  - Fallback to primary preview image
- [x] Enhance `TrickplayPreview.tsx` to handle responsive width, loading state, and smooth fade-in above scrubber.
- [x] Update unit tests for `TrickplayPreview` and `trickplayHelper`.

## Task 3: Automatic Local / Remote Jellyfin Detection
- [x] Enhance `SavedServer` & `SavedAccount` in `serverManager.ts` to support `localUrl?: string` and `remoteUrl?: string`.
- [x] Implement `autoDetectServerUrl()` in `serverDiscovery.ts`:
  - Quick concurrent ping (1.5s timeout) to local URL; if healthy, use local LAN URL (fast 4K direct play).
  - Fallback to remote URL if outside home network.
- [x] Integrate auto-detection into server initialization and app resume.
- [x] Add UI controls and connection badge (Local LAN ⚡ vs Remote WAN 🌐) in settings / server selection.
- [x] Add unit tests and verify full suite.
