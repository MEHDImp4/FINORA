/**
 * backgroundFetchTask.ts
 *
 * Registers a background task that checks Jellyfin for new media while
 * the app is suspended or terminated, and dispatches local notifications.
 *
 * IMPORTANT: TaskManager.defineTask() MUST be called at module-load time (not
 * inside a component or async function). Import this file as a side-effect in
 * the app entry point (_layout.tsx) BEFORE Expo Router renders anything.
 *
 * iOS: uses BGTaskScheduler — the OS controls the actual interval (>= 15 min).
 * Android: uses WorkManager — ~15 min minimum, more reliable than iOS.
 *
 * HEADLESS CONTEXT NOTE:
 * Background tasks run in a headless JS context where Zustand stores have NOT
 * been hydrated. The task restores both the secure auth session and persisted
 * notification preferences/account scope before evaluating notification rules.
 */

import * as TaskManager from "expo-task-manager";
import * as BackgroundTask from "expo-background-task";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authRepository } from "../../core/jellyfin/authRepository";
import { jellyfinClient } from "../../core/jellyfin/jellyfinClient";
import { syncNewMediaNotifications } from "../../features/notifications/useNotificationSync";
import { useNotificationStore } from "../../stores/notificationStore";
import { logger } from "../network/logger";

export const FINORA_BG_FETCH_TASK = "FINORA_BACKGROUND_CONTENT_CHECK";

// expo-background-task expects minutes, not seconds.
export const BACKGROUND_NOTIFICATION_INTERVAL_MINUTES = 15;

// Bump when registration semantics/options change. Existing installs created by
// the previous implementation used 15 * 60, which expo-background-task treated
// as 900 minutes (~15h), so version 2 forces one clean re-registration.
const BACKGROUND_TASK_CONFIG_VERSION = 2;
const BACKGROUND_TASK_CONFIG_VERSION_KEY = "@finora_background_task_config_version";

TaskManager.defineTask(FINORA_BG_FETCH_TASK, async () => {
  try {
    const session = await authRepository.restoreSession();

    if (!session?.userId || !session.serverId) {
      logger.info("[BgTask] Skipped: no authenticated session found in secure storage.");
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    await jellyfinClient.initialize(session.serverUrl);
    jellyfinClient.setAuthToken(session.token);

    // A headless JS context does not hydrate Zustand automatically. Load the
    // persisted global preferences and the correct server/user inbox explicitly.
    await useNotificationStore.getState().loadPersisted(session.serverId, session.userId);
    const { preferences } = useNotificationStore.getState();

    if (!preferences.enabled) {
      logger.info("[BgTask] Skipped: notifications disabled by user preference.");
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    await syncNewMediaNotifications(session.userId, session.serverId);

    logger.info("[BgTask] Content check completed.");
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (err: any) {
    logger.warn("[BgTask] Task error:", err?.message ?? err);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/**
 * Registers the background task with the OS.
 * Safe to call multiple times. It only re-registers when the configuration
 * version changes, which also migrates installs created with the old 900-minute
 * interval bug.
 */
export async function registerBackgroundFetch(): Promise<void> {
  try {
    const [isRegistered, storedVersion] = await Promise.all([
      TaskManager.isTaskRegisteredAsync(FINORA_BG_FETCH_TASK),
      AsyncStorage.getItem(BACKGROUND_TASK_CONFIG_VERSION_KEY)
    ]);

    const currentVersion = Number(storedVersion || 0);
    if (isRegistered && currentVersion === BACKGROUND_TASK_CONFIG_VERSION) {
      logger.info("[BgTask] Task already registered with current configuration.");
      return;
    }

    if (isRegistered) {
      await BackgroundTask.unregisterTaskAsync(FINORA_BG_FETCH_TASK);
    }

    await BackgroundTask.registerTaskAsync(FINORA_BG_FETCH_TASK, {
      minimumInterval: BACKGROUND_NOTIFICATION_INTERVAL_MINUTES
    });

    await AsyncStorage.setItem(
      BACKGROUND_TASK_CONFIG_VERSION_KEY,
      String(BACKGROUND_TASK_CONFIG_VERSION)
    );

    logger.info(
      `[BgTask] Background content check task registered (~${BACKGROUND_NOTIFICATION_INTERVAL_MINUTES} min minimum).`
    );
  } catch (err: any) {
    logger.warn("[BgTask] Failed to register background task:", err?.message ?? err);
  }
}

/**
 * Unregisters the background task.
 * Call on logout or when the user disables all notifications.
 */
export async function unregisterBackgroundFetch(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(FINORA_BG_FETCH_TASK);
    if (isRegistered) {
      await BackgroundTask.unregisterTaskAsync(FINORA_BG_FETCH_TASK);
    }
    await AsyncStorage.removeItem(BACKGROUND_TASK_CONFIG_VERSION_KEY).catch(() => {});
    logger.info("[BgTask] Background content check task unregistered.");
  } catch (err: any) {
    logger.warn("[BgTask] Failed to unregister background task:", err?.message ?? err);
  }
}
