# Quick Task: Resolve Device Profile Platform via Platform.OS

## Problem Description
getDefaultDeviceProfile(platform = "default") only considers "ios" as iOS and defaults everything else (including "default") to the Android profile.
In PlayerScreen.tsx, createPlaybackPlan() is called without passing a deviceProfile or platform.
As a result, on iOS devices, FINORA currently uses the Android Media3 / ExoPlayer compatibility profile (which advertises MKV, VP9, Opus support), causing incorrect Direct Play decisions for containers/codecs that iOS AVPlayer cannot decode natively.

## Implementation Steps
1. **src/features/player/deviceProfile.ts**:
   - Import Platform from react-native.
   - Update getDefaultDeviceProfile(platform?: string) so that when platform is omitted or "default", it resolves to Platform.OS.
   - When Platform.OS === "ios" (or platform === "ios"), return the iOS AVPlayer profile (MP4, M4V, MOV, TS, M3U8 with H.264, HEVC, AV1 and AAC, MP3, AC3, EAC3, FLAC, ALAC).
   - Otherwise return the Android Media3 profile.

2. **src/features/player/playbackPlanner.ts**:
   - Add optional platform?: string to PlaybackPlanOptions.
   - Default deviceProfile = getDefaultDeviceProfile(platform).

3. **src/features/player/components/PlayerScreen.tsx**:
   - Import Platform from react-native.
   - Pass platform: Platform.OS to createPlaybackPlan.

4. **Tests**:
   - Create unit tests for deviceProfile.ts verifying iOS, Android, and Platform.OS fallback behavior.
   - Update playbackPlanner.test.ts to test platform-specific direct stream vs direct play decisions.
   - Verify all tests pass with npm test and npm run typecheck.
