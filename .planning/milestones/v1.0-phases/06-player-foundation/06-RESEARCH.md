# Phase 06: Player Foundation - Research

**Phase:** 06-player-foundation  
**Date:** 2026-09-11  
**Status:** In Progress  

---

## Technical Approach & Architecture

Phase 6 delivers the streaming core of FINORA. Per the project principles, the player must guarantee:
1. **Flawless Playback Abstraction (`PLAY-01`)**: UI layers must NEVER couple directly to vendor player APIs (`expo-video` or `Media3`). `FinoraPlayerEngine` provides a robust, observable state machine (`idle`, `loading`, `playing`, `paused`, `buffering`, `error`, `ended`).
2. **Intelligent Stream Negotiation (`PLAY-02`)**: `PlaybackPlanner` evaluates media streams and client hardware capabilities (`DeviceProfile`) to select **Direct Play** whenever possible, falling back to **Direct Stream** (remux container) or **Transcoding** (HLS `master.m3u8`) only when unsupported.
3. **Rock-Solid Jellyfin Session Reporting (`PLAY-03`)**: Session lifecycle events are reported to Jellyfin:
   - `POST /Sessions/Playing` on start.
   - Throttled periodic `POST /Sessions/Playing/Progress` (every 5-10s) with ticks and pause state.
   - `POST /Sessions/Playing/Stopped` on exit with final position for accurate resume syncing.
4. **Orientation & Lifecycle Resilience (`PLAY-04`)**: The player state, playback position, and engine instance persist cleanly across orientation changes (portrait/landscape) and background/foreground transitions without restarting or reloading the stream.

---

### 1. `expo-video` & Native Engine Integration (`PLAY-01`)

- **Dependency**: `expo-video` (~2.0.0 for Expo SDK 52).
- **Core APIs**:
  - `useVideoPlayer(source, setupCallback)` creates and controls a native player instance (backed by `AndroidX Media3 / ExoPlayer` on Android and `AVPlayer` on iOS).
  - `<VideoView player={player} ... />` renders the native video surface.
- **FinoraPlayerEngine Abstraction**:
  - Encapsulates `VideoPlayer` and translates native events into FINORA's domain state.
  - State machine:
    ```typescript
    export type PlayerPlaybackState = 
      | "idle"
      | "loading"
      | "playing"
      | "paused"
      | "buffering"
      | "error"
      | "ended";
    ```
  - Player Engine Interface:
    ```typescript
    export interface IFinoraPlayerEngine {
      play(): void;
      pause(): void;
      seekTo(positionSeconds: number): void;
      setVolume(volume: number): void;
      setRate(rate: number): void;
      destroy(): void;
      getState(): PlayerPlaybackState;
      getPositionSeconds(): number;
      getDurationSeconds(): number;
    }
    ```
  - Observable Store / Hook: `useFinoraPlayerStore` & `useFinoraPlayer` providing reactive state (time, duration, buffered time, status, volume, rate) to UI components without triggering unnecessary re-renders on the video surface.

---

### 2. Stream Negotiation & `PlaybackPlanner` (`PLAY-02`)

- **Jellyfin Streaming Architecture**:
  - Direct Play URL:
    `${serverUrl}/Videos/${itemId}/stream?static=true&mediaSourceId=${mediaSourceId}&api_key=${token}`
    Plays container and codecs directly with 0 server CPU overhead.
  - Direct Stream URL:
    `${serverUrl}/Videos/${itemId}/stream?mediaSourceId=${mediaSourceId}&videoCodec=copy&audioCodec=copy&api_key=${token}`
    Re-packages container without re-encoding video/audio.
  - Transcoding (HLS) URL:
    `${serverUrl}/Videos/${itemId}/master.m3u8?mediaSourceId=${mediaSourceId}&videoCodec=h264&audioCodec=aac&api_key=${token}&maxStreamingBitrate=${bitrate}&transcodingProtocol=hls`
