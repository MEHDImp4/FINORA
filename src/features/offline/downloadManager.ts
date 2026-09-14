import { DownloadItem, DownloadStatus, OfflineMediaRecord } from "./types";
import { offlineStorageService } from "./offlineStorage";
import * as FileSystem from "expo-file-system/legacy";
import { logger } from "../../core/network/logger";
import { notificationService } from "../../core/notifications/notificationService";
import { isWifiConnected } from "../../core/network/networkStatusService";
import { usePlaybackPreferencesStore } from "../../stores/playbackPreferencesStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type DownloadListener = (downloads: DownloadItem[]) => void;

export interface DownloadOptions {
  headers?: Record<string, string>;
}

interface StoredDownloadTask {
  item: Omit<
    DownloadItem,
    "status" | "progress" | "bytesDownloaded" | "totalBytes" | "startedAt"
  >;
  metadata?: Partial<OfflineMediaRecord>;
  options?: DownloadOptions;
}

/**
 * Persisted snapshot of a download, stored in AsyncStorage.
 * Tokens are NEVER persisted here — they are re-obtained from the secure session at restore time.
 */
export interface PersistedDownloadEntry {
  itemId: string;
  title: string;
  type: "Movie" | "Episode";
  year?: number;
  /** Download URL WITHOUT authentication tokens. Tokens are injected from secure session on resume. */
  downloadUrl: string;
  localPath: string;
  status: DownloadStatus;
  progress: number;
  bytesDownloaded: number;
  totalBytes: number;
  error?: string;
  startedAt: number;
  completedAt?: number;
  seriesId?: string;
  seriesName?: string;
  seriesPosterPath?: string;
  seasonIndex?: number;
  episodeIndex?: number;
  posterPath?: string;
  posterLocalPath?: string;
  quality?: string;
  metadata?: Partial<OfflineMediaRecord>;
}

export const MAX_CONCURRENT_DOWNLOADS = 3;
export const DOWNLOAD_QUEUE_STORAGE_KEY = "@finora_download_queue";

/**
 * Strips authentication tokens from a URL query string.
 * Tokens must come from the live secure session, never from persisted storage.
 */
function stripTokensFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("api_key");
    parsed.searchParams.delete("ApiKey");
    parsed.searchParams.delete("Token");
    return parsed.toString();
  } catch {
    // URL parsing failed (e.g., relative path) — return as-is
    return url;
  }
}

/**
 * DownloadManager coordinates media downloads, progress tracking,
 * queue scheduling with concurrency limitation (max 3), pausing,
 * resuming, retry, and cancellation with safe file system operations.
 *
 * PERSISTENCE: The queue and download states are persisted to AsyncStorage
 * so that downloads survive app kills, crashes, and OS-initiated process
 * termination. Tokens are NEVER persisted — they are re-obtained from the
 * authenticated session at resume time.
 */
export class DownloadManager {
  private downloads: Map<string, DownloadItem> = new Map();
  private queue: string[] = [];
  private listeners: Set<DownloadListener> = new Set();
  private activeTasks: Map<string, any> = new Map();
  private downloadConfigs: Map<string, StoredDownloadTask> = new Map();
  private speedTrackers: Map<
    string,
    { timestamp: number; bytes: number; speed: number }
  > = new Map();
  private persistDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // ─── Persistence ───────────────────────────────────────────────────────────

  /**
   * Schedules a debounced persistence write (200ms) to avoid excessive I/O
   * during rapid progress callbacks.
   */
  private schedulePersist(): void {
    if (this.persistDebounceTimer) {
      clearTimeout(this.persistDebounceTimer);
    }
    this.persistDebounceTimer = setTimeout(() => {
      this.persistQueue().catch(() => {});
    }, 200);
  }

