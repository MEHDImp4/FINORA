import { useEffect, useRef, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../../stores/authStore";
import { useNotificationStore } from "../../stores/notificationStore";
import { mediaRepository } from "../../core/repositories/mediaRepository";
import { notificationService } from "../../core/notifications/notificationService";
import { MediaItem } from "../../types/media";
import { logger } from "../../core/network/logger";

export const STORAGE_KEY_KNOWN_MEDIA = "@finora_known_media_ids";
const MAX_KNOWN_IDS = 500;
const SYNC_COOLDOWN_MS = 60000; // Throttle to at most once per minute

/**
 * Checks Jellyfin recent media additions against known items.
 * Triggers targeted notifications for:
 * 1. New episodes of currently watched series
 * 2. New movies added to library
 * 3. New series added to library
 */
export async function syncNewMediaNotifications(userId: string): Promise<void> {
  const { preferences } = useNotificationStore.getState();
  if (!preferences.enabled) return;

  try {
    // 1. Load known media IDs
    const rawKnown = await AsyncStorage.getItem(STORAGE_KEY_KNOWN_MEDIA);
    let knownSet = new Set<string>();
    let isFirstRun = false;

    if (rawKnown) {
      try {
        const parsed = JSON.parse(rawKnown);
        if (Array.isArray(parsed)) {
          knownSet = new Set(parsed);
        }
      } catch {
        knownSet = new Set();
      }
    } else {
      isFirstRun = true;
    }

    // 2. Fetch recent items & resume items concurrently
    const [recentItems, resumeItems] = await Promise.all([
      mediaRepository.getRecentlyAdded(userId, undefined, 30).catch(() => [] as MediaItem[]),
      mediaRepository.getResumeItems(userId, 20).catch(() => [] as MediaItem[])
    ]);

    if (!recentItems || recentItems.length === 0) return;

    // 3. Build a map of currently watched series
    const watchedSeriesMap = new Map<string, string>();
    for (const item of resumeItems) {
      if (item.seriesId) {
        watchedSeriesMap.set(item.seriesId, item.seriesName || item.name);
      } else if (item.type === "Series") {
        watchedSeriesMap.set(item.id, item.name);
      }
    }

    // 4. If first run, establish baseline without spamming notifications
    if (isFirstRun) {
      const initialIds = recentItems.map((item) => item.id);
      await AsyncStorage.setItem(
        STORAGE_KEY_KNOWN_MEDIA,
        JSON.stringify(initialIds.slice(0, MAX_KNOWN_IDS))
      );
      logger.info(
        `[NotificationSync] Seeded baseline with ${initialIds.length} known items (no notifications dispatched)`
      );
      return;
    }

    // 5. Compare and dispatch notifications for new items
    const newlyDiscoveredIds: string[] = [];

    for (const item of recentItems) {
      if (knownSet.has(item.id)) continue;

      newlyDiscoveredIds.push(item.id);

      // Category: New episode of watched series
      if (item.type === "Episode" && item.seriesId && watchedSeriesMap.has(item.seriesId)) {
        const seriesName = item.seriesName || watchedSeriesMap.get(item.seriesId) || "Série";
        await notificationService.notifyNewEpisode({
          seriesName,
          episodeTitle: item.name,
          episodeId: item.id,
          seriesId: item.seriesId,
          seasonIndex: item.seasonIndex,
          episodeIndex: item.episodeIndex
        });
      } else if (item.type === "Movie") {
        // Category: New movie added
        await notificationService.notifyNewMovie({
          movieTitle: item.name,
          movieId: item.id,
          year: item.year
        });
      } else if (item.type === "Series") {
        // Category: New series added
        await notificationService.notifyNewSeries({
          seriesTitle: item.name,
          seriesId: item.id,
          year: item.year
        });
      }
    }

    // 6. Update and persist known IDs
    if (newlyDiscoveredIds.length > 0) {
      const updatedList = Array.from(new Set([...newlyDiscoveredIds, ...Array.from(knownSet)])).slice(
        0,
        MAX_KNOWN_IDS
      );
      await AsyncStorage.setItem(STORAGE_KEY_KNOWN_MEDIA, JSON.stringify(updatedList));
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
  const lastSyncRef = useRef<number>(0);

  const runSync = useCallback(async () => {
    if (!userId) return;

    const now = Date.now();
    if (now - lastSyncRef.current < SYNC_COOLDOWN_MS) {
      return;
    }
    lastSyncRef.current = now;

    await syncNewMediaNotifications(userId);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      runSync();
    }
  }, [userId, runSync]);

  return { runSync };
}
