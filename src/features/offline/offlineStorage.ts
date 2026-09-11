import AsyncStorage from "@react-native-async-storage/async-storage";
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
   * Deletes an offline media record.
   */
  public async deleteOfflineMedia(itemId: string): Promise<void> {
    const all = await this.getAllOfflineMedia();
    const filtered = all.filter((item) => item.itemId !== itemId);
    await AsyncStorage.setItem(
      OFFLINE_CATALOG_STORAGE_KEY,
      JSON.stringify(filtered)
    );
  }

  /**
   * Updates playback position locally for an offline media record.
   */
  public async updateLocalPlaybackPosition(
    itemId: string,
    positionTicks: number
  ): Promise<void> {
    const item = await this.getOfflineMedia(itemId);
    if (!item) return;

    item.playbackPositionTicks = positionTicks;
    await this.saveOfflineMedia(item);
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
}

export const offlineStorageService = new OfflineStorageService();
