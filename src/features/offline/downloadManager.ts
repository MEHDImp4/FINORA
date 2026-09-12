import { DownloadItem, DownloadStatus, OfflineMediaRecord } from "./types";
import { offlineStorageService } from "./offlineStorage";
import * as FileSystem from "expo-file-system/legacy";

export type DownloadListener = (downloads: DownloadItem[]) => void;

/**
 * DownloadManager coordinates media downloads, progress tracking,
 * pausing, resuming, and cancellation with safe file system operations.
 */
export class DownloadManager {
  private downloads: Map<string, DownloadItem> = new Map();
  private listeners: Set<DownloadListener> = new Set();
  private activeTasks: Map<string, any> = new Map();

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

  public async startDownload(
    item: Omit<
      DownloadItem,
      "status" | "progress" | "bytesDownloaded" | "totalBytes" | "startedAt"
    >,
    metadata?: Partial<OfflineMediaRecord>
  ): Promise<DownloadItem> {
    const existing = this.downloads.get(item.itemId);
    if (existing && existing.status === "downloading") {
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

    const downloadItem: DownloadItem = {
      ...item,
      localPath,
      status: "downloading",
      progress: 0,
      bytesDownloaded: 0,
      totalBytes: 0,
      startedAt: Date.now()
    };

    this.downloads.set(item.itemId, downloadItem);
    this.notify();

    // Start real network download with expo-file-system if available
    if (typeof FileSystem.createDownloadResumable === "function" && localPath.startsWith("file://")) {
      try {
        const downloadResumable = FileSystem.createDownloadResumable(
          item.downloadUrl,
          localPath,
          {},
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
            if (result && result.uri) {
              const fileInfo = await FileSystem.getInfoAsync(result.uri).catch(() => null);
              const finalSize =
                fileInfo && "size" in fileInfo
                  ? (fileInfo as any).size
                  : downloadItem.bytesDownloaded || 1000000;
              await this.completeDownload(item.itemId, finalSize, {
                ...metadata,
                localPath: result.uri
              });
            }
          })
          .catch((err) => {
            this.activeTasks.delete(item.itemId);
            this.markFailed(item.itemId, err?.message || "Échec du téléchargement");
          });
      } catch (err: any) {
        this.markFailed(item.itemId, err?.message || "Erreur d'initialisation du téléchargement");
      }
    }

    return downloadItem;
  }

  public updateProgress(
    itemId: string,
    bytesDownloaded: number,
    totalBytes: number
  ): void {
    const item = this.downloads.get(itemId);
    if (!item || item.status !== "downloading") return;

    item.bytesDownloaded = bytesDownloaded;
    item.totalBytes = totalBytes;
    item.progress = totalBytes > 0 ? Math.min(1, bytesDownloaded / totalBytes) : 0;

    if (bytesDownloaded >= totalBytes && totalBytes > 0) {
      item.status = "completed";
      item.completedAt = Date.now();
    }

    this.notify();
  }

  public async pauseDownload(itemId: string): Promise<void> {
    const item = this.downloads.get(itemId);
    if (!item || item.status !== "downloading") return;

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
  }

  public async resumeDownload(itemId: string): Promise<void> {
    const item = this.downloads.get(itemId);
    if (!item || item.status !== "paused") return;

    const task = this.activeTasks.get(itemId);
    if (task && typeof task.resumeAsync === "function") {
      try {
        task.resumeAsync().catch(() => {});
      } catch {
        // Safe execution
      }
    }

    item.status = "downloading";
    this.notify();
  }

  public async cancelDownload(itemId: string): Promise<void> {
    const item = this.downloads.get(itemId);
    if (!item) return;

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
  }

  public markCompleted(itemId: string, totalBytes: number): void {
    const item = this.downloads.get(itemId);
    if (!item) return;

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
  }

  public markFailed(itemId: string, error: string): void {
    const item = this.downloads.get(itemId);
    if (!item) return;

    item.status = "failed";
    item.error = error;
    this.notify();
  }
}

export const downloadManager = new DownloadManager();
