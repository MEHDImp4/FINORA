import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { useNotificationStore, NotificationType } from "../../stores/notificationStore";
import { logger } from "../network/logger";
import { translate } from "../../i18n";

let ExpoNotifications: typeof import("expo-notifications") | null = null;
let isNativeSupported = true;

function isAndroidExpoGo(): boolean {
  if (Platform.OS !== "android") {
    return false;
  }
  // Detect Expo Go via appOwnership or ExecutionEnvironment
  const appOwnership = Constants?.appOwnership;
  const executionEnv = Constants?.executionEnvironment;
  const storeClient = ExecutionEnvironment?.StoreClient || "storeClient";
  return appOwnership === "expo" || executionEnv === storeClient;
}

function getExpoNotifications(): typeof import("expo-notifications") | null {
  if (ExpoNotifications !== null) {
    return ExpoNotifications;
  }
  if (!isNativeSupported) {
    return null;
  }

  // Under Android in Expo Go, expo-notifications throws an uncaught error at module load time
  // because push notifications were removed in Expo Go SDK 53.
  if (isAndroidExpoGo()) {
    isNativeSupported = false;
    logger.info(
      "[NotificationService] Android Expo Go detected: native push/local banners disabled. FINORA in-app notification center is active."
    );
    return null;
  }

  try {
    ExpoNotifications = require("expo-notifications");
    return ExpoNotifications;
  } catch (err: any) {
    isNativeSupported = false;
    logger.warn(
      "[NotificationService] Native notifications not supported in current environment. In-app notifications active.",
      err?.message || err
    );
    return null;
  }
}

class NotificationService {
  private initialized = false;

