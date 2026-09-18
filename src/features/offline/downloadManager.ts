import { DownloadItem, DownloadStatus, OfflineMediaRecord } from "./types";
import { offlineStorageService } from "./offlineStorage";
import * as FileSystem from "expo-file-system/legacy";
import { logger } from "../../core/network/logger";
import { notificationService } from "../../core/notifications/notificationService";
import { isWifiConnected } from "../../core/network/networkStatusService";
import { usePlaybackPreferencesStore } from "../../stores/playbackPreferencesStore";
import {
  DownloadQuality,
  buildDownloadUrl,
  getDownloadHeaders,
  estimateTranscodedBytes
} from "./downloadQuality";
import { formatBytes, formatSpeed, formatTimeRemaining } from "./offlineFormatting";
import {
  DownloadAuthContext,
  DownloadIdentity,
  getDownloadAuthContext,
  matchesDownloadIdentity,
  normalizeServerUrl
} from "./downloadAuthContext";
import {
  DownloadScope,
  buildDownloadRelativePath,
  getDownloadScopeKey
} from "./downloadPaths";
import { AppState, AppStateStatus, Platform } from "react-native";
import {
  startDownloadForeground,
  stopDownloadForeground
} from "../../core/notifications/foregroundDownloadService";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** Structural subset of expo-file-system's download result we care about. */
type DownloadResultLike = { uri?: string; status?: number };

export type DownloadListener = (downloads: DownloadItem[]) => void;

export interface DownloadOptions {
  headers?: Record<string, string>;
  /** Jellyfin quality profile used to build the URL. Persisted so it can be rebuilt. */
  quality?: DownloadQuality;
  /** Non-sensitive Jellyfin identity, so the download stays bound to its server/user. */
  identity?: DownloadIdentity;
}

interface StoredDownloadTask {
  item: Omit<
    DownloadItem,
    "status" | "progress" | "bytesDownloaded" | "totalBytes" | "startedAt"
  >;
  metadata?: Partial<OfflineMediaRecord>;
  options?: DownloadOptions;
  /** Jellyfin quality profile, needed to rebuild the download URL after a restart. */
  quality?: DownloadQuality;
  /** Non-sensitive Jellyfin identity this download belongs to. */
  identity?: DownloadIdentity;
  /** True when this task was rebuilt from persisted state, so a fresh session is required. */
  restored?: boolean;
}

/**
 * Persisted snapshot of a download, stored in AsyncStorage.
 *
 * SECURITY: no credential may ever be added to this shape. Access tokens,
 * API keys, passwords, Authorization / X-Emby-Token headers and iOS
 * NSURLSession resume blobs (which embed request headers) must NOT be persisted
 * — they are re-obtained from the secure session at resume time.
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
  /** Non-sensitive: the Jellyfin quality profile used to build the request. */
  quality?: DownloadQuality;
  /** Non-sensitive: the Jellyfin server this download belongs to. */
  serverId?: string;
  /** Non-sensitive: the Jellyfin user this download belongs to. */
  userId?: string;
  /** Non-sensitive: the Jellyfin server URL this download belongs to. */
  serverUrl?: string;
  /** Non-sensitive: byte offset already present in the partial file (Android resume offset). */
  resumeOffset?: number;
  /** Non-sensitive: duration-based size estimate for transcoded downloads. */
  expectedBytes?: number;
  metadata?: Partial<OfflineMediaRecord>;
}

export const MAX_CONCURRENT_DOWNLOADS = 3;

/**
 * Legacy global keys. They are read once for migration only; every write for an
 * identified download now goes to a per-(server,user) scoped key so one account
 * can never observe another account's queue.
 */
export const DOWNLOAD_QUEUE_STORAGE_KEY = "@finora_download_queue";
export const DOWNLOAD_QUEUE_ORDER_STORAGE_KEY = "@finora_download_order";

/** Per-scope queue key, so queues are never shared between accounts. */
export function getScopedDownloadQueueKey(scope: DownloadScope): string {
  return `${DOWNLOAD_QUEUE_STORAGE_KEY}:${getDownloadScopeKey(scope)}`;
}

/** Per-scope FIFO order key. */
export function getScopedDownloadOrderKey(scope: DownloadScope): string {
  return `${DOWNLOAD_QUEUE_ORDER_STORAGE_KEY}:${getDownloadScopeKey(scope)}`;
}

/** Controlled, recoverable failure used when no usable Jellyfin session exists. */
export const AUTH_REQUIRED_ERROR = "AUTH_REQUIRED";
export const WIFI_REQUIRED_ERROR = "Connexion Wi-Fi requise (mode Wi-Fi uniquement activé)";

/**
 * Progress ticks are frequent, so persistence is throttled independently of
 * state transitions (which are always persisted immediately).
 */
