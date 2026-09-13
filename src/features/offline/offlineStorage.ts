import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { OfflineMediaRecord, SyncQueueEntry } from "./types";

export const OFFLINE_CATALOG_STORAGE_KEY = "@finora_offline_catalog";
export const OFFLINE_SYNC_QUEUE_STORAGE_KEY = "@finora_offline_sync_queue";

export class OfflineStorageService {
  /**
   * Saves or updates an offline media record in local storage.
   */
  public async saveOfflineMedia(record: OfflineMediaRecord): Promise<void> {
    const all = await this.getAllOfflineMedia();
    const filtered = all.filter((item) => item.itemId !== record.itemId);
    filtered.push(record);
    await AsyncStorage.setItem(
      OFFLINE_CATALOG_STORAGE_KEY,
      JSON.stringify(filtered)
    );
  }

  /**
   * Retrieves a single offline media record by itemId.
   */
  public async getOfflineMedia(itemId: string): Promise<OfflineMediaRecord | null> {
    const all = await this.getAllOfflineMedia();
    const found = all.find((item) => item.itemId === itemId);
    return found || null;
  }

  /**
   * Retrieves all downloaded offline media records.
   */
  public async getAllOfflineMedia(): Promise<OfflineMediaRecord[]> {
    try {
      const raw = await AsyncStorage.getItem(OFFLINE_CATALOG_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Deletes an offline media record and cleans up physical file.
   */
  public async deleteOfflineMedia(itemId: string): Promise<void> {
    const all = await this.getAllOfflineMedia();
    const item = all.find((i) => i.itemId === itemId);
    const filtered = all.filter((i) => i.itemId !== itemId);
    await AsyncStorage.setItem(
      OFFLINE_CATALOG_STORAGE_KEY,
      JSON.stringify(filtered)
    );
    if (item?.localPath && typeof FileSystem.deleteAsync === "function") {
      try {
        await FileSystem.deleteAsync(item.localPath, { idempotent: true });
      } catch {
        // Safe deletion
      }
    }
  }

  /**
   * Deletes all downloaded episodes for a series and cleans up physical files.
   */
  public async deleteSeriesOfflineMedia(seriesIdOrName: string): Promise<void> {
    const all = await this.getAllOfflineMedia();
    const seriesEpisodes = all.filter(
      (i) => i.seriesId === seriesIdOrName || (i.seriesName && i.seriesName === seriesIdOrName)
    );
    const remaining = all.filter(
      (i) => i.seriesId !== seriesIdOrName && (!i.seriesName || i.seriesName !== seriesIdOrName)
    );
    await AsyncStorage.setItem(
      OFFLINE_CATALOG_STORAGE_KEY,
      JSON.stringify(remaining)
    );

    for (const ep of seriesEpisodes) {
      if (ep.localPath && typeof FileSystem.deleteAsync === "function") {
        try {
          await FileSystem.deleteAsync(ep.localPath, { idempotent: true });
        } catch {
          // Safe deletion
        }
      }
    }
  }

  /**
   * Updates playback position locally for an offline media record.
   * If the playback reaches >= 90% of total duration, it is automatically marked as watched.
   */
  public async updateLocalPlaybackPosition(
    itemId: string,
    positionTicks: number,
    totalTicks?: number
  ): Promise<void> {
    const item = await this.getOfflineMedia(itemId);
    if (!item) return;

    item.playbackPositionTicks = positionTicks;
    const effectiveTotal = totalTicks || item.totalTicks;
    if (effectiveTotal > 0 && positionTicks / effectiveTotal >= 0.9 && !item.isPlayed) {
      item.isPlayed = true;
      item.completedWatchedAt = Date.now();
    }
    await this.saveOfflineMedia(item);
  }

  /**
   * Explicitly marks an offline media record as watched and stamps the completion time.
   */
  public async markAsWatched(itemId: string): Promise<void> {
    const item = await this.getOfflineMedia(itemId);
    if (!item) return;

    item.isPlayed = true;
    item.completedWatchedAt = Date.now();
    await this.saveOfflineMedia(item);
  }

  /**
   * Automatically cleans up watched downloads older than retentionHours (default: 48h / 2 days).
   * Returns the list of deleted itemIds.
   */
  public async cleanupExpiredWatchedMedia(retentionHours: number = 48): Promise<string[]> {
    const all = await this.getAllOfflineMedia();
    const now = Date.now();
    const retentionMs = retentionHours * 60 * 60 * 1000;
    const expiredIds: string[] = [];
    const remaining: OfflineMediaRecord[] = [];

    for (const item of all) {
      if (item.completedWatchedAt && now - item.completedWatchedAt >= retentionMs) {
        expiredIds.push(item.itemId);
      } else {
        remaining.push(item);
      }
    }

    if (expiredIds.length > 0) {
      await AsyncStorage.setItem(
        OFFLINE_CATALOG_STORAGE_KEY,
        JSON.stringify(remaining)
      );
    }

    return expiredIds;
  }

  /**
   * Enqueues a watch progress event to be synced with Jellyfin upon reconnection.
   */
  public async enqueueProgressSync(
    itemId: string,
    positionTicks: number,
    isPlayed: boolean
  ): Promise<SyncQueueEntry> {
    const entries = await this.getPendingSyncEntries();
    // Replace any existing sync entry for the same item to keep latest position
    const filtered = entries.filter((e) => e.itemId !== itemId);

    const newEntry: SyncQueueEntry = {
      id: `sync_${itemId}_${Date.now()}`,
      itemId,
      positionTicks,
      isPlayed,
      createdAt: Date.now()
    };

    filtered.push(newEntry);
    await AsyncStorage.setItem(
      OFFLINE_SYNC_QUEUE_STORAGE_KEY,
      JSON.stringify(filtered)
    );
    return newEntry;
  }

  /**
   * Retrieves all pending watch progress sync entries.
   */
  public async getPendingSyncEntries(): Promise<SyncQueueEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(OFFLINE_SYNC_QUEUE_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Clears synced entries from the queue by ID.
   */
  public async clearSyncEntries(entryIds: string[]): Promise<void> {
    if (entryIds.length === 0) return;
    const current = await this.getPendingSyncEntries();
    const idSet = new Set(entryIds);
    const remaining = current.filter((entry) => !idSet.has(entry.id));
    await AsyncStorage.setItem(
      OFFLINE_SYNC_QUEUE_STORAGE_KEY,
      JSON.stringify(remaining)
    );
  }

  /**
   * Clears all offline catalog and sync queue data.
   */
  public async clearAll(): Promise<void> {
    await AsyncStorage.removeItem(OFFLINE_CATALOG_STORAGE_KEY);
    await AsyncStorage.removeItem(OFFLINE_SYNC_QUEUE_STORAGE_KEY);
  }

  /**
   * Checks real physical disk space used by downloaded files.
   * Returns items with their verified physical status and size.
   */
  public async getVerifiedOfflineMedia(): Promise<{
    items: (OfflineMediaRecord & { fileExists: boolean; actualBytes: number })[];
    totalPhysicalBytes: number;
    hasOrphans: boolean;
  }> {
    const all = await this.getAllOfflineMedia();
    let totalPhysicalBytes = 0;
    let hasOrphans = false;

    const items = await Promise.all(
      all.map(async (record) => {
        let fileExists = false;
        let actualBytes = 0;

        if (record.localPath && typeof FileSystem.getInfoAsync === "function") {
          try {
            const info = await FileSystem.getInfoAsync(record.localPath);
            if (info && info.exists) {
              fileExists = true;
              actualBytes =
                "size" in info && typeof info.size === "number"
                  ? info.size
                  : record.fileSizeBytes || 0;
            }
          } catch {
            fileExists = false;
          }
        }

        if (fileExists) {
          totalPhysicalBytes += actualBytes;
        } else {
          hasOrphans = true;
        }

        return {
          ...record,
          fileExists,
          actualBytes
        };
      })
    );

    return {
      items,
      totalPhysicalBytes,
      hasOrphans
    };
  }

  /**
   * Deletes all offline records whose media files no longer exist on physical storage.
   * Returns the count of removed phantom/orphan records.
   */
  public async cleanupOrphanMedia(): Promise<number> {
    const all = await this.getAllOfflineMedia();
    const remaining: OfflineMediaRecord[] = [];
    let orphanCount = 0;

    for (const record of all) {
      let exists = false;
      if (record.localPath && typeof FileSystem.getInfoAsync === "function") {
        try {
          const info = await FileSystem.getInfoAsync(record.localPath);
          exists = !!(info && info.exists);
        } catch {
          exists = false;
        }
      }
      if (exists) {
        remaining.push(record);
      } else {
        orphanCount++;
      }
    }

    if (orphanCount > 0) {
      await AsyncStorage.setItem(
        OFFLINE_CATALOG_STORAGE_KEY,
        JSON.stringify(remaining)
      );
    }

    return orphanCount;
  }

  /**
   * Resolves the actual physical local filesystem URI for an offline media record.
   * Handles relative paths, changed documentDirectory sandbox GUIDs across app launches,
   * and verifies physical file presence.
   */
  public async resolveLocalUri(record: OfflineMediaRecord): Promise<string | null> {
    if (!record) return null;

    // 1. Direct check on recorded localPath
    if (record.localPath && typeof FileSystem.getInfoAsync === "function") {
      try {
        const info = await FileSystem.getInfoAsync(record.localPath);
        if (info && info.exists) {
          return record.localPath;
        }
      } catch {
        // Fallback to searching in current documentDirectory
      }
    }

    // 2. Fallback check inside current FileSystem.documentDirectory
    if (FileSystem.documentDirectory && typeof FileSystem.getInfoAsync === "function") {
      const candidates: string[] = [
        `${FileSystem.documentDirectory}finora_downloads/${record.itemId}.mp4`,
        `${FileSystem.documentDirectory}finora_downloads/ep_${record.itemId}.mp4`,
        `${FileSystem.documentDirectory}finora_downloads/movie_${record.itemId}.mp4`
      ];

      if (record.localPath) {
        const filename = record.localPath.split("/").pop();
        if (filename) {
          candidates.unshift(`${FileSystem.documentDirectory}finora_downloads/${filename}`);
        }
      }

      for (const candidate of candidates) {
        try {
          const info = await FileSystem.getInfoAsync(candidate);
          if (info && info.exists) {
            return candidate;
          }
        } catch {
          // Check next candidate
        }
      }
    }

    // 3. If file exists check was not conclusive, ensure file:// scheme is present
    if (record.localPath) {
      return record.localPath.startsWith("file://")
        ? record.localPath
        : `file://${record.localPath}`;
    }

    return null;
  }
}

export const offlineStorageService = new OfflineStorageService();
