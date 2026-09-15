import { useEffect, useRef, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../../stores/authStore";
import { useNotificationStore } from "../../stores/notificationStore";
import { mediaRepository } from "../../core/repositories/mediaRepository";
import { notificationService } from "../../core/notifications/notificationService";
import { getMediaPosterUrl } from "../../core/repositories/imageUrlBuilder";
import { jellyfinClient } from "../../core/jellyfin/jellyfinClient";
import { MediaItem } from "../../types/media";
import { logger } from "../../core/network/logger";

/** Legacy unscoped key kept only so upgrades can delete it safely. */
export const STORAGE_KEY_KNOWN_MEDIA = "@finora_known_media_ids";
const STORAGE_KEY_KNOWN_MEDIA_PREFIX = "@finora_known_media_ids_v2";
const MAX_KNOWN_IDS = 500;
const SYNC_COOLDOWN_MS = 60000;

export function getKnownMediaStorageKey(serverId: string, userId: string): string {
  return `${STORAGE_KEY_KNOWN_MEDIA_PREFIX}:${encodeURIComponent(serverId)}:${encodeURIComponent(userId)}`;
}

/**
 * Checks Jellyfin recent media additions against known items.
 * Discovery state is isolated per Jellyfin server + user so switching accounts
 * cannot suppress or leak notifications across servers.
 */
export async function syncNewMediaNotifications(
  userId: string,
  explicitServerId?: string
): Promise<void> {
  const { preferences } = useNotificationStore.getState();
  if (!preferences.enabled) return;

  const authSession =
    typeof useAuthStore.getState === "function" ? useAuthStore.getState()?.session : null;
  const serverUrl = jellyfinClient.getServerUrl() || authSession?.serverUrl || "";
  const serverId = explicitServerId || authSession?.serverId || serverUrl;

  if (!serverId) {
    logger.warn("[NotificationSync] Skipped: cannot determine active server scope.");
    return;
  }

  const storageKey = getKnownMediaStorageKey(serverId, userId);

  try {
    const [rawKnown, legacyKnown] = await Promise.all([
      AsyncStorage.getItem(storageKey),
      AsyncStorage.getItem(STORAGE_KEY_KNOWN_MEDIA)
    ]);

    // Never migrate a global baseline to the current account because it may have
    // been created by another server/user. Delete it and seed this account cleanly.
    if (legacyKnown !== null) {
      await AsyncStorage.removeItem(STORAGE_KEY_KNOWN_MEDIA).catch(() => {});
    }

    let knownSet = new Set<string>();
    let isFirstRun = false;

    if (rawKnown) {
      try {
        const parsed = JSON.parse(rawKnown);
        if (Array.isArray(parsed)) {
          knownSet = new Set(parsed.filter((id): id is string => typeof id === "string"));
        }
      } catch {
        knownSet = new Set();
      }
    } else {
      isFirstRun = true;
    }

    const [recentItems, resumeItems] = await Promise.all([
      mediaRepository.getRecentlyAdded(userId, undefined, 30).catch(() => [] as MediaItem[]),
      mediaRepository.getResumeItems(userId, 20).catch(() => [] as MediaItem[])
    ]);

    if (!recentItems || recentItems.length === 0) return;

    const watchedSeriesMap = new Map<string, string>();
    for (const item of resumeItems) {
      if (item.seriesId) {
        watchedSeriesMap.set(item.seriesId, item.seriesName || item.name);
      } else if (item.type === "Series") {
        watchedSeriesMap.set(item.id, item.name);
      }
    }

    if (isFirstRun) {
      const initialIds = recentItems.map((item) => item.id);
      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify(initialIds.slice(0, MAX_KNOWN_IDS))
      );
      logger.info(
        `[NotificationSync] Seeded account baseline with ${initialIds.length} known items (no notifications dispatched)`
      );
      return;
    }

    const newlyDiscoveredIds: string[] = [];

    for (const item of recentItems) {
      if (knownSet.has(item.id)) continue;

      newlyDiscoveredIds.push(item.id);
      const posterUrl = serverUrl ? getMediaPosterUrl(serverUrl, item, 200) : undefined;

      if (item.type === "Episode" && item.seriesId && watchedSeriesMap.has(item.seriesId)) {
        const seriesName = item.seriesName || watchedSeriesMap.get(item.seriesId) || "Série";
        await notificationService.notifyNewEpisode({
          seriesName,
          episodeTitle: item.name,
          episodeId: item.id,
          seriesId: item.seriesId,
          seasonIndex: item.seasonIndex,
          episodeIndex: item.episodeIndex,
          posterUrl
        });
      } else if (item.type === "Movie") {
        await notificationService.notifyNewMovie({
          movieTitle: item.name,
          movieId: item.id,
          year: item.year,
          posterUrl
        });
      } else if (item.type === "Series") {
        await notificationService.notifyNewSeries({
          seriesTitle: item.name,
          seriesId: item.id,
          year: item.year,
          posterUrl
        });
      }
    }

    if (newlyDiscoveredIds.length > 0) {
      const updatedList = Array.from(
        new Set([...newlyDiscoveredIds, ...Array.from(knownSet)])
      ).slice(0, MAX_KNOWN_IDS);
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedList));
      logger.info(
        `[NotificationSync] Dispatched notifications for ${newlyDiscoveredIds.length} new media item(s)`
      );
    }
  } catch (err: any) {
    logger.warn("[NotificationSync] Error during notification sync:", err?.message || err);
  }
}

/**
 * Hook that auto-syncs notifications upon user authentication and screen focus.
 */
export function useNotificationSync(): { runSync: () => Promise<void> } {
  const userId = useAuthStore((state) => state.session?.userId);
  const serverId = useAuthStore((state) => state.session?.serverId);
  const lastSyncRef = useRef<number>(0);

  const runSync = useCallback(async () => {
    if (!userId || !serverId) return;

    const now = Date.now();
    if (now - lastSyncRef.current < SYNC_COOLDOWN_MS) {
      return;
    }
    lastSyncRef.current = now;

    await syncNewMediaNotifications(userId, serverId);
  }, [userId, serverId]);

  useEffect(() => {
    if (userId && serverId) {
      runSync();
    }
  }, [userId, serverId, runSync]);

  return { runSync };
}