const PROGRESS_PERSIST_INTERVAL_MS = 3000;
const PROGRESS_PERSIST_MIN_DELTA = 0.01;

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

  /** Byte offset the active native task is resuming from, per item. */
  private resumeOffsets: Map<string, number> = new Map();
  /** Items that already consumed their single authorization refresh + retry. */
  private authRetried: Set<string> = new Set();
  /** Items that already restarted once after a corrupt (Range-ignored) response. */
  private corruptionRestarted: Set<string> = new Set();
  /** Throttling bookkeeping for the high-frequency progress persistence path. */
  private progressPersistMarkers: Map<string, { at: number; progress: number }> = new Map();
  /** Freshly resolved secure session, refreshed on auth failure. */
  private authContext: DownloadAuthContext | null = null;
  /** Server+user the in-memory working set currently belongs to. */
  private activeScope: DownloadScope | null = null;
  private initialized = false;
  /** In-flight initialize() call, so concurrent callers share one run. */
  private initPromise: Promise<void> | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private static activeInstances: Set<DownloadManager> = new Set();

  public constructor() {
    DownloadManager.activeInstances.add(this);
  }

  public static destroyAll(): void {
    for (const inst of DownloadManager.activeInstances) {
      inst.destroy();
    }
    DownloadManager.activeInstances.clear();
  }

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
    if (typeof (this.persistDebounceTimer as any)?.unref === "function") {
      (this.persistDebounceTimer as any).unref();
    }
  }

  /**
   * Serializes and writes the current download state to AsyncStorage.
   * Completed and canceled downloads are excluded to keep storage lean.
   * Tokens are stripped from URLs before persistence.
   */
  private async persistQueue(): Promise<void> {
    try {
      const entries: PersistedDownloadEntry[] = [];

      const scope =
        this.activeScope ??
        (this.authContext
          ? { serverId: this.authContext.serverId, userId: this.authContext.userId }
          : null);
      const queueKey = scope ? getScopedDownloadQueueKey(scope) : DOWNLOAD_QUEUE_STORAGE_KEY;
      const orderKey = scope
        ? getScopedDownloadOrderKey(scope)
        : DOWNLOAD_QUEUE_ORDER_STORAGE_KEY;

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
          quality: config?.quality,
          serverId: config?.identity?.serverId ?? scope?.serverId,
          userId: config?.identity?.userId ?? scope?.userId,
          serverUrl: config?.identity?.serverUrl,
          resumeOffset: this.resumeOffsets.get(itemId),
          expectedBytes: item.expectedBytes,
          metadata: config?.metadata
        });
      }

      await AsyncStorage.setItem(queueKey, JSON.stringify(entries));
      await AsyncStorage.setItem(orderKey, JSON.stringify(this.queue.slice()));
    } catch (err: any) {
      logger.warn("[DownloadManager] Failed to persist queue:", err?.message ?? err);
    }
  }

  /**
   * Persists the current state immediately, cancelling any pending debounce.
   * Used on app background so a hard kill loses as little state as possible.
   */
  public async flushPersist(): Promise<void> {
    if (this.persistDebounceTimer) {
      clearTimeout(this.persistDebounceTimer);
      this.persistDebounceTimer = null;
    }
    await this.persistQueue();
  }

  /**
   * Cleans up all pending timers and listeners.
   */
  public destroy(): void {
    DownloadManager.activeInstances.delete(this);
    if (this.persistDebounceTimer) {
      clearTimeout(this.persistDebounceTimer);
      this.persistDebounceTimer = null;
    }
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }


  /**
   * Reads the persisted queue order (FIFO position of queued item ids).
   * Tolerant of missing/corrupt data — order then falls back to file order.
   */
  private async readPersistedQueueOrder(scope?: DownloadScope | null): Promise<string[]> {
    const keys = scope
      ? [getScopedDownloadOrderKey(scope), DOWNLOAD_QUEUE_ORDER_STORAGE_KEY]
      : [DOWNLOAD_QUEUE_ORDER_STORAGE_KEY];

    for (const key of keys) {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (typeof raw !== "string") continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((id) => typeof id === "string");
        }
      } catch {
        // Try the next key
      }
    }
    return [];
  }

  /** Parses a persisted queue payload, returning null when it is absent/corrupt. */
  private parsePersistedEntries(raw: string | null): PersistedDownloadEntry[] | null {
    if (typeof raw !== "string") return null;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as PersistedDownloadEntry[]) : null;
    } catch {
      return null;
    }
  }

  /**
   * Removes entries owned by `scope` from the legacy global queue after they
   * have been migrated to the scoped key. Entries belonging to other accounts
   * are left untouched so they can be migrated when that account signs in.
   */
  private async removeMigratedLegacyEntries(scope: DownloadScope): Promise<void> {
    try {
      const legacy = this.parsePersistedEntries(
        await AsyncStorage.getItem(DOWNLOAD_QUEUE_STORAGE_KEY)
      );
      if (!legacy) return;

      const remaining = legacy.filter(
        (entry) => !(entry.serverId === scope.serverId && entry.userId === scope.userId)
      );

      if (remaining.length === 0) {
        await AsyncStorage.removeItem(DOWNLOAD_QUEUE_STORAGE_KEY);
      } else if (remaining.length !== legacy.length) {
        await AsyncStorage.setItem(DOWNLOAD_QUEUE_STORAGE_KEY, JSON.stringify(remaining));
      }
    } catch {
      // Migration cleanup is best effort; the scoped copy is already written.
    }
  }

  /** Real size of a local file, or 0 when it is missing/unreadable. */
  private async getExistingFileSize(path: string): Promise<number> {
    if (!path || !path.startsWith("file://")) {
      logger.info(`[getExistingFileSize] SKIP path="${path}" startsWithFile=${String(path).startsWith("file://")}`);
      return 0;
    }
    try {
      const info = await FileSystem.getInfoAsync(path);
      logger.info(`[getExistingFileSize] path=${path} exists=${info.exists} hasSize=${"size" in info}`);
      if (info.exists && "size" in info) {
        const size = (info as any).size;
        return typeof size === "number" && size > 0 ? size : 0;
      }
    } catch (e: any) {
      logger.warn(`[getExistingFileSize] error for ${path.substring(path.lastIndexOf("/"))}: ${e?.message}`);
    }
    return 0;
  }

  /** Best-effort server URL derived from a token-free download URL. */
  private serverUrlFromDownloadUrl(url: string): string | undefined {
    try {
      return new URL(url).origin;
    } catch {
      return undefined;
    }
  }

  /**
   * A download belongs to a Jellyfin server AND user. Resuming it with another
   * account's token is never allowed, so the stored identity is validated
   * against the freshly restored session before anything is continued.
   */
  private isIdentityCompatible(
    config: StoredDownloadTask,
    context: DownloadAuthContext
  ): boolean {
    const identity = config.identity;
    if (!identity?.serverId || !identity?.userId || !identity?.serverUrl) {
      // FAIL CLOSED: Entry lacks serverId or userId proof — never adopt for current user.
      return false;
    }
    return matchesDownloadIdentity(identity, context);
  }

  /**
   * Case D: the file on disk is already the full media, so rather than resuming
   * anything we persist the offline catalogue record and drop the download job.
   */
  private async reconcileCompletedOnDisk(
    entry: PersistedDownloadEntry,
    size: number
  ): Promise<boolean> {
    try {
      const scope =
        entry.serverId && entry.userId
          ? { serverId: entry.serverId, userId: entry.userId }
          : undefined;

      await offlineStorageService.saveOfflineMedia(
        {
          itemId: entry.itemId,
          title: entry.title,
          type: entry.type,
          year: entry.year,
          localPath: entry.localPath,
          fileSizeBytes: size,
          totalTicks: entry.metadata?.totalTicks || 0,
          playbackPositionTicks: entry.metadata?.playbackPositionTicks || 0,
          overview: entry.metadata?.overview,
          posterPath: entry.metadata?.posterPath || entry.posterPath,
          seriesPosterPath: entry.metadata?.seriesPosterPath || entry.seriesPosterPath,
          posterLocalPath: entry.metadata?.posterLocalPath || entry.posterLocalPath,
          seriesId: entry.seriesId,
          seriesName: entry.seriesName,
          seasonIndex: entry.seasonIndex,
          episodeIndex: entry.episodeIndex,
          savedAt: Date.now()
        },
        scope
      );
      logger.info(
        `[DownloadManager] Reconciled already-complete file for ${entry.itemId} (${size} bytes).`
      );
      return true;
    } catch (err: any) {
      logger.warn(
        `[DownloadManager] Failed to reconcile complete file for ${entry.itemId}:`,
        err?.message ?? err
      );
      return false;
    }
  }

  /**
   * Attaches an AppState listener that flushes persistence when the app leaves
   * the foreground. Best effort only — Android may kill the process without any
   * callback, which is why state is also persisted continuously while running.
   */
  private attachAppStateListener(): void {
    if (this.appStateSubscription) return;
    try {
      this.appStateSubscription = AppState.addEventListener(
        "change",
        (state: AppStateStatus) => {
          if (state === "background" || state === "inactive") {
            this.flushPersist().catch(() => {});
          }
        }
      );
    } catch {
      // AppState unavailable — the debounced persistence path still applies
    }
  }

  /**
   * Restores downloads from AsyncStorage after an app restart and reconciles
   * the persisted metadata against the files that actually exist on disk.
   *
   * Status routing preserves user intent:
   *  - `downloading` / `queued` were active before the kill → requeued, in their
   *    original order, so `initialize()` can continue them.
   *  - `paused` stays paused — a deliberate pause is never auto-restarted.
   *  - `failed` stays failed so the user retries explicitly.
   *  - `completed` / `canceled` are not restored (no pending work).
   *
   * This method never starts network work — `initialize()` does, once it has a
   * fresh secure session. Tokens are never read from storage.
   */
  public async restorePersistedDownloads(scope?: DownloadScope): Promise<void> {
    try {
      const effectiveScope = scope ?? this.activeScope ?? undefined;
      const scopedKey = effectiveScope ? getScopedDownloadQueueKey(effectiveScope) : null;

      let entries: PersistedDownloadEntry[] | null = null;
      let usedLegacyKey = false;

      if (scopedKey) {
        entries = this.parsePersistedEntries(await AsyncStorage.getItem(scopedKey));
      }

      if (!entries || entries.length === 0) {
        entries =
          this.parsePersistedEntries(await AsyncStorage.getItem(DOWNLOAD_QUEUE_STORAGE_KEY)) ?? [];
        usedLegacyKey = true;

        // A legacy/global entry may only be adopted when it proves it belongs to
        // the active server AND user. Anything else fails closed and is ignored,
        // so another account's queue is never loaded into this session.
        if (effectiveScope) {
          entries = entries.filter(
            (entry) =>
              entry.serverId === effectiveScope.serverId &&
              entry.userId === effectiveScope.userId
          );
        }
      }

      if (entries.length === 0) return;

      if (effectiveScope) this.activeScope = effectiveScope;

      const persistedOrder = await this.readPersistedQueueOrder(effectiveScope ?? null);
      let restoredCount = 0;

      for (const entry of entries) {
        if (!entry.itemId || !entry.title) continue;

        // Skip already-tracked downloads (avoid duplicates if restore runs twice)
        if (this.downloads.has(entry.itemId)) continue;

        // Completed / canceled carry no pending work
        if (entry.status === "completed" || entry.status === "canceled") continue;

        const fileSizeBytes = await this.getExistingFileSize(entry.localPath);

        logger.info(
          `[DownloadManager] Restore ${entry.itemId}: ` +
          `fileSize=${fileSizeBytes}, persistedBytes=${entry.bytesDownloaded}, ` +
          `persistedStatus=${entry.status}, hasFile=${fileSizeBytes > 0}`
        );

        // Case D — already fully downloaded on disk
        if (entry.totalBytes > 0 && fileSizeBytes >= entry.totalBytes) {
          const reconciled = await this.reconcileCompletedOnDisk(entry, fileSizeBytes);
          if (reconciled) {
            continue;
          }
          // Failed to save in catalog — keep item in failed state so it is not lost
          entry.status = "failed";
          entry.error = "Échec de l'enregistrement dans le catalogue hors-ligne";
        }

        // Case B — metadata claims progress but nothing is on disk. Never show a
        // fake percentage: reset the counters so the restart is honest.
        // Case A — a real partial file exists, so reconcile the byte counters
        // against it rather than trusting the last persisted sample.
        const hasPartialFile = fileSizeBytes > 0;
        const bytesDownloaded = hasPartialFile
          ? Math.max(entry.bytesDownloaded, fileSizeBytes)
          : 0;

        let restoredStatus: DownloadStatus;
        if (entry.status === "downloading" || entry.status === "queued" || entry.status === "finalizing") {
          // Genuinely active before the kill → requeue for continuation.
          restoredStatus = "queued";
        } else {
          // paused / failed — restore as-is
          restoredStatus = entry.status;
        }

        const restoredDenominator =
          entry.totalBytes > 0 ? entry.totalBytes : entry.expectedBytes ?? 0;
        const restoredProgress =
          restoredDenominator > 0
            ? Math.min(1, bytesDownloaded / restoredDenominator)
            : hasPartialFile
              ? entry.progress
              : 0;

        const restoredItem: DownloadItem = {
          itemId: entry.itemId,
          title: entry.title,
          type: entry.type,
          year: entry.year,
          downloadUrl: entry.downloadUrl, // Token-free URL — re-authenticated on resume
          localPath: entry.localPath,
          status: restoredStatus,
          progress: restoredProgress,
          bytesDownloaded,
          totalBytes: entry.totalBytes,
          expectedBytes: entry.expectedBytes,
          isEstimatedTotal: entry.totalBytes === 0 && (entry.expectedBytes ?? 0) > 0,
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

        // Rebuild the config so an authenticated request can be reconstructed.
        // No headers are restored — they come from the secure session instead.
        const restoredServerUrl =
          entry.serverUrl || this.serverUrlFromDownloadUrl(entry.downloadUrl);

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
          metadata: entry.metadata,
          quality: entry.quality,
          identity:
            entry.serverId && entry.userId && restoredServerUrl
              ? {
                  serverId: entry.serverId,
                  userId: entry.userId,
                  serverUrl: restoredServerUrl
                }
              : undefined,
          restored: true
        });

        if (hasPartialFile) {
          this.resumeOffsets.set(entry.itemId, bytesDownloaded);
        }

        restoredCount++;
      }

      // Restore the FIFO order so queue position survives a process death.
      if (restoredCount > 0) {
        const queuedIds = Array.from(this.downloads.values())
          .filter((d) => d.status === "queued")
          .map((d) => d.itemId);

        const ordered: string[] = [];
        for (const id of persistedOrder) {
          if (queuedIds.includes(id) && !ordered.includes(id)) ordered.push(id);
        }
        for (const id of queuedIds) {
          if (!ordered.includes(id)) ordered.push(id);
        }
        this.queue = ordered;

        logger.info(
          `[DownloadManager] Restored ${restoredCount} download(s) from persistent storage.`
        );

        if (usedLegacyKey && effectiveScope) {
          // Persist the migrated entries to the scoped key and remove only this
          // account's entries from the legacy global queue.
          await this.persistQueue();
          await this.removeMigratedLegacyEntries(effectiveScope);
        }

        this.notify();
      }
    } catch (err: any) {
      logger.warn("[DownloadManager] Failed to restore persisted downloads:", err?.message ?? err);
    }
  }

  /**
   * Boot-time entry point. Restores persisted downloads, reconciles them against
   * the real files on disk, re-obtains a FRESH Jellyfin session from SecureStore
   * (the Zustand store may still be empty right after a process death), then
   * continues only the downloads that were genuinely active before the kill.
   *
   * Restored items are requeued and promoted through `processQueue()` so the
   * MAX_CONCURRENT_DOWNLOADS cap is enforced by the existing scheduler.
   */
  public initialize(): Promise<void> {
    if (this.initialized) return Promise.resolve();
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInitialize().finally(() => {
      this.initPromise = null;
    });
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    if (this.initialized) return;

    const context = await getDownloadAuthContext();
    this.authContext = context;
    this.activeScope = context
      ? { serverId: context.serverId, userId: context.userId }
      : null;

    await this.restorePersistedDownloads(this.activeScope ?? undefined);

    const wifiOnly = usePlaybackPreferencesStore.getState().preferences.downloadWifiOnly;
    logger.info(
      `[DownloadManager] initialize(): auth=${context ? "ok" : "null"}, ` +
      `scope=${this.activeScope ? getDownloadScopeKey(this.activeScope) : "none"}, ` +
      `wifiOnly=${wifiOnly}, tracked=${this.downloads.size}`
    );

    const onWifi = wifiOnly ? await isWifiConnected() : true;

    for (const item of this.downloads.values()) {
      if (item.status !== "queued") continue;

      // Wi-Fi-only preference with no Wi-Fi: stay queued rather than failing.
      if (!onWifi) continue;

      const config = this.downloadConfigs.get(item.itemId);
      if (!context || !config || !this.isIdentityCompatible(config, context)) {
        // Keep the partial file and metadata; the user can resume after signing
        // back into the same server.
        item.status = "paused";
        item.error = AUTH_REQUIRED_ERROR;
        this.queue = this.queue.filter((id) => id !== item.itemId);
      }
    }

    // Mark as initialized ONLY after all async work completes successfully.
    // If getDownloadAuthContext() or restorePersistedDownloads() throws,
    // the next call to initialize() will retry instead of being a silent no-op.
    this.initialized = true;

    this.schedulePersist();
    this.notify();
    this.processQueue();
    this.attachAppStateListener();
    this.syncForegroundService();

    logger.info(`[DownloadManager] Initialized (${this.downloads.size} tracked download(s)).`);
  }

  /**
   * Called when the authenticated identity is about to change or end (logout,
   * account switch, account/server removal).
   *
   * Stops every in-flight transfer, persists the previous scope's work as
   * `paused` to ITS OWN scoped queue, then drops all in-memory state and the
   * cached session. After this call no request can be issued with the previous
   * account's token, and the next account can never observe the previous one's
   * downloads.
   */
  public async handleIdentityChange(): Promise<void> {
    // Let any in-flight initialization settle first, otherwise it could repopulate
    // the old scope after we have cleared it.
    if (this.initPromise) {
      await this.initPromise.catch(() => {});
    }

    // Persist the outgoing scope's queue before clearing anything.
    for (const item of this.downloads.values()) {
      if (
        item.status === "downloading" ||
        item.status === "queued" ||
        item.status === "finalizing"
      ) {
        item.status = "paused";
      }
    }
    this.queue = [];

    await this.flushPersist().catch(() => {});

    // Stop native transfers so no further bytes are written or requested.
    const tasks = Array.from(this.activeTasks.values());
    this.activeTasks.clear();
    for (const task of tasks) {
      try {
        if (task && typeof task.cancelAsync === "function") {
          await task.cancelAsync();
        }
      } catch {
        // Non-fatal — the in-memory state is cleared regardless.
      }
    }

    this.downloads.clear();
    this.downloadConfigs.clear();
    this.resumeOffsets.clear();
    this.authRetried.clear();
    this.corruptionRestarted.clear();
    this.speedTrackers.clear();
    this.progressPersistMarkers.clear();
    this.authContext = null;
    this.activeScope = null;
    this.initialized = false;
    this.initPromise = null;

    this.notify();
    await stopDownloadForeground().catch(() => {});
  }

  /**
   * Returns the set of local file paths actively tracked by the download manager,
   * so that orphan cleanup does not delete partial files that are still being
   * downloaded or queued for download.
   */
  public getTrackedLocalPaths(): string[] {
    return Array.from(this.downloads.values())
      .map((d) => d.localPath)
      .filter((p): p is string => Boolean(p));
  }

  /**
   * Keeps the foreground service in sync with the current download state and
   * refreshes the notification content: progress, speed, transferred bytes, ETA.
   */
  private async syncForegroundService(): Promise<void> {
    try {
      const active = Array.from(this.downloads.values()).filter(
        (d) => d.status === "downloading"
      );

      if (active.length === 0) {
        await stopDownloadForeground();
        return;
      }

      const primary = active[0];
      const hasTotal = primary.totalBytes > 0 || (primary.expectedBytes ?? 0) > 0;
      const percent = Math.round(primary.progress * 100);
      const percentLabel = primary.isEstimatedTotal ? `~${percent} %` : `${percent} %`;

      const details: string[] = [];
      if (hasTotal) details.push(percentLabel);
      if (primary.totalBytes > 0) {
        details.push(
          `${formatBytes(primary.bytesDownloaded)} / ${formatBytes(primary.totalBytes)}`
        );
      } else if (primary.expectedBytes) {
        details.push(
          `${formatBytes(primary.bytesDownloaded)} / ~${formatBytes(primary.expectedBytes)}`
        );
      } else {
        details.push(formatBytes(primary.bytesDownloaded));
      }
      const speed = formatSpeed(primary.speedBytesPerSecond);
      if (speed) details.push(speed);
      const eta = formatTimeRemaining(primary.estimatedSecondsRemaining);
      if (eta) details.push(eta);

      const isMultiple = active.length > 1;
      const title = isMultiple ? `${active.length} téléchargements` : primary.title;
      const description = isMultiple
        ? `${primary.title} — ${details.join(" · ")}`
        : details.join(" · ");

      // Unknown total with no estimate → indeterminate bar, never a fake 0 %.
      await startDownloadForeground(title, description, hasTotal ? percent : undefined);
    } catch {
      // Non-fatal — downloads work without the foreground service
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

  public getActiveScope(): DownloadScope | null {
    return this.activeScope;
  }

  public async startDownload(
    item: Omit<
      DownloadItem,
      "status" | "progress" | "bytesDownloaded" | "totalBytes" | "startedAt"
    >,
    metadata?: Partial<OfflineMediaRecord>,
    options?: DownloadOptions
  ): Promise<DownloadItem> {
    const identityScope: DownloadScope | null = options?.identity
      ? { serverId: options.identity.serverId, userId: options.identity.userId }
      : null;

    if (identityScope) {
      this.activeScope = identityScope;
      if (
        this.authContext &&
        (this.authContext.serverId !== identityScope.serverId ||
          this.authContext.userId !== identityScope.userId)
      ) {
        // The cached session belongs to a different account — never reuse it.
        this.authContext = null;
      }
    }

    this.downloadConfigs.set(item.itemId, {
      item,
      metadata,
      options,
      quality: options?.quality,
      identity: options?.identity
    });

    const existing = this.downloads.get(item.itemId);
    if (existing && (existing.status === "downloading" || existing.status === "queued")) {
      return existing;
    }

    let localPath = item.localPath;
    if (!localPath || !localPath.includes("://")) {
      if (FileSystem.documentDirectory) {
        const pathScope = identityScope ?? this.activeScope;
        const absolute = `${FileSystem.documentDirectory}${buildDownloadRelativePath(
          pathScope,
          item.itemId
        )}`;
        const directory = absolute.substring(0, absolute.lastIndexOf("/") + 1);
        try {
          await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
          localPath = absolute;
        } catch {
          // Fallback to provided path
        }
      }
    }

    if (typeof FileSystem.createDownloadResumable !== "function") {
      const errorMsg = "Moteur de téléchargement non disponible";
      logger.error(`[DownloadManager] FileSystem.createDownloadResumable is not available for ${item.itemId}`);
      const downloadItem: DownloadItem = {
        ...item,
        localPath: localPath || item.localPath || "",
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
      this.processQueue();
      return downloadItem;
    }

    if (!localPath || !localPath.startsWith("file://")) {
      const errorMsg = "Chemin de destination local invalide";
      logger.error(`[DownloadManager] Invalid localPath for ${item.itemId}: "${localPath}"`);
      const downloadItem: DownloadItem = {
        ...item,
        localPath: localPath || item.localPath || "",
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
      this.processQueue();
      return downloadItem;
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

    // Transcode responses carry no Content-Length, so progress needs an estimate
    // derived from the media duration and the profile's target bitrate.
    const expectedBytes = estimateTranscodedBytes(
      options?.quality ?? "original",
      metadata?.totalTicks
    );

    const downloadItem: DownloadItem = {
      ...item,
      localPath,
      status: shouldQueue ? "queued" : "downloading",
      progress: 0,
      bytesDownloaded: 0,
      totalBytes: 0,
      expectedBytes,
      isEstimatedTotal: false,
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

  /**
   * Resolves the URL + headers used for a transfer.
   *
   * Fresh user-initiated downloads reuse the caller-provided headers. Restored
   * downloads deliberately hold no headers — they are rebuilt here from the
   * persisted metadata plus a FRESH session read from SecureStore. Tokens are
   * never read from persisted storage.
   *
   * Returns null when the download cannot be authenticated.
   */
  private async resolveRequest(
    itemId: string
  ): Promise<{ url: string; headers: Record<string, string> } | null> {
    const config = this.downloadConfigs.get(itemId);
    const item = this.downloads.get(itemId);
    if (!config || !item) return null;

    const providedHeaders = config.options?.headers;
    if (providedHeaders && Object.keys(providedHeaders).length > 0) {
      return { url: item.downloadUrl, headers: providedHeaders };
    }

    const context = this.authContext || (this.authContext = await getDownloadAuthContext());

    if (!context) {
      // A restored download cannot be authenticated without a session. A fresh
      // download that simply omitted headers keeps its caller-provided URL.
      return config.restored ? null : { url: item.downloadUrl, headers: {} };
    }

    if (config.identity && !this.isIdentityCompatible(config, context)) {
      // Belongs to another server/account — never resume it with these credentials.
      return null;
    }

    const url = config.quality
      ? buildDownloadUrl(context.serverUrl, item.itemId, context.accessToken, config.quality)
      : item.downloadUrl;

    return { url, headers: getDownloadHeaders(context.accessToken) };
  }

  /**
   * Byte offset to continue from.
   *
   * On Android the native layer turns `resumeData` into `Range: bytes=N-` and
   * opens the destination in append mode, so the offset is simply the current
   * partial file size. On iOS `resumeData` is an opaque NSURLSession blob that
   * embeds the original request headers (i.e. the access token), so it is never
   * persisted — a partial file with no live in-memory task is restarted instead.
   */
  private resolveResumeOffset(partialBytes: number, totalBytes: number): number {
    if (partialBytes <= 0) return 0;
    if (totalBytes > 0 && partialBytes >= totalBytes) return 0;
    return Platform.OS === "android" ? partialBytes : 0;
  }

  /**
   * Discards a partial file and restarts the transfer from byte 0 exactly once,
   * so a source that ignores HTTP Range can never leave a concatenated file behind.
   */
  private async restartFromZero(
    itemId: string,
    localPath: string,
    reason: string
  ): Promise<void> {
    const item = this.downloads.get(itemId);
    if (!item) return;

    if (this.corruptionRestarted.has(itemId)) {
      // Only one automatic restart — never loop against a source without Range support.
      logger.error(`[DownloadManager] Restart already attempted for ${itemId} (${reason}).`);
      this.markFailed(itemId, reason);
      return;
    }
    this.corruptionRestarted.add(itemId);

    await FileSystem.deleteAsync(localPath, { idempotent: true }).catch(() => {});
    if (item.localPath !== localPath) {
      await FileSystem.deleteAsync(item.localPath, { idempotent: true }).catch(() => {});
    }

    this.resumeOffsets.set(itemId, 0);
    item.bytesDownloaded = 0;
    item.totalBytes = 0;
    item.progress = 0;
    item.status = "downloading";
    item.error = undefined;
    this.schedulePersist();
    this.notify();

    this.executeDownload(itemId);
  }

  /**
   * Applies the HTTP outcome of a transfer and enforces the resume safety rules.
   */
  private async handleDownloadResult(
    itemId: string,
    localPath: string,
    result: DownloadResultLike,
    metadata?: Partial<OfflineMediaRecord>
  ): Promise<void> {
    const downloadItem = this.downloads.get(itemId);
    if (!downloadItem) return;

    const status = result.status ?? 0;
    const resumeOffset = this.resumeOffsets.get(itemId) ?? 0;

    logger.info(
      `[DownloadManager] Result ${itemId}: HTTP ${status}, ` +
      `resumeOffset=${resumeOffset}, uri=${result.uri ? "present" : "absent"}`
    );

    // Bounded authorization recovery: refresh once, rebuild the request from the
    // fresh session, retry once, never loop.
    if ((status === 401 || status === 403) && !this.authRetried.has(itemId)) {
      this.authRetried.add(itemId);
      logger.warn(`[DownloadManager] HTTP ${status} for ${itemId} — refreshing session once.`);

      // Drop any caller-supplied headers (now stale) so resolveRequest rebuilds
      // the request from the refreshed secure session instead of resending the
      // token that was just rejected.
      const config = this.downloadConfigs.get(itemId);
      if (config) {
        config.options = config.options
          ? { ...config.options, headers: undefined }
          : config.options;
        config.restored = true;
      }

      this.authContext = await getDownloadAuthContext();
      this.executeDownload(itemId);
      return;
    }

    // 416 — requested range not satisfiable: either the file is already whole,
    // or the recorded offset is stale and the transfer must start over.
    if (status === 416) {
      const size = await this.getExistingFileSize(localPath);
      if (downloadItem.totalBytes > 0 && size >= downloadItem.totalBytes) {
        await this.completeDownload(itemId, size, { ...metadata, localPath });
        return;
      }
      await this.restartFromZero(itemId, localPath, "Plage HTTP non satisfiable");
      return;
    }

    // We asked to continue from an offset but the server returned the FULL body.
    // The native layer appends on resume, so the file is now corrupt.
    if (resumeOffset > 0 && status === 200) {
      logger.warn(
        `[DownloadManager] Source ignored Range for ${itemId} — discarding corrupt partial file.`
      );
      await this.restartFromZero(itemId, localPath, "Reprise non supportée par la source");
      return;
    }

    if (status >= 400) {
      // Keep the partial file: authorization and network failures are recoverable.
      logger.error(`[DownloadManager] HTTP ${status} while downloading ${itemId}.`);
      this.markFailed(itemId, `Erreur HTTP ${status} lors du téléchargement`);
      return;
    }

    if (!result.uri) return;

    // Integrity check — never mark a file complete that is missing or short.
    const finalSize = await this.getExistingFileSize(result.uri);
    const expectedSize = downloadItem.totalBytes;
    if (finalSize <= 0 || (expectedSize > 0 && finalSize < expectedSize)) {
      logger.error(
        `[DownloadManager] Incomplete file for ${itemId} (${finalSize}/${expectedSize} bytes).`
      );
      this.markFailed(itemId, "Fichier téléchargé incomplet");
      return;
    }

    logger.info(`[DownloadManager] Download complete: ${downloadItem.title} (${finalSize} bytes)`);
    await this.completeDownload(itemId, finalSize, { ...metadata, localPath: result.uri });
  }

  private async executeDownload(itemId: string): Promise<void> {
    const downloadItem = this.downloads.get(itemId);
    const config = this.downloadConfigs.get(itemId);
    if (!downloadItem || !config) return;

    const wifiOnly = usePlaybackPreferencesStore.getState().preferences.downloadWifiOnly;
    if (wifiOnly) {
      const isWifi = await isWifiConnected();
      if (!isWifi) {
        logger.warn(`[DownloadManager] Execution halted for ${downloadItem.title}: ${WIFI_REQUIRED_ERROR}`);
        this.markFailed(itemId, WIFI_REQUIRED_ERROR);
        return;
      }
    }

    const { item, metadata } = config;
    const localPath = downloadItem.localPath;

    if (typeof FileSystem.createDownloadResumable !== "function") {
      logger.error(`[DownloadManager] FileSystem.createDownloadResumable is not available for ${itemId}`);
      this.failDownload(itemId, "Moteur de téléchargement non disponible");
      return;
    }

    if (!localPath || !localPath.startsWith("file://")) {
      logger.error(`[DownloadManager] Invalid localPath for ${itemId}: "${localPath}"`);
      this.failDownload(itemId, "Chemin de destination local invalide");
      return;
    }

    const request = await this.resolveRequest(itemId);
    if (!request) {
      // No usable Jellyfin session: keep the partial file and metadata so the
      // download can resume after signing back into the same server.
      logger.warn(`[DownloadManager] No usable session for ${item.itemId} — pausing until re-auth.`);
      this.markAuthRequired(itemId);
      return;
    }

    logger.info(`[DownloadManager] Executing download: ${item.title} -> ${localPath}`);

    try {
      // Reconcile against the real partial file before starting.
      const partialBytes = await this.getExistingFileSize(localPath);

      logger.info(
        `[DownloadManager] Resume check ${itemId}: partialBytes=${partialBytes}, ` +
        `totalBytes=${downloadItem.totalBytes}, platform=${Platform.OS}`
      );

      if (downloadItem.totalBytes > 0 && partialBytes >= downloadItem.totalBytes) {
        // The file on disk is already complete — no transfer needed.
        await this.completeDownload(item.itemId, partialBytes, { ...metadata, localPath });
        return;
      }

      const resumeOffset = this.resolveResumeOffset(partialBytes, downloadItem.totalBytes);
      logger.info(
        `[DownloadManager] resumeOffset=${resumeOffset} for ${itemId} ` +
        `(will pass resumeData=${resumeOffset > 0 ? String(resumeOffset) : "none"})`
      );

      if (resumeOffset === 0 && partialBytes > 0 && Platform.OS !== "android") {
        // Cannot safely continue this partial file without persisting credentials.
        logger.info(
          `[DownloadManager] Discarding partial file for ${item.itemId} (resume unsupported on this platform).`
        );
        await FileSystem.deleteAsync(localPath, { idempotent: true }).catch(() => {});
        downloadItem.bytesDownloaded = 0;
        downloadItem.progress = 0;
      }

      const downloadResumable = FileSystem.createDownloadResumable(
        request.url,
        localPath,
        { headers: request.headers },
        (progressData) => {
          this.updateProgress(
            item.itemId,
            progressData.totalBytesWritten,
            progressData.totalBytesExpectedToWrite
          );
        },
        resumeOffset > 0 ? String(resumeOffset) : undefined
      );

      this.resumeOffsets.set(item.itemId, resumeOffset);
      this.activeTasks.set(item.itemId, downloadResumable);
      this.syncForegroundService();

      // Execute download in background
      downloadResumable
        .downloadAsync()
        .then(async (result) => {
          this.activeTasks.delete(item.itemId);
          if (result) {
            await this.handleDownloadResult(item.itemId, localPath, result, metadata);
          }
        })
        .catch((err) => {
          this.activeTasks.delete(item.itemId);
          logger.error(`[DownloadManager] Download error for ${item.itemId}:`, err?.message || err);
          // Keep the partial file so a retry can genuinely resume it.
          this.markFailed(item.itemId, err?.message || "Échec du téléchargement");
        });
    } catch (err: any) {
      this.activeTasks.delete(item.itemId);
      logger.error(`[DownloadManager] Initialization error for ${item.itemId}:`, err?.message || err);
      this.markFailed(item.itemId, err?.message || "Erreur d'initialisation du téléchargement");
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
      // A manual retry gets a fresh authorization and restart budget.
      this.authRetried.delete(itemId);
      this.corruptionRestarted.delete(itemId);
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

    // Jellyfin sends no Content-Length for transcode responses. Fall back to the
    // duration-based estimate for DISPLAY only — the real total stays
    // authoritative for the completion and integrity checks below.
    const realTotal = totalBytes > 0 ? totalBytes : 0;
    const estimatedTotal =
      item.expectedBytes && item.expectedBytes > 0 ? item.expectedBytes : 0;
    const displayTotal = realTotal > 0 ? realTotal : estimatedTotal;

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

          if (displayTotal > bytesDownloaded && smoothedSpeed > 1024) {
            item.estimatedSecondsRemaining = Math.round(
              (displayTotal - bytesDownloaded) / smoothedSpeed
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
    item.totalBytes = realTotal;
    item.isEstimatedTotal = realTotal === 0 && estimatedTotal > 0;
    item.progress =
      displayTotal > 0 ? Math.min(1, bytesDownloaded / displayTotal) : 0;

    if (bytesDownloaded >= totalBytes && totalBytes > 0) {
      item.status = "completed";
      item.completedAt = Date.now();
      this.speedTrackers.delete(itemId);
      // A state transition is always persisted immediately.
      this.schedulePersist();
      this.notify();
      return;
    }

    // Progress ticks are throttled — writing on every tick would hammer storage
    // during a multi-gigabyte transfer. Resume relies on the real file size anyway.
    const marker = this.progressPersistMarkers.get(itemId);
    const progressPersistDue =
      !marker ||
      now - marker.at >= PROGRESS_PERSIST_INTERVAL_MS ||
      Math.abs(item.progress - marker.progress) >= PROGRESS_PERSIST_MIN_DELTA;

    if (progressPersistDue) {
      this.progressPersistMarkers.set(itemId, { at: now, progress: item.progress });
      this.schedulePersist();
      // Refresh the foreground notification on the same throttle.
      this.syncForegroundService();
    }

    this.notify();
  }

  public async pauseDownload(itemId: string): Promise<void> {
    const item = this.downloads.get(itemId);
    if (!item || item.status !== "downloading") return;

    this.speedTrackers.delete(itemId);
    this.progressPersistMarkers.delete(itemId);
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
    this.syncForegroundService();
  }

  public async resumeDownload(itemId: string): Promise<void> {
    const item = this.downloads.get(itemId);
    if (!item || item.status !== "paused") return;

    const wifiOnly = usePlaybackPreferencesStore.getState().preferences.downloadWifiOnly;
    if (wifiOnly) {
      const isWifi = await isWifiConnected();
      if (!isWifi) {
        this.markFailed(itemId, WIFI_REQUIRED_ERROR);
        return;
      }
    }

    // A manual resume is a fresh attempt: the user may have just re-authenticated.
    this.authRetried.delete(itemId);
    this.corruptionRestarted.delete(itemId);

    const activeCount = Array.from(this.downloads.values()).filter(
      (d) => d.status === "downloading"
    ).length;

    if (activeCount < MAX_CONCURRENT_DOWNLOADS) {
      item.status = "downloading";
      item.error = undefined;
      const task = this.activeTasks.get(itemId);
      if (task && typeof task.resumeAsync === "function") {
        try {
          task.resumeAsync().catch(() => {});
        } catch {
          // Safe execution
        }
      } else {
        // No live task after a process death — rebuild it from the partial file.
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
    this.progressPersistMarkers.delete(itemId);
    this.resumeOffsets.delete(itemId);
    this.authRetried.delete(itemId);
    this.corruptionRestarted.delete(itemId);
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
    this.syncForegroundService();
  }

  public markCompleted(itemId: string, totalBytes: number): void {
    const item = this.downloads.get(itemId);
    if (!item) return;

    this.activeTasks.delete(itemId);
    this.speedTrackers.delete(itemId);
    this.progressPersistMarkers.delete(itemId);
    item.speedBytesPerSecond = undefined;
    item.estimatedSecondsRemaining = undefined;
    item.status = "completed";
    item.progress = 1.0;
    item.bytesDownloaded = totalBytes;
    item.totalBytes = totalBytes;
    item.completedAt = Date.now();
    this.schedulePersist();
    this.notify();
    this.syncForegroundService();
  }

  public async completeDownload(
    itemId: string,
    totalBytes: number,
    metadata?: Partial<OfflineMediaRecord>
  ): Promise<void> {
    const item = this.downloads.get(itemId);
    if (!item) return;

    // 1. Transition: DOWNLOADING -> FINALIZING
    this.activeTasks.delete(itemId);
    this.speedTrackers.delete(itemId);
    this.progressPersistMarkers.delete(itemId);
    item.speedBytesPerSecond = undefined;
    item.estimatedSecondsRemaining = undefined;
    item.status = "finalizing";
    item.progress = 1.0;
    item.bytesDownloaded = totalBytes;
    item.totalBytes = totalBytes;

    // Persist immediately in finalizing state to protect crash window
    this.schedulePersist();
    this.notify();
    this.syncForegroundService();

    // 2. Validation du fichier sur disque
    const finalLocalPath = metadata?.localPath || item.localPath;
    item.localPath = finalLocalPath;

    let finalSize = 0;
    try {
      finalSize = await this.getExistingFileSize(finalLocalPath);
    } catch (e: any) {
      logger.warn(`[DownloadManager] Error checking file size during finalization for ${itemId}:`, e?.message || e);
    }

    if (finalSize <= 0 && totalBytes > 0) {
      logger.error(`[DownloadManager] File missing or empty on disk during finalization for ${itemId}`);
      this.failDownload(itemId, "Fichier téléchargé introuvable ou corrompu sur le disque");
      return;
    }

    const verifiedSize = finalSize > 0 ? finalSize : totalBytes;

    // 3. Persistence du catalogue offline
    const record: OfflineMediaRecord = {
      itemId: item.itemId,
      title: item.title,
      type: item.type,
      year: item.year,
      localPath: finalLocalPath,
      fileSizeBytes: verifiedSize,
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

    const configIdentity = this.downloadConfigs.get(itemId)?.identity;
    const offlineScope = configIdentity
      ? { serverId: configIdentity.serverId, userId: configIdentity.userId }
      : this.activeScope ?? undefined;

    try {
      await offlineStorageService.saveOfflineMedia(record, offlineScope);
    } catch (err: any) {
      logger.error(
        `[DownloadManager] Failed to save offline media for ${itemId}:`,
        err?.message || err
      );
      this.failDownload(
        itemId,
        `Échec de l'enregistrement dans le catalogue hors-ligne: ${err?.message || err}`
      );
      return;
    }

    // 4. Completed: mark completed only after persistent catalog save is guaranteed
    this.markCompleted(itemId, verifiedSize);

    // 5. Notify user of completed download
    notificationService.notifyDownloadComplete(item.title, item.itemId, item.type).catch(() => {});

    // 6. Retrait de la queue & promotion suivante
    this.schedulePersist();
    this.notify();
    this.processQueue();
    this.syncForegroundService();
  }

  /**
   * Explicitly fails a download, cancels any native task, cleans up references,
   * persists state, notifies observers, updates foreground service, and frees the slot.
   */
  public failDownload(itemId: string, error: string): void {
    const task = this.activeTasks.get(itemId);
    if (task && typeof task.cancelAsync === "function") {
      try {
        task.cancelAsync().catch(() => {});
      } catch {
        // Safe execution
      }
    }
    this.activeTasks.delete(itemId);
    this.markFailed(itemId, error);
  }

  public markFailed(itemId: string, error: string): void {
    const item = this.downloads.get(itemId);
    if (!item) return;

    this.activeTasks.delete(itemId);
    this.speedTrackers.delete(itemId);
    this.progressPersistMarkers.delete(itemId);
    item.speedBytesPerSecond = undefined;
    item.estimatedSecondsRemaining = undefined;
    item.status = "failed";
    item.error = error;
    // The partial file and its resume offset are deliberately kept so a later
    // retry can continue the transfer instead of starting over.
    this.schedulePersist();
    this.notify();
    this.processQueue();
    this.syncForegroundService();
  }

  /**
   * Parks a download that cannot be authenticated. The partial file and the
   * metadata stay intact so it can resume after signing back into the server.
   */
  private markAuthRequired(itemId: string): void {
    const item = this.downloads.get(itemId);
    if (!item) return;

    this.speedTrackers.delete(itemId);
    this.progressPersistMarkers.delete(itemId);
    item.speedBytesPerSecond = undefined;
    item.estimatedSecondsRemaining = undefined;
    item.status = "paused";
    item.error = AUTH_REQUIRED_ERROR;
    this.schedulePersist();
    this.notify();
    this.processQueue();
    this.syncForegroundService();
  }
}

export const downloadManager = new DownloadManager();
