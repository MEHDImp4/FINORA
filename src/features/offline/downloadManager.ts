import { DownloadItem, DownloadStatus, OfflineMediaRecord } from "./types";
import { offlineStorageService } from "./offlineStorage";
import * as FileSystem from "expo-file-system/legacy";
import { logger } from "../../core/network/logger";

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

export const MAX_CONCURRENT_DOWNLOADS = 3;

/**
 * DownloadManager coordinates media downloads, progress tracking,
 * queue scheduling with concurrency limitation (max 3), pausing,
 * resuming, retry, and cancellation with safe file system operations.
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
      this.notify();
    } else {
      this.notify();
      this.executeDownload(item.itemId);
    }

    return downloadItem;
  }

  private executeDownload(itemId: string): void {
    const downloadItem = this.downloads.get(itemId);
    const config = this.downloadConfigs.get(itemId);
    if (!downloadItem || !config) return;

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
    this.notify();
    this.processQueue();
  }

  public async resumeDownload(itemId: string): Promise<void> {
    const item = this.downloads.get(itemId);
    if (!item || item.status !== "paused") return;

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
      const record: OfflineMediaRecord = {
        itemId: item.itemId,
        title: item.title,
        type: item.type,
        year: item.year,
        localPath: item.localPath,
        fileSizeBytes: totalBytes,
        totalTicks: metadata?.totalTicks || 0,
        playbackPositionTicks: metadata?.playbackPositionTicks || 0,
        overview: metadata?.overview,
        posterPath: metadata?.posterPath,
        seriesId: item.seriesId,
        seriesName: item.seriesName,
        seasonIndex: item.seasonIndex,
        episodeIndex: item.episodeIndex,
        savedAt: Date.now()
      };
      await offlineStorageService.saveOfflineMedia(record);
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
    this.notify();
    this.processQueue();
  }
}

export const downloadManager = new DownloadManager();
