import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationStorageKey,
  LEGACY_NOTIFICATION_STORAGE_KEY,
  useNotificationStore
} from "../notificationStore";

describe("useNotificationStore", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
      hasPermissions: false,
      isLoaded: false,
      activeScopeKey: null
    });
  });

  it("initializes with default values", () => {
    const state = useNotificationStore.getState();
    expect(state.notifications).toEqual([]);
    expect(state.unreadCount).toBe(0);
    expect(state.preferences.enabled).toBe(true);
    expect(state.preferences.newEpisodes).toBe(true);
  });

  it("uses a different inbox key for each server/user identity", () => {
    expect(getNotificationStorageKey("server-a", "user-1")).not.toBe(
      getNotificationStorageKey("server-b", "user-1")
    );
    expect(getNotificationStorageKey("server-a", "user-1")).not.toBe(
      getNotificationStorageKey("server-a", "user-2")
    );
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
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].id).toBe("notif-1");
    expect(state.notifications[0].read).toBe(false);
    expect(state.unreadCount).toBe(1);
  });

  it("never persists posterUrl or a Jellyfin api_key", async () => {
    await useNotificationStore.getState().loadPersisted("server-a", "user-1");

    useNotificationStore.getState().addNotification({
      type: "new_movie",
      title: "New movie",
      body: "Available now",
      mediaId: "movie-1",
      posterUrl: "https://jellyfin.example.com/Items/movie-1/Images/Primary?api_key=SECRET_TOKEN"
    });

    const key = getNotificationStorageKey("server-a", "user-1");
    const raw = await AsyncStorage.getItem(key);

    expect(raw).toBeTruthy();
    expect(raw).not.toContain("api_key");
    expect(raw).not.toContain("SECRET_TOKEN");
    expect(raw).not.toContain("posterUrl");
    expect(useNotificationStore.getState().notifications[0].posterUrl).toContain("api_key");
  });

  it("deletes the legacy global inbox instead of assigning it to the current account", async () => {
    await AsyncStorage.setItem(
      LEGACY_NOTIFICATION_STORAGE_KEY,
      JSON.stringify([
        {
          id: "legacy-1",
          type: "new_movie",
          title: "Legacy",
          body: "Old",
          timestamp: 1,
          read: false,
          posterUrl: "https://server/Items/x/Images/Primary?api_key=OLD_SECRET"
        }
      ])
    );

    await useNotificationStore.getState().loadPersisted("server-a", "user-1");

    expect(await AsyncStorage.getItem(LEGACY_NOTIFICATION_STORAGE_KEY)).toBeNull();
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it("scrubs posterUrl from an existing scoped payload during upgrade", async () => {
    const key = getNotificationStorageKey("server-a", "user-1");
    await AsyncStorage.setItem(
      key,
      JSON.stringify([
        {
          id: "scoped-1",
          type: "new_series",
          title: "Series",
          body: "Added",
          timestamp: 10,
          read: false,
          mediaId: "series-1",
          posterUrl: "https://server/Items/series-1/Images/Primary?api_key=SHOULD_DISAPPEAR"
        }
      ])
    );

    await useNotificationStore.getState().loadPersisted("server-a", "user-1");

    const raw = await AsyncStorage.getItem(key);
    expect(raw).not.toContain("posterUrl");
    expect(raw).not.toContain("SHOULD_DISAPPEAR");
    expect(useNotificationStore.getState().notifications[0].posterUrl).toBeUndefined();
  });

  it("loads only the active account inbox", async () => {
    const keyA = getNotificationStorageKey("server-a", "user-1");
    const keyB = getNotificationStorageKey("server-b", "user-1");

    await AsyncStorage.setItem(
      keyA,
      JSON.stringify([
        {
          id: "a-1",
          type: "new_movie",
          title: "A",
          body: "A",
          timestamp: 1,
          read: false
        }
      ])
    );
    await AsyncStorage.setItem(
      keyB,
      JSON.stringify([
        {
          id: "b-1",
          type: "new_movie",
          title: "B",
          body: "B",
          timestamp: 2,
          read: false
        }
      ])
    );

    await useNotificationStore.getState().loadPersisted("server-b", "user-1");

    expect(useNotificationStore.getState().notifications.map((n) => n.id)).toEqual(["b-1"]);
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

  it("updates preferences partially and persists them", async () => {
    await useNotificationStore.getState().updatePreferences({ newMovies: false });
    const prefs = useNotificationStore.getState().preferences;
    expect(prefs.newMovies).toBe(false);
    expect(prefs.newEpisodes).toBe(true);
    expect(prefs.enabled).toBe(true);
    expect(await AsyncStorage.getItem("@finora_notification_prefs")).toContain('"newMovies":false');
  });
});