  /**
   * Serializes and writes the current download state to AsyncStorage.
   * Completed and canceled downloads are excluded to keep storage lean.
   * Tokens are stripped from URLs before persistence.
   */
  private async persistQueue(): Promise<void> {
    try {
      const entries: PersistedDownloadEntry[] = [];

      for (const [itemId, item] of this.downloads.entries()) {
        // Skip completed and canceled — they don't need restoration
        if (item.status === "completed" || item.status === "canceled") continue;

        const config = this.downloadConfigs.get(itemId);

        entries.push({
          itemId: item.itemId,
          title: item.title,
          type: item.type,
          year: item.year,
          // Strip tokens — they are re-injected from live session on resume
          downloadUrl: stripTokensFromUrl(item.downloadUrl),
          localPath: item.localPath,
          status: item.status,
          progress: item.progress,
          bytesDownloaded: item.bytesDownloaded,
          totalBytes: item.totalBytes,
          error: item.error,
          startedAt: item.startedAt,
          completedAt: item.completedAt,
          seriesId: item.seriesId,
          seriesName: item.seriesName,
          seriesPosterPath: item.seriesPosterPath,
          seasonIndex: item.seasonIndex,
          episodeIndex: item.episodeIndex,
          posterPath: item.posterPath,
          posterLocalPath: item.posterLocalPath,
          metadata: config?.metadata
        });
      }

      await AsyncStorage.setItem(DOWNLOAD_QUEUE_STORAGE_KEY, JSON.stringify(entries));
    } catch (err: any) {
      logger.warn("[DownloadManager] Failed to persist queue:", err?.message ?? err);
    }
  }

  /**
   * Restores downloads from AsyncStorage after an app restart.
   *
   * Active downloads that were interrupted (downloading/queued) become
   * "interrupted" status so the UI shows them correctly without lying that
   * they're still downloading. The user can then resume them explicitly.
   *
   * Completed and canceled downloads are not restored (they have no pending work).
   * Failed downloads are restored so the user can retry.
   *
   * NOTE: Authentication tokens are NOT stored. The caller is responsible for
   * re-injecting fresh tokens from the secure session before resuming.
   */
  public async restorePersistedDownloads(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(DOWNLOAD_QUEUE_STORAGE_KEY);
      if (!raw) return;

      let entries: PersistedDownloadEntry[];
      try {
        entries = JSON.parse(raw);
        if (!Array.isArray(entries)) return;
      } catch {
        return;
      }

      let restoredCount = 0;

      for (const entry of entries) {
        if (!entry.itemId || !entry.title) continue;

        // Skip already-tracked downloads (avoid duplicates if restorePersistedDownloads is called twice)
        if (this.downloads.has(entry.itemId)) continue;

        // Verify local file state
        let localFileExists = false;
        let localFileSizeBytes = 0;

        if (entry.localPath && entry.localPath.startsWith("file://")) {
          try {
            const info = await FileSystem.getInfoAsync(entry.localPath);
            if (info.exists) {
              localFileExists = true;
              localFileSizeBytes = "size" in info ? (info as any).size : 0;
            }
          } catch {
            // File check failed — treat as not existing
          }
        }

        // Determine restored status
        let restoredStatus: DownloadStatus;
        if (entry.status === "completed") {
          // Already completed — skip (shouldn't reach here since we don't persist completed)
          continue;
        } else if (entry.status === "canceled") {
          // Canceled — skip
          continue;
        } else if (entry.status === "downloading" || entry.status === "queued") {
          // Was actively downloading when the app was killed — mark as paused
          // so UI shows it correctly. User can resume explicitly.
          restoredStatus = "paused";
        } else {
          // paused / failed — restore as-is
          restoredStatus = entry.status;
        }

        // Restore progress from actual file size if partial file exists
        const restoredBytesDownloaded = localFileExists
          ? Math.max(entry.bytesDownloaded, localFileSizeBytes)
          : entry.bytesDownloaded;

        const restoredProgress =
          entry.totalBytes > 0
            ? Math.min(1, restoredBytesDownloaded / entry.totalBytes)
            : entry.progress;

        const restoredItem: DownloadItem = {
          itemId: entry.itemId,
          title: entry.title,
          type: entry.type,
          year: entry.year,
          downloadUrl: entry.downloadUrl, // Token-free URL — caller injects fresh token
          localPath: entry.localPath,
          status: restoredStatus,
          progress: restoredProgress,
          bytesDownloaded: restoredBytesDownloaded,
          totalBytes: entry.totalBytes,
          error: entry.error,
          startedAt: entry.startedAt,
          completedAt: entry.completedAt,
          seriesId: entry.seriesId,
          seriesName: entry.seriesName,
          seriesPosterPath: entry.seriesPosterPath,
          seasonIndex: entry.seasonIndex,
          episodeIndex: entry.episodeIndex,
          posterPath: entry.posterPath,
          posterLocalPath: entry.posterLocalPath
        };

        this.downloads.set(entry.itemId, restoredItem);

        // Restore the download config so retry/resume works
        this.downloadConfigs.set(entry.itemId, {
          item: {
            itemId: entry.itemId,
            title: entry.title,
            type: entry.type,
            year: entry.year,
            downloadUrl: entry.downloadUrl,
            localPath: entry.localPath,
            seriesId: entry.seriesId,
            seriesName: entry.seriesName,
            seriesPosterPath: entry.seriesPosterPath,
            seasonIndex: entry.seasonIndex,
            episodeIndex: entry.episodeIndex,
            posterPath: entry.posterPath,
            posterLocalPath: entry.posterLocalPath
          },
          metadata: entry.metadata
        });

        restoredCount++;
      }

      if (restoredCount > 0) {
        logger.info(`[DownloadManager] Restored ${restoredCount} download(s) from persistent storage.`);
        this.notify();
      }
    } catch (err: any) {
      logger.warn("[DownloadManager] Failed to restore persisted downloads:", err?.message ?? err);
    }
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  public subscribe(listener: DownloadListener): () => void {
    this.listeners.add(listener);
    listener(this.getAllDownloads());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const list = this.getAllDownloads();
    this.listeners.forEach((listener) => {
      try {
        listener(list);
      } catch {
        // Safe execution
      }
    });
  }

