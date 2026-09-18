import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { OfflineMediaRecord, SyncQueueEntry } from "./types";

/** Legacy unscoped keys kept only for a safe one-account migration. */
export const OFFLINE_CATALOG_STORAGE_KEY = "@finora_offline_catalog";
export const OFFLINE_SYNC_QUEUE_STORAGE_KEY = "@finora_offline_sync_queue";

// Mirrored from the auth/server managers to keep this storage layer independent
// from Jellyfin runtime singletons and avoid circular imports.
const ACTIVE_SESSION_STORAGE_KEY = "finora_active_session";
const SAVED_ACCOUNTS_STORAGE_KEY = "finora_saved_accounts";
const DOWNLOAD_QUEUE_STORAGE_KEY = "@finora_download_queue";

export interface OfflineStorageScope {
  serverId: string;
  userId: string;
}

function isValidScope(scope: Partial<OfflineStorageScope> | null | undefined): scope is OfflineStorageScope {
  return Boolean(scope?.serverId && scope?.userId);
}

function getScopeSuffix(scope: OfflineStorageScope): string {
  return `${encodeURIComponent(scope.serverId)}:${encodeURIComponent(scope.userId)}`;
}

export function getScopedOfflineCatalogKey(scope: OfflineStorageScope): string {
  return `${OFFLINE_CATALOG_STORAGE_KEY}:${getScopeSuffix(scope)}`;
}

export function getScopedOfflineSyncQueueKey(scope: OfflineStorageScope): string {
  return `${OFFLINE_SYNC_QUEUE_STORAGE_KEY}:${getScopeSuffix(scope)}`;
}

