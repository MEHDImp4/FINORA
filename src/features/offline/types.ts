export type DownloadStatus =
  | "queued"
  | "downloading"
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
  error?: string;
  startedAt: number;
  completedAt?: number;
  seriesId?: string;
  seriesName?: string;
  seasonIndex?: number;
  episodeIndex?: number;
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
