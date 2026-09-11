# Phase 10: Offline Subsystem - Research

**Phase:** 10-offline-subsystem  
**Date:** 2026-09-11  
**Status:** In Progress  

---

## Technical Approach & Architecture

Phase 10 provides complete offline autonomy for FINORA, enabling users to download media to isolated app storage and play without an active network connection:

1. **Download Manager & File System (`OFFL-01`)**:
   - Downloads media directly into the app sandbox directory (`${FileSystem.documentDirectory}finora_downloads/${itemId}.mp4`).
   - Supports download states: `idle`, `queued`, `downloading`, `paused`, `completed`, `failed`.
   - Supports progress tracking with byte progress callbacks and percentage calculation.
   - Supports pause, resume, and cancellation (with cleanup of partial files).

2. **Offline Database & Sync Queue (`OFFL-02`)**:
   - Structured metadata storage for offline items:
     - `itemId`, `title`, `type`, `year`, `overview`, `localPath`, `fileSizeBytes`, `durationTicks`, `posterPath`, `downloadedAt`.
   - Sync Queue table:
     - Stores offline progress reports (`itemId`, `positionTicks`, `isPlayed`, `timestamp`).
     - Queues progress events generated while offline so they can be dispatched to Jellyfin upon reconnection.

3. **Offline Playback & Progress Sync (`OFFL-03`)**:
   - `FinoraPlayerEngine` detects when playback target is a local `file://` URI and configures `expo-video` player source accordingly.
   - `PlaybackPlanner` resolves offline items directly to local URI without remote stream negotiation.
   - Network listener (`AppState` / connectivity checks) triggers `OfflineSyncManager.syncPendingProgress()` upon reconnection to flush the sync queue to Jellyfin.
   - Downloads tab / screen (`src/app/(tabs)/downloads.tsx` or dedicated view) to view, play, and delete offline items.

---

## Validation Strategy
1. **Unit Tests**:
   - `DownloadManager.test.ts`: Test queueing, progress updates, pause/resume, and cancellation cleanup.
   - `OfflineDatabase.test.ts`: Test inserting downloaded items, querying offline catalog, and sync queue management.
   - `OfflineSyncManager.test.ts`: Test sync queue dispatch to Jellyfin upon reconnection.
   - `DownloadsScreen.test.tsx`: Test rendering downloaded items, storage usage bar, and local play trigger.
2. **Type Safety**: `npx tsc --noEmit` clean.
3. **Full Suite**: 100% green tests.