function parseArray<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export class OfflineStorageService {
  private fixedScope?: OfflineStorageScope;
  private migrationCheckedScopes = new Set<string>();

  constructor(scope?: OfflineStorageScope) {
    this.fixedScope = isValidScope(scope) ? scope : undefined;
  }

  private async getActiveScope(): Promise<OfflineStorageScope | null> {
    if (this.fixedScope) return this.fixedScope;

    try {
      const raw = await AsyncStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
      if (!raw) return null;
      const descriptor = JSON.parse(raw) as Partial<OfflineStorageScope>;
      return isValidScope(descriptor)
        ? { serverId: descriptor.serverId, userId: descriptor.userId }
        : null;
    } catch {
      return null;
    }
  }

  /**
   * DownloadManager already persists non-sensitive serverId/userId beside every
   * pending download. Prefer that identity when a completed download is saved so
   * switching accounts while a transfer is running cannot assign the file to the
   * newly active account.
   */
  private async getDownloadScope(itemId: string): Promise<OfflineStorageScope | null> {
    try {
      const raw = await AsyncStorage.getItem(DOWNLOAD_QUEUE_STORAGE_KEY);
      const entries = parseArray<{
        itemId?: string;
        serverId?: string;
        userId?: string;
      }>(raw);
      const entry = entries.find(
        (candidate) =>
          candidate.itemId === itemId && candidate.serverId && candidate.userId
      );
      return entry && isValidScope(entry)
        ? { serverId: entry.serverId, userId: entry.userId }
        : null;
    } catch {
      return null;
    }
  }

  private async resolveScope(
    explicitScope?: OfflineStorageScope,
    itemIdForDownloadLookup?: string
  ): Promise<OfflineStorageScope | null> {
    if (isValidScope(explicitScope)) return explicitScope;
    if (this.fixedScope) return this.fixedScope;

    if (itemIdForDownloadLookup) {
      const downloadScope = await this.getDownloadScope(itemIdForDownloadLookup);
      if (downloadScope) return downloadScope;
    }

    return this.getActiveScope();
  }

  /**
   * Legacy v1 data used global keys. It is safe to migrate automatically only
   * when FINORA has exactly one saved account and that account is the active
   * scope. With multiple accounts ownership is ambiguous, so legacy data remains
   * inaccessible rather than being exposed to the wrong user.
   */
  private async migrateLegacyIfSafe(scope: OfflineStorageScope): Promise<void> {
    const scopeId = getScopeSuffix(scope);
    if (this.migrationCheckedScopes.has(scopeId)) return;
    this.migrationCheckedScopes.add(scopeId);

    try {
      const accounts = parseArray<Partial<OfflineStorageScope>>(
        await AsyncStorage.getItem(SAVED_ACCOUNTS_STORAGE_KEY)
      );
      const isOnlyAccount =
        accounts.length === 1 &&
        accounts[0]?.serverId === scope.serverId &&
        accounts[0]?.userId === scope.userId;

      if (!isOnlyAccount) return;

      const catalogKey = getScopedOfflineCatalogKey(scope);
      const syncKey = getScopedOfflineSyncQueueKey(scope);
      const [scopedCatalog, scopedSync, legacyCatalog, legacySync] = await Promise.all([
        AsyncStorage.getItem(catalogKey),
        AsyncStorage.getItem(syncKey),
        AsyncStorage.getItem(OFFLINE_CATALOG_STORAGE_KEY),
        AsyncStorage.getItem(OFFLINE_SYNC_QUEUE_STORAGE_KEY)
      ]);

      if (scopedCatalog === null && legacyCatalog !== null) {
        await AsyncStorage.setItem(catalogKey, legacyCatalog);
        await AsyncStorage.removeItem(OFFLINE_CATALOG_STORAGE_KEY);
      }

      if (scopedSync === null && legacySync !== null) {
        await AsyncStorage.setItem(syncKey, legacySync);
        await AsyncStorage.removeItem(OFFLINE_SYNC_QUEUE_STORAGE_KEY);
      }
    } catch {
      // Migration is best effort. Never fall back to exposing a global catalog.
    }
  }

  private async getCatalogKey(scope?: OfflineStorageScope): Promise<string | null> {
    const resolved = await this.resolveScope(scope);
    if (!resolved) return null;
    await this.migrateLegacyIfSafe(resolved);
    return getScopedOfflineCatalogKey(resolved);
  }

  private async getSyncQueueKey(scope?: OfflineStorageScope): Promise<string | null> {
    const resolved = await this.resolveScope(scope);
    if (!resolved) return null;
    await this.migrateLegacyIfSafe(resolved);
    return getScopedOfflineSyncQueueKey(resolved);
  }

  /**
   * Saves or updates an offline media record in account-scoped local storage.
   * Download identity wins over the currently active session when available.
   */
  public async saveOfflineMedia(
    record: OfflineMediaRecord,
    scope?: OfflineStorageScope
  ): Promise<void> {
    const resolved = await this.resolveScope(scope, record.itemId);
    if (!resolved) return;
    await this.migrateLegacyIfSafe(resolved);

    const all = await this.getAllOfflineMedia(resolved);
    const filtered = all.filter((item) => item.itemId !== record.itemId);
    filtered.push(record);
    await AsyncStorage.setItem(
      getScopedOfflineCatalogKey(resolved),
      JSON.stringify(filtered)
    );
  }

  /**
   * Retrieves a single offline media record by itemId for the active/supplied account.
   */
  public async getOfflineMedia(
    itemId: string,
    scope?: OfflineStorageScope
  ): Promise<OfflineMediaRecord | null> {
    const all = await this.getAllOfflineMedia(scope);
    const found = all.find((item) => item.itemId === itemId);
    return found || null;
  }

  /**
   * Retrieves downloaded media belonging only to the active/supplied account.
   */
  public async getAllOfflineMedia(scope?: OfflineStorageScope): Promise<OfflineMediaRecord[]> {
    try {
      const key = await this.getCatalogKey(scope);
      if (!key) return [];
      return parseArray<OfflineMediaRecord>(await AsyncStorage.getItem(key));
    } catch {
      return [];
    }
  }

  /**
   * Deletes an offline media record and cleans up physical file for the active account.
   */
  public async deleteOfflineMedia(itemId: string): Promise<void> {
    const scope = await this.resolveScope();
    if (!scope) return;

    const all = await this.getAllOfflineMedia(scope);
    const item = all.find((i) => i.itemId === itemId);
    const filtered = all.filter((i) => i.itemId !== itemId);
    await AsyncStorage.setItem(
      getScopedOfflineCatalogKey(scope),
      JSON.stringify(filtered)
    );
    if (item?.localPath && typeof FileSystem.deleteAsync === "function") {
      try {
        await FileSystem.deleteAsync(item.localPath, { idempotent: true });
      } catch {
        // Safe deletion
      }
    }
    if (item?.posterLocalPath && typeof FileSystem.deleteAsync === "function") {
      try {
        await FileSystem.deleteAsync(item.posterLocalPath, { idempotent: true });
      } catch {
        // Safe deletion
      }
    }
  }

  /**
   * Deletes all downloaded episodes for a series from the active account only.
   */
  public async deleteSeriesOfflineMedia(seriesIdOrName: string): Promise<void> {
    const scope = await this.resolveScope();
    if (!scope) return;

    const all = await this.getAllOfflineMedia(scope);
    const seriesEpisodes = all.filter(
      (i) => i.seriesId === seriesIdOrName || (i.seriesName && i.seriesName === seriesIdOrName)
    );
    const remaining = all.filter(
      (i) => i.seriesId !== seriesIdOrName && (!i.seriesName || i.seriesName !== seriesIdOrName)
    );
    await AsyncStorage.setItem(
      getScopedOfflineCatalogKey(scope),
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
      if (ep.posterLocalPath && typeof FileSystem.deleteAsync === "function") {
        try {
          await FileSystem.deleteAsync(ep.posterLocalPath, { idempotent: true });
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
    const scope = await this.resolveScope();
    if (!scope) return;
    const item = await this.getOfflineMedia(itemId, scope);
    if (!item) return;

    item.playbackPositionTicks = positionTicks;
    const effectiveTotal = totalTicks || item.totalTicks;
    if (effectiveTotal > 0 && positionTicks / effectiveTotal >= 0.9 && !item.isPlayed) {
      item.isPlayed = true;
      item.completedWatchedAt = Date.now();
    }
    await this.saveOfflineMedia(item, scope);
  }

  /**
   * Explicitly marks an offline media record as watched and stamps the completion time.
   */
  public async markAsWatched(itemId: string): Promise<void> {
    const scope = await this.resolveScope();
    if (!scope) return;
    const item = await this.getOfflineMedia(itemId, scope);
    if (!item) return;

    item.isPlayed = true;
    item.completedWatchedAt = Date.now();
    await this.saveOfflineMedia(item, scope);
  }

  /**
   * Automatically cleans up watched downloads older than retentionHours (default: 48h / 2 days).
   * Deletes only media owned by the active account.
   */
  public async cleanupExpiredWatchedMedia(retentionHours: number = 48): Promise<string[]> {
    const scope = await this.resolveScope();
    if (!scope) return [];

    const all = await this.getAllOfflineMedia(scope);
    const now = Date.now();
    const retentionMs = retentionHours * 60 * 60 * 1000;
    const expiredIds: string[] = [];
    const remaining: OfflineMediaRecord[] = [];

    for (const item of all) {
      if (item.completedWatchedAt && now - item.completedWatchedAt >= retentionMs) {
        expiredIds.push(item.itemId);

        if (item.localPath && typeof FileSystem.deleteAsync === "function") {
          try {
            await FileSystem.deleteAsync(item.localPath, { idempotent: true });
          } catch {
            // Safe deletion
          }
        }

        if (item.posterLocalPath && typeof FileSystem.deleteAsync === "function") {
          try {
            await FileSystem.deleteAsync(item.posterLocalPath, { idempotent: true });
          } catch {
            // Safe deletion
          }
        }
      } else {
        remaining.push(item);
      }
    }

    if (expiredIds.length > 0) {
      await AsyncStorage.setItem(
        getScopedOfflineCatalogKey(scope),
        JSON.stringify(remaining)
      );
    }

    return expiredIds;
  }

  /**
   * Collects every known account-scoped catalog plus the legacy catalog so disk
   * cleanup can never delete another account's media just because it is hidden
   * from the currently active account.
   */
  private async getAllKnownCatalogRecords(): Promise<OfflineMediaRecord[]> {
    const records: OfflineMediaRecord[] = [];
    const seenScopes = new Set<string>();

    try {
      const accounts = parseArray<Partial<OfflineStorageScope>>(
        await AsyncStorage.getItem(SAVED_ACCOUNTS_STORAGE_KEY)
      );
      const activeScope = await this.getActiveScope();
      if (activeScope) accounts.push(activeScope);
      if (this.fixedScope) accounts.push(this.fixedScope);

      for (const candidate of accounts) {
        if (!isValidScope(candidate)) continue;
        const id = getScopeSuffix(candidate);
        if (seenScopes.has(id)) continue;
        seenScopes.add(id);
        records.push(
          ...parseArray<OfflineMediaRecord>(
            await AsyncStorage.getItem(getScopedOfflineCatalogKey(candidate))
          )
        );
      }

      // Protect old files until ownership can be migrated safely.
      records.push(
        ...parseArray<OfflineMediaRecord>(
          await AsyncStorage.getItem(OFFLINE_CATALOG_STORAGE_KEY)
        )
      );
    } catch {
      // Conservative fallback: return what was collected so far.
    }

    return records;
  }

  /**
   * Recursively lists every file under a directory (bounded depth), so
   * server/user-namespaced download folders are fully covered.
   */
  private async listFilesRecursively(dir: string, depth: number = 0): Promise<string[]> {
    if (depth > 6 || typeof FileSystem.readDirectoryAsync !== "function") return [];

    const results: string[] = [];
    let names: string[] = [];
    try {
      names = await FileSystem.readDirectoryAsync(dir);
    } catch {
      return results;
    }

    for (const name of names) {
      const full = `${dir}${name}`;
      let isDirectory = false;
      try {
        const info = await FileSystem.getInfoAsync(full);
        isDirectory = Boolean(info && "isDirectory" in info && (info as { isDirectory?: boolean }).isDirectory);
      } catch {
        isDirectory = false;
      }
      if (isDirectory) {
        results.push(...(await this.listFilesRecursively(`${full}/`, depth + 1)));
      } else {
        results.push(full);
      }
    }

    return results;
  }

  /**
   * Scans the shared finora_downloads directory tree and removes only files that
   * do not belong to ANY saved account catalog.
   */
  public async cleanupOrphanDiskFiles(excludePaths?: string[]): Promise<number> {
    let deletedCount = 0;
    try {
      if (FileSystem.documentDirectory && typeof FileSystem.readDirectoryAsync === "function") {
        const mediaDir = `${FileSystem.documentDirectory}finora_downloads/`;
        const dirInfo = await FileSystem.getInfoAsync(mediaDir);
        if (!dirInfo || !dirInfo.exists) return 0;

        const files = await this.listFilesRecursively(mediaDir);
        const catalog = await this.getAllKnownCatalogRecords();
        const activePaths = new Set(
          catalog
            .map((item) => item.localPath)
            .filter(Boolean)
            .map((p) => p.replace(/\\/g, "/"))
        );

        if (excludePaths) {
          for (const p of excludePaths) {
            activePaths.add(p.replace(/\\/g, "/"));
          }
        }

        for (const filePath of files) {
          const normalized = filePath.replace(/\\/g, "/");
          if (!activePaths.has(filePath) && !activePaths.has(normalized)) {
            if (typeof FileSystem.deleteAsync === "function") {
              await FileSystem.deleteAsync(filePath, { idempotent: true });
              deletedCount++;
            }
          }
        }
      }
    } catch {
      // Safe execution
    }
    return deletedCount;
  }

  /**
   * Enqueues a watch progress event in the active account's sync queue.
   */
  public async enqueueProgressSync(
    itemId: string,
    positionTicks: number,
    isPlayed: boolean
  ): Promise<SyncQueueEntry> {
    const scope = await this.resolveScope();
    if (!scope) {
      throw new Error("Cannot queue offline progress without an active Jellyfin account scope");
    }

    const entries = await this.getPendingSyncEntries(scope);
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
      getScopedOfflineSyncQueueKey(scope),
      JSON.stringify(filtered)
    );
    return newEntry;
  }

  /**
   * Retrieves pending watch progress for the active/supplied account only.
   */
  public async getPendingSyncEntries(scope?: OfflineStorageScope): Promise<SyncQueueEntry[]> {
    try {
      const key = await this.getSyncQueueKey(scope);
      if (!key) return [];
      return parseArray<SyncQueueEntry>(await AsyncStorage.getItem(key));
    } catch {
      return [];
    }
  }

  /**
   * Clears synced entries from the active/supplied account queue by ID.
   */
  public async clearSyncEntries(
    entryIds: string[],
    scope?: OfflineStorageScope
  ): Promise<void> {
    if (entryIds.length === 0) return;
    const resolved = await this.resolveScope(scope);
    if (!resolved) return;

    const current = await this.getPendingSyncEntries(resolved);
    const idSet = new Set(entryIds);
    const remaining = current.filter((entry) => !idSet.has(entry.id));
    await AsyncStorage.setItem(
      getScopedOfflineSyncQueueKey(resolved),
      JSON.stringify(remaining)
    );
  }

  /**
   * Clears offline catalog and sync queue only for the active/supplied account.
   */
  public async clearAll(scope?: OfflineStorageScope): Promise<void> {
    const resolved = await this.resolveScope(scope);
    if (!resolved) return;
    await AsyncStorage.removeItem(getScopedOfflineCatalogKey(resolved));
    await AsyncStorage.removeItem(getScopedOfflineSyncQueueKey(resolved));
  }

  /**
   * Checks real physical disk space used by downloaded files for the active account.
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
   * Deletes offline records for the active account whose media files no longer exist.
   */
  public async cleanupOrphanMedia(): Promise<number> {
    const scope = await this.resolveScope();
    if (!scope) return 0;

    const all = await this.getAllOfflineMedia(scope);
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
        getScopedOfflineCatalogKey(scope),
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

    if (FileSystem.documentDirectory && typeof FileSystem.getInfoAsync === "function") {
      const candidates: string[] = [
        `${FileSystem.documentDirectory}finora_downloads/${record.itemId}.mp4`,
        `${FileSystem.documentDirectory}finora_downloads/ep_${record.itemId}.mp4`,
        `${FileSystem.documentDirectory}finora_downloads/movie_${record.itemId}.mp4`
      ];

      if (record.localPath) {
        // Reconstruct the path from its stable portion after "finora_downloads/".
        // This survives the sandbox GUID changing across app reinstalls and keeps
        // the server/user namespace intact.
        const normalizedStored = record.localPath.replace(/\\/g, "/");
        const marker = "finora_downloads/";
        const markerIndex = normalizedStored.indexOf(marker);
        if (markerIndex >= 0) {
          const relative = normalizedStored.slice(markerIndex + marker.length);
          if (relative) {
            candidates.unshift(`${FileSystem.documentDirectory}${marker}${relative}`);
          }
        }

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

    if (record.localPath) {
      return record.localPath.startsWith("file://")
        ? record.localPath
        : `file://${record.localPath}`;
    }

    return null;
  }
}

export const offlineStorageService = new OfflineStorageService();