  public async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const Notifications = getExpoNotifications();
      if (Notifications) {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true
          })
        });

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("finora_updates", {
            name: "FINORA Mises à jour",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#E50914",
            sound: "default"
          });
        }
      }

      this.initialized = true;
      logger.info("[NotificationService] Initialized successfully");
    } catch (err: any) {
      logger.warn("[NotificationService] Failed to initialize handler:", err?.message || err);
    }
  }

  public async requestPermissions(): Promise<boolean> {
    try {
      const Notifications = getExpoNotifications();
      if (!Notifications) {
        useNotificationStore.getState().setHasPermissions(true);
        return true;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      const granted = finalStatus === "granted";
      useNotificationStore.getState().setHasPermissions(granted);
      return granted;
    } catch (err: any) {
      logger.warn("[NotificationService] Permission request failed:", err?.message || err);
      useNotificationStore.getState().setHasPermissions(true);
      return true;
    }
  }

  public async scheduleLocalNotification(params: {
    type: NotificationType;
    title: string;
    body: string;
    mediaId?: string;
    seriesId?: string;
    seriesName?: string;
    posterUrl?: string;
    seasonIndex?: number;
    episodeIndex?: number;
  }): Promise<string | null> {
    const { preferences } = useNotificationStore.getState();

    // Verify global notifications setting
    if (!preferences.enabled) {
      return null;
    }

    // Verify category specific preference
    if (params.type === "new_episode" && !preferences.newEpisodes) return null;
    if (params.type === "new_movie" && !preferences.newMovies) return null;
    if (params.type === "new_series" && !preferences.newSeries) return null;
    if (params.type === "download_completed" && !preferences.downloadsCompleted) return null;

    // 1. Add to in-app store / inbox
    const notifId = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    useNotificationStore.getState().addNotification({
      id: notifId,
      type: params.type,
      title: params.title,
      body: params.body,
      mediaId: params.mediaId,
      seriesId: params.seriesId,
      seriesName: params.seriesName,
      posterUrl: params.posterUrl,
      seasonIndex: params.seasonIndex,
      episodeIndex: params.episodeIndex
    });

    // 2. Schedule native system notification banner if supported
    try {
      const Notifications = getExpoNotifications();
      if (Notifications) {
        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: params.title,
            body: params.body,
            data: {
              notificationId: notifId,
              mediaId: params.mediaId,
              seriesId: params.seriesId,
              type: params.type
            },
            sound: "default",
            color: "#E50914"
          },
          trigger: null // Deliver immediately
        });

        logger.info(`[NotificationService] Dispatched native notification: ${params.title}`);
        return identifier;
      }
    } catch (err: any) {
      logger.warn("[NotificationService] Failed to schedule native notification:", err?.message || err);
    }

    return notifId;
  }

  public addNotificationResponseListener(onSelectMedia: (mediaId: string) => void): () => void {
    try {
      const Notifications = getExpoNotifications();
      if (Notifications && typeof Notifications.addNotificationResponseReceivedListener === "function") {
        const sub = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response?.notification?.request?.content?.data;
          if (data?.mediaId) {
            onSelectMedia(String(data.mediaId));
          }
        });

        return () => {
          if (sub && typeof sub.remove === "function") {
            sub.remove();
          }
        };
      }
    } catch {
      // Safe fallback
    }

    return () => {};
  }

  public async notifyNewEpisode(params: {
    seriesName: string;
    episodeTitle: string;
    episodeId: string;
    seriesId?: string;
    seasonIndex?: number;
    episodeIndex?: number;
    posterUrl?: string;
  }): Promise<string | null> {
    const sIndex = params.seasonIndex ?? 1;
    const eIndex = params.episodeIndex ?? 1;
    const pad = (n: number) => n.toString().padStart(2, "0");

    const epPrefix = `S${pad(sIndex)}E${pad(eIndex)}`;
    const body = `${params.seriesName} — ${epPrefix} : ${params.episodeTitle}`;

    return this.scheduleLocalNotification({
      type: "new_episode",
      title: translate("notifications.newEpisodeTitle"),
      body,
      mediaId: params.episodeId,
      seriesId: params.seriesId,
      seriesName: params.seriesName,
      posterUrl: params.posterUrl,
      seasonIndex: params.seasonIndex,
      episodeIndex: params.episodeIndex
    });
  }

  public async notifyNewMovie(params: {
    movieTitle: string;
    movieId: string;
    year?: number;
    posterUrl?: string;
  }): Promise<string | null> {
    const yearStr = params.year ? ` (${params.year})` : "";
    const body = translate("notifications.newMovieBody", {
      title: `${params.movieTitle}${yearStr}`
    });

    return this.scheduleLocalNotification({
      type: "new_movie",
      title: translate("notifications.newMovieTitle"),
      body,
      mediaId: params.movieId,
      posterUrl: params.posterUrl
    });
  }

  public async notifyNewSeries(params: {
    seriesTitle: string;
    seriesId: string;
    year?: number;
    posterUrl?: string;
  }): Promise<string | null> {
    const yearStr = params.year ? ` (${params.year})` : "";
    const body = translate("notifications.newSeriesBody", {
      title: `${params.seriesTitle}${yearStr}`
    });

    return this.scheduleLocalNotification({
      type: "new_series",
      title: translate("notifications.newSeriesTitle"),
      body,
      mediaId: params.seriesId,
      seriesId: params.seriesId,
      seriesName: params.seriesTitle,
      posterUrl: params.posterUrl
    });
  }

  public async notifyDownloadComplete(
    mediaTitle: string,
    mediaId: string,
    type?: "Movie" | "Episode"
  ): Promise<string | null> {
    const body = translate("notifications.downloadCompleteBody", {
      title: mediaTitle
    });

    return this.scheduleLocalNotification({
      type: "download_completed",
      title: translate("notifications.downloadCompleteTitle"),
      body,
      mediaId
    });
  }

  public async sendTestNotification(): Promise<string | null> {
    return this.scheduleLocalNotification({
      type: "test",
      title: translate("notifications.testNotificationTitle"),
      body: translate("notifications.testNotificationBody")
    });
  }
}

export const notificationService = new NotificationService();
