import { OfflineMediaRecord } from "./types";
import { translate } from "../../i18n";

/**
 * Formats byte size into human-readable MB or GB string.
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1000) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${Math.round(mb)} MB`;
}

/**
 * Formats download speed into KB/s or MB/s.
 */
export function formatSpeed(bytesPerSec?: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return "";
  const mb = bytesPerSec / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(1)} MB/s`;
  }
  const kb = bytesPerSec / 1024;
  return `${Math.round(kb)} KB/s`;
}

/**
 * Formats estimated remaining time into a concise readable string.
 */
export function formatTimeRemaining(seconds?: number): string {
  if (!seconds || seconds <= 0) return "";
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `~${hours}h ${mins}m`;
  }
  if (seconds >= 60) {
    const mins = Math.ceil(seconds / 60);
    return `~${mins} min`;
  }
  return `~${seconds}s`;
}

/**
 * Computes an expiration label based on retention policies.
 */
export function getRetentionLabel(
  record: OfflineMediaRecord,
  t?: (key: any, params?: any) => string
): string | null {
  if (!record.completedWatchedAt && !record.isPlayed) return null;
  const translator = t || translate;

  if (!record.completedWatchedAt) {
    return translator("downloads.watchedScheduledDelete");
  }

  const elapsedMs = Date.now() - record.completedWatchedAt;
  const remainingHours = Math.max(0, 48 - Math.floor(elapsedMs / (3600 * 1000)));

  if (remainingHours >= 24) {
    const days = Math.ceil(remainingHours / 24);
    return translator("downloads.watchedExpiresInDays", { days });
  }
  if (remainingHours > 0) {
    return translator("downloads.watchedExpiresInHours", { hours: remainingHours });
  }
  return translator("downloads.watchedExpiresSoon");
}
