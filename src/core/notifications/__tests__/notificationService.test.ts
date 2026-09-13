import { notificationService } from "../notificationService";
import { useNotificationStore, DEFAULT_NOTIFICATION_PREFERENCES } from "../../../stores/notificationStore";
import * as Notifications from "expo-notifications";

describe("NotificationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
      hasPermissions: true,
      isLoaded: true
    });
  });

  it("initializes without throwing", async () => {
    await expect(notificationService.init()).resolves.toBeUndefined();
    expect(Notifications.setNotificationHandler).toHaveBeenCalled();
  });

  it("requests permissions and updates store", async () => {
    const granted = await notificationService.requestPermissions();
    expect(granted).toBe(true);
    expect(useNotificationStore.getState().hasPermissions).toBe(true);
  });

  it("schedules new episode notification and adds to store", async () => {
    const id = await notificationService.notifyNewEpisode({
      seriesName: "Severance",
      episodeTitle: "Chikhai Bardo",
      episodeId: "ep-99",
      seriesId: "series-1",
      seasonIndex: 2,
      episodeIndex: 1
    });

    expect(id).toBe("mock-notification-id");
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: "Nouvel épisode disponible",
          body: "Severance — S02E01 : Chikhai Bardo"
        })
      })
    );

    const notifs = useNotificationStore.getState().notifications;
    expect(notifs).toHaveLength(1);
    expect(notifs[0].type).toBe("new_episode");
    expect(notifs[0].mediaId).toBe("ep-99");
  });

  it("schedules new movie notification", async () => {
    const id = await notificationService.notifyNewMovie({
      movieTitle: "Dune: Part Two",
      movieId: "movie-dune",
      year: 2024
    });

    expect(id).toBe("mock-notification-id");
    const notifs = useNotificationStore.getState().notifications;
    expect(notifs).toHaveLength(1);
    expect(notifs[0].type).toBe("new_movie");
    expect(notifs[0].body).toContain("Dune: Part Two (2024)");
  });

  it("schedules new series notification", async () => {
    const id = await notificationService.notifyNewSeries({
      seriesTitle: "Shōgun",
      seriesId: "series-shogun"
    });

    expect(id).toBe("mock-notification-id");
    const notifs = useNotificationStore.getState().notifications;
    expect(notifs).toHaveLength(1);
    expect(notifs[0].type).toBe("new_series");
  });

  it("respects disabled notifications preference", async () => {
    useNotificationStore.getState().updatePreferences({ enabled: false });

    const id = await notificationService.notifyNewMovie({
      movieTitle: "Oppenheimer",
      movieId: "movie-opp"
    });

    expect(id).toBeNull();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it("respects category specific preference", async () => {
    useNotificationStore.getState().updatePreferences({ newMovies: false });

    const id = await notificationService.notifyNewMovie({
      movieTitle: "Oppenheimer",
      movieId: "movie-opp"
    });

    expect(id).toBeNull();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("notifies download completion", async () => {
    const id = await notificationService.notifyDownloadComplete("Inception", "movie-inc");
    expect(id).toBe("mock-notification-id");
    const notifs = useNotificationStore.getState().notifications;
    expect(notifs).toHaveLength(1);
    expect(notifs[0].type).toBe("download_completed");
  });

  it("sends test notification", async () => {
    const id = await notificationService.sendTestNotification();
    expect(id).toBe("mock-notification-id");
    const notifs = useNotificationStore.getState().notifications;
    expect(notifs).toHaveLength(1);
    expect(notifs[0].type).toBe("test");
  });
});