  public getAllDownloads(): DownloadItem[] {
    return Array.from(this.downloads.values());
  }

  public getDownload(itemId: string): DownloadItem | undefined {
    return this.downloads.get(itemId);
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public async startDownload(
    item: Omit<
      DownloadItem,
      "status" | "progress" | "bytesDownloaded" | "totalBytes" | "startedAt"
    >,
    metadata?: Partial<OfflineMediaRecord>,
    options?: DownloadOptions
  ): Promise<DownloadItem> {
    this.downloadConfigs.set(item.itemId, { item, metadata, options });

    const existing = this.downloads.get(item.itemId);
    if (existing && (existing.status === "downloading" || existing.status === "queued")) {
      return existing;
    }

    let localPath = item.localPath;
    if (FileSystem.documentDirectory) {
      const mediaDir = `${FileSystem.documentDirectory}finora_downloads/`;
      try {
        await FileSystem.makeDirectoryAsync(mediaDir, { intermediates: true });
        localPath = `${mediaDir}${item.itemId}.mp4`;
      } catch {
        // Fallback to provided path
      }
    }

    const wifiOnly = usePlaybackPreferencesStore.getState().preferences.downloadWifiOnly;
    if (wifiOnly) {
      const isWifi = await isWifiConnected();
      if (!isWifi) {
        const errorMsg = "Connexion Wi-Fi requise (mode Wi-Fi uniquement activé)";
        logger.warn(`[DownloadManager] Download blocked for ${item.title}: ${errorMsg}`);
        const downloadItem: DownloadItem = {
          ...item,
          localPath,
          status: "failed",
          progress: 0,
          bytesDownloaded: 0,
          totalBytes: 0,
          error: errorMsg,
          startedAt: Date.now()
        };
        this.downloads.set(item.itemId, downloadItem);
        this.schedulePersist();
        this.notify();
        return downloadItem;
      }
    }

    const activeCount = Array.from(this.downloads.values()).filter(
      (d) => d.status === "downloading"
    ).length;

    const shouldQueue = activeCount >= MAX_CONCURRENT_DOWNLOADS;

    const downloadItem: DownloadItem = {
      ...item,
      localPath,
      status: shouldQueue ? "queued" : "downloading",
      progress: 0,
      bytesDownloaded: 0,
      totalBytes: 0,
      error: undefined,
      startedAt: Date.now()
    };

    this.downloads.set(item.itemId, downloadItem);

    if (shouldQueue) {
      if (!this.queue.includes(item.itemId)) {
        this.queue.push(item.itemId);
      }
      logger.info(`[DownloadManager] Queued: ${item.title} (position ${this.queue.length})`);
      this.schedulePersist();
      this.notify();
    } else {
      this.schedulePersist();
      this.notify();
      this.executeDownload(item.itemId);
    }

    return downloadItem;
  }

  private async executeDownload(itemId: string): Promise<void> {
    const downloadItem = this.downloads.get(itemId);
    const config = this.downloadConfigs.get(itemId);
    if (!downloadItem || !config) return;

    const wifiOnly = usePlaybackPreferencesStore.getState().preferences.downloadWifiOnly;
    if (wifiOnly) {
      const isWifi = await isWifiConnected();
      if (!isWifi) {
        const errorMsg = "Connexion Wi-Fi requise (mode Wi-Fi uniquement activé)";
        logger.warn(`[DownloadManager] Execution halted for ${downloadItem.title}: ${errorMsg}`);
        this.markFailed(itemId, errorMsg);
        return;
      }
    }

    const { item, metadata, options } = config;
    const localPath = downloadItem.localPath;

    logger.info(`[DownloadManager] Executing download: ${item.title} -> ${localPath}`);

    // Start real network download with expo-file-system if available
    if (typeof FileSystem.createDownloadResumable === "function" && localPath.startsWith("file://")) {
      try {
        const downloadResumable = FileSystem.createDownloadResumable(
          item.downloadUrl,
          localPath,
          {
            headers: options?.headers || {}
          },
          (progressData) => {
            this.updateProgress(
              item.itemId,
              progressData.totalBytesWritten,
              progressData.totalBytesExpectedToWrite
            );
          }
        );

        this.activeTasks.set(item.itemId, downloadResumable);

        // Execute download in background
        downloadResumable
          .downloadAsync()
          .then(async (result) => {
            this.activeTasks.delete(item.itemId);
            if (result) {
              if (result.status && result.status >= 400) {
                const errMsg = `Erreur HTTP ${result.status} lors du téléchargement`;
                logger.error(`[DownloadManager] ${errMsg} for ${item.itemId}`);
                if (localPath && typeof FileSystem.deleteAsync === "function") {
                  await FileSystem.deleteAsync(localPath, { idempotent: true }).catch(() => {});
                }
                this.markFailed(item.itemId, errMsg);
                return;
              }

              if (result.uri) {
                const fileInfo = await FileSystem.getInfoAsync(result.uri).catch(() => null);
                const finalSize =
                  fileInfo && "size" in fileInfo
                    ? (fileInfo as any).size
                    : downloadItem.bytesDownloaded || 1000000;
                logger.info(
                  `[DownloadManager] Download complete: ${item.title} (${finalSize} bytes)`
                );
                await this.completeDownload(item.itemId, finalSize, {
                  ...metadata,
                  localPath: result.uri
                });
              }
            }
          })
          .catch((err) => {
            this.activeTasks.delete(item.itemId);
            logger.error(`[DownloadManager] Download error for ${item.itemId}:`, err?.message || err);
            this.markFailed(item.itemId, err?.message || "Échec du téléchargement");
          });
      } catch (err: any) {
        logger.error(`[DownloadManager] Initialization error for ${item.itemId}:`, err?.message || err);
        this.markFailed(item.itemId, err?.message || "Erreur d'initialisation du téléchargement");
      }
    }
  }

  public processQueue(): void {
    const activeCount = Array.from(this.downloads.values()).filter(
      (d) => d.status === "downloading"
    ).length;
    const availableSlots = MAX_CONCURRENT_DOWNLOADS - activeCount;

    for (let i = 0; i < availableSlots && this.queue.length > 0; i++) {
      const nextId = this.queue.shift();
      if (!nextId) break;

      const nextItem = this.downloads.get(nextId);
      if (nextItem && nextItem.status === "queued") {
        nextItem.status = "downloading";
        this.executeDownload(nextId);
      }
    }

    this.notify();
  }

  public async retryDownload(itemId: string): Promise<void> {
    const config = this.downloadConfigs.get(itemId);
    if (config) {
      await this.startDownload(config.item, config.metadata, config.options);
    }
  }

  public updateProgress(
    itemId: string,
    bytesDownloaded: number,
    totalBytes: number
  ): void {
    const item = this.downloads.get(itemId);
    if (!item || item.status !== "downloading") return;

    // Calculate speed and ETA
    const now = Date.now();
    const prev = this.speedTrackers.get(itemId);
    if (prev) {
      const timeDelta = (now - prev.timestamp) / 1000;
      if (timeDelta >= 0.5) {
        const bytesDelta = bytesDownloaded - prev.bytes;
        if (bytesDelta >= 0) {
          const currentSpeed = bytesDelta / timeDelta;
          const smoothedSpeed =
            prev.speed > 0 ? prev.speed * 0.4 + currentSpeed * 0.6 : currentSpeed;
          item.speedBytesPerSecond = Math.round(smoothedSpeed);

          if (totalBytes > bytesDownloaded && smoothedSpeed > 1024) {
            item.estimatedSecondsRemaining = Math.round(
              (totalBytes - bytesDownloaded) / smoothedSpeed
            );
          } else {
            item.estimatedSecondsRemaining = undefined;
          }

          this.speedTrackers.set(itemId, {
            timestamp: now,
            bytes: bytesDownloaded,
            speed: smoothedSpeed
          });
        }
      }
    } else {
      this.speedTrackers.set(itemId, {
        timestamp: now,
        bytes: bytesDownloaded,
        speed: 0
      });
    }

    item.bytesDownloaded = bytesDownloaded;
    item.totalBytes = totalBytes > 0 ? totalBytes : 0;
    item.progress = totalBytes > 0 ? Math.min(1, bytesDownloaded / totalBytes) : 0;

    if (bytesDownloaded >= totalBytes && totalBytes > 0) {
      item.status = "completed";
      item.completedAt = Date.now();
      this.speedTrackers.delete(itemId);
    }

    this.schedulePersist();
    this.notify();
  }

  public async pauseDownload(itemId: string): Promise<void> {
    const item = this.downloads.get(itemId);
    if (!item || item.status !== "downloading") return;

    this.speedTrackers.delete(itemId);
    item.speedBytesPerSecond = undefined;
    item.estimatedSecondsRemaining = undefined;

    const task = this.activeTasks.get(itemId);
    if (task && typeof task.pauseAsync === "function") {
      try {
        await task.pauseAsync();
      } catch {
        // Safe execution
      }
    }

    item.status = "paused";
    this.schedulePersist();
    this.notify();
    this.processQueue();
  }

  public async resumeDownload(itemId: string): Promise<void> {
    const item = this.downloads.get(itemId);
    if (!item || (item.status !== "paused" && item.status !== ("interrupted" as DownloadStatus))) return;

    const wifiOnly = usePlaybackPreferencesStore.getState().preferences.downloadWifiOnly;
    if (wifiOnly) {
      const isWifi = await isWifiConnected();
      if (!isWifi) {
        this.markFailed(itemId, "Connexion Wi-Fi requise (mode Wi-Fi uniquement activé)");
        return;
      }
    }

    const activeCount = Array.from(this.downloads.values()).filter(
      (d) => d.status === "downloading"
    ).length;

    if (activeCount < MAX_CONCURRENT_DOWNLOADS) {
      item.status = "downloading";
      const task = this.activeTasks.get(itemId);
      if (task && typeof task.resumeAsync === "function") {
        try {
          task.resumeAsync().catch(() => {});
        } catch {
          // Safe execution
        }
      } else {
        this.executeDownload(itemId);
      }
    } else {
      item.status = "queued";
      if (!this.queue.includes(itemId)) {
        this.queue.unshift(itemId);
      }
    }

    this.schedulePersist();
    this.notify();
  }

  public async cancelDownload(itemId: string): Promise<void> {
    const item = this.downloads.get(itemId);
    if (!item) return;

    this.speedTrackers.delete(itemId);
    this.queue = this.queue.filter((id) => id !== itemId);

    const task = this.activeTasks.get(itemId);
    if (task && typeof task.cancelAsync === "function") {
      try {
        await task.cancelAsync();
      } catch {
        // Safe execution
      }
      this.activeTasks.delete(itemId);
    }

    if (item.localPath && typeof FileSystem.deleteAsync === "function") {
      FileSystem.deleteAsync(item.localPath, { idempotent: true }).catch(() => {});
    }

    item.status = "canceled";
    this.downloads.delete(itemId);

    // Remove from persistence immediately
    this.schedulePersist();
    this.notify();
    this.processQueue();
  }

  public markCompleted(itemId: string, totalBytes: number): void {
    const item = this.downloads.get(itemId);
    if (!item) return;

    this.speedTrackers.delete(itemId);
    item.speedBytesPerSecond = undefined;
    item.estimatedSecondsRemaining = undefined;
    item.status = "completed";
    item.progress = 1.0;
    item.bytesDownloaded = totalBytes;
    item.totalBytes = totalBytes;
    item.completedAt = Date.now();
    this.schedulePersist();
    this.notify();
  }

  public async completeDownload(
    itemId: string,
    totalBytes: number,
    metadata?: Partial<OfflineMediaRecord>
  ): Promise<void> {
    this.markCompleted(itemId, totalBytes);
    const item = this.downloads.get(itemId);
    if (item) {
      const finalLocalPath = metadata?.localPath || item.localPath;
      item.localPath = finalLocalPath;
      const record: OfflineMediaRecord = {
        itemId: item.itemId,
        title: item.title,
        type: item.type,
        year: item.year,
        localPath: finalLocalPath,
        fileSizeBytes: totalBytes,
        totalTicks: metadata?.totalTicks || 0,
        playbackPositionTicks: metadata?.playbackPositionTicks || 0,
        overview: metadata?.overview,
        posterPath: metadata?.posterPath || item.posterPath,
        seriesPosterPath: metadata?.seriesPosterPath || item.seriesPosterPath,
        posterLocalPath: metadata?.posterLocalPath || item.posterLocalPath,
        seriesId: item.seriesId,
        seriesName: item.seriesName,
        seasonIndex: item.seasonIndex,
        episodeIndex: item.episodeIndex,
        savedAt: Date.now()
      };
      await offlineStorageService.saveOfflineMedia(record);
      // Notify user of completed download
      notificationService.notifyDownloadComplete(item.title, item.itemId, item.type).catch(() => {});
      // Notify listeners so UI updates catalog
      this.notify();
    }
    this.processQueue();
  }

  public markFailed(itemId: string, error: string): void {
    const item = this.downloads.get(itemId);
    if (!item) return;

    this.speedTrackers.delete(itemId);
    item.speedBytesPerSecond = undefined;
    item.estimatedSecondsRemaining = undefined;
    item.status = "failed";
    item.error = error;
    this.schedulePersist();
    this.notify();
    this.processQueue();
  }
}

export const downloadManager = new DownloadManager();
