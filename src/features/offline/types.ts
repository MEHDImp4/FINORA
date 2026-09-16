export type DownloadStatus =
  | "queued"
  | "downloading"
  | "finalizing"
  | "paused"
  | "completed"
  | "failed"
  | "canceled";

export interface DownloadItem {
  itemId: string;
  title: string;
  type: "Movie" | "Episode";
  year?: number;
  downloadUrl: string;
  localPath: string;
  status: DownloadStatus;
  progress: number; // 0.0 to 1.0
  bytesDownloaded: number;
  totalBytes: number;
  /**
   * Approximate size for transcoded downloads, where the server sends no
   * Content-Length. Used only as a denominator for progress display — never for
   * the completion integrity check, which uses the real totalBytes.
   */
  expectedBytes?: number;
  /** True when `progress` is derived from `expectedBytes` rather than a real total. */
  isEstimatedTotal?: boolean;
  speedBytesPerSecond?: number;
  estimatedSecondsRemaining?: number;
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
}

export interface OfflineMediaRecord {
  itemId: string;
  title: string;
  type: "Movie" | "Episode";
  year?: number;
  overview?: string;
  localPath: string;
  fileSizeBytes: number;
  totalTicks: number;
  playbackPositionTicks: number;
  posterPath?: string;
  seriesPosterPath?: string;
  posterLocalPath?: string;
  savedAt: number;
  isPlayed?: boolean;
  completedWatchedAt?: number;
  seriesId?: string;
  seriesName?: string;
  seasonIndex?: number;
  episodeIndex?: number;
}

export interface SyncQueueEntry {
  id: string;
  itemId: string;
  positionTicks: number;
  isPlayed: boolean;
  createdAt: number;
}
