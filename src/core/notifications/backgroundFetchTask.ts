/**
 * backgroundFetchTask.ts
 *
 * Registers a background fetch task that checks Jellyfin for new media while
 * the app is suspended or terminated, and dispatches local notifications.
 *
 * IMPORTANT: TaskManager.defineTask() MUST be called at module-load time (not
 * inside a component or async function). Import this file as a side-effect in
 * the app entry point (_layout.tsx) BEFORE Expo Router renders anything.
 *
 * iOS: the OS controls the actual interval (>= 15 min).
 * Android: ~15 min minimum, more reliable than iOS.
 *
 * HEADLESS CONTEXT NOTE:
 * Background tasks run in a headless JS context where the Zustand store has
 * NOT been hydrated. Do NOT call useAuthStore.getState().session directly —
 * it will return null. Instead, restore the session explicitly from secure
 * storage via authRepository.restoreSession() every time the task fires.
 */

import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import { authRepository } from "../../core/jellyfin/authRepository";
import { jellyfinClient } from "../../core/jellyfin/jellyfinClient";
import { syncNewMediaNotifications } from "../../features/notifications/useNotificationSync";
import { logger } from "../network/logger";

// Task name constant
export const FINORA_BG_FETCH_TASK = "FINORA_BACKGROUND_CONTENT_CHECK";

// Task body (defined at module level - required by TaskManager)
TaskManager.defineTask(FINORA_BG_FETCH_TASK, async () => {
  try {
    // ── Restore session from secure storage ──────────────────────────────────
    // The Zustand store is NOT hydrated in a background/headless context.
    // We must re-read the session descriptor + token from their persisted sources.
    const session = await authRepository.restoreSession();

    if (!session?.userId) {
      logger.info("[BgFetch] Skipped: no authenticated session found in secure storage.");
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Ensure the Jellyfin client is configured for this session
    await jellyfinClient.initialize(session.serverUrl);
    jellyfinClient.setAuthToken(session.token);

    // ── Sync for new media and dispatch notifications ─────────────────────────
    await syncNewMediaNotifications(session.userId);

    logger.info("[BgFetch] Content check completed.");
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (err: any) {
    logger.warn("[BgFetch] Task error:", err?.message ?? err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Registers the background fetch task with the OS.
 * Safe to call multiple times — skips if already registered.
 */
export async function registerBackgroundFetch(): Promise<void> {
  try {
    const status = await BackgroundFetch.getStatusAsync();

    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      logger.info("[BgFetch] Background fetch is restricted or denied by the OS.");
      return;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(FINORA_BG_FETCH_TASK);
    if (isRegistered) {
      logger.info("[BgFetch] Task already registered — skipping.");
      return;
    }

    await BackgroundFetch.registerTaskAsync(FINORA_BG_FETCH_TASK, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true
    });

    logger.info("[BgFetch] Background content check task registered.");
  } catch (err: any) {
    logger.warn("[BgFetch] Failed to register background fetch task:", err?.message ?? err);
  }
}

/**
 * Unregisters the background fetch task.
 * Call on logout or when the user disables all notifications.
 */
export async function unregisterBackgroundFetch(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(FINORA_BG_FETCH_TASK);
    if (!isRegistered) return;

    await BackgroundFetch.unregisterTaskAsync(FINORA_BG_FETCH_TASK);
    logger.info("[BgFetch] Background content check task unregistered.");
  } catch (err: any) {
    logger.warn("[BgFetch] Failed to unregister background fetch task:", err?.message ?? err);
  }
}
