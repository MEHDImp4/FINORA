import { offlineStorageService } from "./offlineStorage";
import { PlaybackRepository, playbackRepository } from "../../core/repositories/playbackRepository";
import { UserDataRepository, userDataRepository } from "../../core/repositories/userDataRepository";

export class OfflineSyncManager {
  /**
   * Flushes pending watch progress entries to Jellyfin when network connectivity is restored.
   */
  public async syncPendingProgress(
    userId: string,
    playbackRepo: PlaybackRepository = playbackRepository,
    userDataRepo: UserDataRepository = userDataRepository
  ): Promise<{ syncedCount: number; errors: number }> {
    if (!userId) {
      return { syncedCount: 0, errors: 0 };
    }

    const pendingEntries = await offlineStorageService.getPendingSyncEntries();
    if (pendingEntries.length === 0) {
      return { syncedCount: 0, errors: 0 };
    }

    let syncedCount = 0;
    let errors = 0;
    const syncedIds: string[] = [];

    for (const entry of pendingEntries) {
      try {
        // 1. Report progress
        await playbackRepo.reportPlaybackProgress({
          itemId: entry.itemId,
          positionTicks: entry.positionTicks,
          isPaused: false
        });

        // 2. Mark played if applicable
        if (entry.isPlayed) {
          await userDataRepo.markPlayed(userId, entry.itemId);
        }

        syncedIds.push(entry.id);
        syncedCount++;
      } catch {
        errors++;
      }
    }

    // Clean up all successfully synced entries
    if (syncedIds.length > 0) {
      await offlineStorageService.clearSyncEntries(syncedIds);
    }

    return { syncedCount, errors };
  }
}

export const offlineSyncManager = new OfflineSyncManager();