- **Device Profile**:
  - Defines supported containers (e.g. `mp4`, `mkv`, `webm`, `ts`, `m4v`).
  - Supported video codecs: `h264`, `hevc` (h265), `vp9`, `av1`.
  - Supported audio codecs: `aac`, `mp3`, `ac3`, `eac3`, `flac`, `opus`.
  - Max resolution (e.g. 3840x2160 or 1920x1080) and max bitrate.
- **Decision Engine**:
  ```typescript
  export interface StreamPlan {
    mode: "direct-play" | "direct-stream" | "transcode";
    url: string;
    mediaSourceId: string;
    videoCodec?: string;
    audioCodec?: string;
    container?: string;
    reason: string;
  }
  ```
  1. Inspect `item.mediaStreams` (or fetch `MediaSources` via `/Items/${itemId}/PlaybackInfo`).
  2. If container AND video codec AND audio codec match `DeviceProfile` -> `direct-play`.
  3. Else if video & audio codecs match, but container does not -> `direct-stream`.
  4. Else -> `transcode` with HLS URL and target codecs (`h264`, `aac`).
  5. **Security**: Redact all access tokens/API keys in any logged URLs or diagnostics.

---

### 3. Playback Session Reporting (`PLAY-03`)

- **Jellyfin Endpoints**:
  - `POST /Sessions/Playing`
    - Payload: `{ ItemId, MediaSourceId, PositionTicks, AudioStreamIndex, SubtitleStreamIndex, PlayMethod: "DirectPlay" | "DirectStream" | "Transcode" }`
  - `POST /Sessions/Playing/Progress`
    - Payload: `{ ItemId, MediaSourceId, PositionTicks, IsPaused, EventName: "TimeUpdate" | "Pause" | "Unpause" }`
    - **Throttling**: Send every 5 to 10 seconds during active playback. Send immediately on pause/unpause.
  - `POST /Sessions/Playing/Stopped`
    - Payload: `{ ItemId, MediaSourceId, PositionTicks }`
    - Sent synchronously when leaving the player or when media reaches the end (`ended`).
- **Repository Implementation (`PlaybackRepository`)**:
  - `reportPlaybackStart(sessionData: PlaybackStartData): Promise<void>`
  - `reportPlaybackProgress(sessionData: PlaybackProgressData): Promise<void>`
  - `reportPlaybackStopped(sessionData: PlaybackStopData): Promise<void>`

---

### 4. Orientation & Lifecycle Resilience (`PLAY-04`)

- **Screen Orientation**:
  - FINORA details/home screens are portrait-first.
  - Player screen supports auto-rotation and landscape mode.
  - Player component retains instance and current position across orientation change.
- **AppState & Background Handling**:
  - When app goes to background:
    - Automatically pause playback (or stop reporting progress if background audio is not active).
    - Send immediate progress update so resume ticks are saved on Jellyfin.
  - When app returns to foreground:
    - Resume player state if appropriate, restore session reporting.
- **Navigation Integration**:
  - Dedicated route `src/app/player/[id].tsx`.
  - Back handler sends `reportPlaybackStopped` and pops route.
  - Auto-resume: Start playback at `item.playbackPositionTicks` if > 0 and < 90% played.

---

## Validation Strategy

1. **Unit Tests**:
   - `PlaybackPlanner.test.ts`: Test Direct Play, Direct Stream, and Transcode stream plan generation for varied codec/container combinations.
   - `PlaybackRepository.test.ts`: Test start, throttled progress, and stopped API calls.
   - `FinoraPlayerEngine.test.ts`: Test state machine transitions, seek, pause, play, and error handling.
   - `useFinoraPlayer.test.ts`: Test hook binding to store and lifecycle events.
2. **Type Safety**:
   - `npx tsc --noEmit` must pass with 0 errors.
3. **Security Checklist**:
   - URL tokens redacted in logs and error messages.
   - Clean unmount guaranteed without memory leaks.
