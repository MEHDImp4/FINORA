import { useNotificationStore, DEFAULT_NOTIFICATION_PREFERENCES } from "../notificationStore";

describe("useNotificationStore", () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
      hasPermissions: false,
      isLoaded: false
    });
  });

  it("initializes with default values", () => {
    const state = useNotificationStore.getState();
    expect(state.notifications).toEqual([]);
    expect(state.unreadCount).toBe(0);
    expect(state.preferences.enabled).toBe(true);
    expect(state.preferences.newEpisodes).toBe(true);
  });

  it("adds notification and increments unread count", () => {
    useNotificationStore.getState().addNotification({
      id: "notif-1",
      type: "new_episode",
      title: "Nouvel épisode disponible",
      body: "Severance S02E01",
      mediaId: "ep-123"
    });

    const state = useNotificationStore.getState();
    expect(state.notifications.length).toBe(1);
    expect(state.notifications[0].id).toBe("notif-1");
    expect(state.notifications[0].read).toBe(false);
    expect(state.unreadCount).toBe(1);
  });

  it("marks notification as read", () => {
    const store = useNotificationStore.getState();
    store.addNotification({ id: "n1", type: "new_movie", title: "Dune", body: "Nouveau film" });
    store.addNotification({ id: "n2", type: "new_series", title: "Shogun", body: "Nouvelle série" });

    expect(useNotificationStore.getState().unreadCount).toBe(2);

    useNotificationStore.getState().markAsRead("n1");
    const state = useNotificationStore.getState();
    expect(state.notifications.find((n) => n.id === "n1")?.read).toBe(true);
    expect(state.notifications.find((n) => n.id === "n2")?.read).toBe(false);
    expect(state.unreadCount).toBe(1);
  });

  it("marks all notifications as read", () => {
    const store = useNotificationStore.getState();
    store.addNotification({ id: "n1", type: "new_movie", title: "Dune", body: "Film" });
    store.addNotification({ id: "n2", type: "new_series", title: "Shogun", body: "Série" });

    useNotificationStore.getState().markAllAsRead();
    const state = useNotificationStore.getState();
    expect(state.unreadCount).toBe(0);
    expect(state.notifications.every((n) => n.read)).toBe(true);
  });

  it("clears all notifications", () => {
    const store = useNotificationStore.getState();
    store.addNotification({ id: "n1", type: "new_movie", title: "Dune", body: "Film" });

    useNotificationStore.getState().clearAll();
    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(0);
    expect(state.unreadCount).toBe(0);
  });

  it("updates preferences partially", () => {
    useNotificationStore.getState().updatePreferences({ newMovies: false });
    const prefs = useNotificationStore.getState().preferences;
    expect(prefs.newMovies).toBe(false);
    expect(prefs.newEpisodes).toBe(true);
    expect(prefs.enabled).toBe(true);
  });
});
