# Common Pitfalls & Prevention: FINORA

**Domain:** Personal Media Streaming (Jellyfin Client)  
**Evaluation Date:** 2026-09-10  
**Confidence:** HIGH  

---

## 1. Critical Pitfalls & Solutions

### Pitfall 1: React Native Polyfill Failures with @jellyfin/sdk
- **Warning Signs:** `ReferenceError: Can't find variable: URL` or broken query parameter serialization when using SDK endpoints.
- **Root Cause:** React Native's Hermes engine does not have complete browser URL / URLSearchParams standards implemented in earlier versions.
- **Prevention Strategy:** Import `react-native-url-polyfill/auto` at the exact app entry point (`src/app/_layout.tsx` or `index.ts`) before any Jellyfin SDK code is evaluated.
- **Phase Mapping:** Phase 0 (Foundation) & Phase 1 (Jellyfin Connection).

### Pitfall 2: Re-render Cascades on Large Carousel Libraries
- **Warning Signs:** Dropping below 60 FPS when scrolling Home, frame skips when Hero changes or when playback progress ticks.
- **Root Cause:** Storing active playback progress or active hero state in a monolithic global store or root context, triggering re-render of all child carousels.
- **Prevention Strategy:**
  - Strictly virtualize carousels using flash-list or optimized FlatList with `getItemLayout`, `initialNumToRender`, and memoized card components.
  - Isolate Hero state in its own dedicated component; keep playback reporting timers disconnected from the Home UI tree.
- **Phase Mapping:** Phase 3 (Home).

### Pitfall 3: Oversized Backdrop Image Caching & Memory Leaks
- **Warning Signs:** Out-of-memory crashes on Android devices with 3-4GB RAM when scrolling through library backdrops.
- **Root Cause:** Requesting original resolution (4K/1080p) backdrops for list thumbnails or mobile screen headers.
- **Prevention Strategy:** Use Jellyfin's image API width/height parameters (`maxWidth`, `maxHeight`, `quality`) to size every image request to physical device display requirements. Use `expo-image` with disk caching and recycle textures.
- **Phase Mapping:** Phase 2 (Jellyfin Data) & Phase 3 (Home).

### Pitfall 4: Orientation Change Restarting Video Playback
- **Warning Signs:** When rotating smartphone to landscape, video pauses, resets to 0:00, or reloads stream.
- **Root Cause:** React Native unmounting screen components or Expo Router resetting route state on configuration change.
- **Prevention Strategy:** Retain player instance in `FinoraPlayerEngine` state controller; keep player view persistent across orientation changes, and listen to orientation lock events without unmounting the player component.
- **Phase Mapping:** Phase 5 (Player Foundation) & Phase 6 (Premium Player).

### Pitfall 5: Insecure Token Persistence or Credential Logging
- **Warning Signs:** Passwords appearing in logs or tokens leaked in unencrypted AsyncStorage / SQLite databases.
- **Root Cause:** Using generic `console.log` for HTTP requests and saving auth payloads without redaction.
- **Prevention Strategy:**
  - Create central FINORA sanitized logger that automatically scrubs `Authorization`, `Token`, `Password`, `Cookie`.
  - Store tokens strictly in `expo-secure-store`. Discard raw passwords immediately following authentication.
- **Phase Mapping:** Phase 0 (Foundation) & Phase 1 (Jellyfin Connection).

### Pitfall 6: Unnecessary Transcoding Due to Inaccurate DeviceProfile
- **Warning Signs:** Jellyfin server CPU hits 100% transcoding 4K HEVC streams that the smartphone could easily Direct Play.
- **Root Cause:** Default conservative DeviceProfile sent by generic clients declaring unsupported codecs.
- **Prevention Strategy:** Implement detailed `PlaybackPlanner` detecting hardware capabilities (H264, HEVC, AV1, audio codecs) so Direct Play is chosen whenever supported.
- **Phase Mapping:** Phase 5 (Player Foundation).
