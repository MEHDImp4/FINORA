import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getKnownMediaStorageKey,
  syncNewMediaNotifications,
  STORAGE_KEY_KNOWN_MEDIA
} from "../useNotificationSync";
import { mediaRepository } from "../../../core/repositories/mediaRepository";
import { notificationService } from "../../../core/notifications/notificationService";
import {
  useNotificationStore,
  DEFAULT_NOTIFICATION_PREFERENCES
} from "../../../stores/notificationStore";

jest.mock("../../../core/repositories/mediaRepository");
jest.mock("../../../core/notifications/notificationService");

describe("syncNewMediaNotifications", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES }
    });
  });

  it("seeds a server/user scoped baseline on first run without dispatching notifications", async () => {
    const mockRecent = [
      { id: "item-1", name: "Dune", type: "Movie", year: 2024 },
      { id: "item-2", name: "Shogun", type: "Series", year: 2024 }
    ];

    (mediaRepository.getRecentlyAdded as jest.Mock).mockResolvedValueOnce(mockRecent);
    (mediaRepository.getResumeItems as jest.Mock).mockResolvedValueOnce([]);

    await syncNewMediaNotifications("user-123", "server-a");

    expect(await AsyncStorage.getItem(getKnownMediaStorageKey("server-a", "user-123"))).toBe(
      JSON.stringify(["item-1", "item-2"])
    );
    expect(notificationService.notifyNewMovie).not.toHaveBeenCalled();
    expect(notificationService.notifyNewSeries).not.toHaveBeenCalled();
  });

  it("deletes the legacy global baseline instead of assigning it to the active account", async () => {
    await AsyncStorage.setItem(STORAGE_KEY_KNOWN_MEDIA, JSON.stringify(["other-server-item"]));

    (mediaRepository.getRecentlyAdded as jest.Mock).mockResolvedValueOnce([
      { id: "item-current", name: "Current", type: "Movie" }
    ]);
    (mediaRepository.getResumeItems as jest.Mock).mockResolvedValueOnce([]);

    await syncNewMediaNotifications("user-123", "server-a");

    expect(await AsyncStorage.getItem(STORAGE_KEY_KNOWN_MEDIA)).toBeNull();
    expect(notificationService.notifyNewMovie).not.toHaveBeenCalled();
  });

  it("dispatches a new movie notification within the current account scope", async () => {
    await AsyncStorage.setItem(
      getKnownMediaStorageKey("server-a", "user-123"),
      JSON.stringify(["item-old-1", "item-old-2"])
    );

    const mockRecent = [
      { id: "item-new-movie", name: "Oppenheimer", type: "Movie", year: 2023 },
      { id: "item-old-1", name: "Old Movie", type: "Movie" }
    ];

    (mediaRepository.getRecentlyAdded as jest.Mock).mockResolvedValueOnce(mockRecent);
    (mediaRepository.getResumeItems as jest.Mock).mockResolvedValueOnce([]);

    await syncNewMediaNotifications("user-123", "server-a");

    expect(notificationService.notifyNewMovie).toHaveBeenCalledWith(
      expect.objectContaining({
        movieTitle: "Oppenheimer",
        movieId: "item-new-movie",
        year: 2023
      })
    );
  });

  it("dispatches a new episode notification for a watched series", async () => {
    await AsyncStorage.setItem(
      getKnownMediaStorageKey("server-a", "user-123"),
      JSON.stringify(["ep-1", "ep-2"])
    );

    const mockResume = [
      { id: "ep-2", seriesId: "series-severance", seriesName: "Severance", type: "Episode" }
    ];

    const mockRecent = [
      {
        id: "ep-3",
        name: "Chikhai Bardo",
        seriesId: "series-severance",
        seriesName: "Severance",
        type: "Episode",
        seasonIndex: 2,
        episodeIndex: 1
      }
    ];

    (mediaRepository.getRecentlyAdded as jest.Mock).mockResolvedValueOnce(mockRecent);
    (mediaRepository.getResumeItems as jest.Mock).mockResolvedValueOnce(mockResume);

    await syncNewMediaNotifications("user-123", "server-a");

    expect(notificationService.notifyNewEpisode).toHaveBeenCalledWith(
      expect.objectContaining({
        seriesName: "Severance",
        episodeTitle: "Chikhai Bardo",
        episodeId: "ep-3",
        seriesId: "series-severance",
        seasonIndex: 2,
        episodeIndex: 1
      })
    );
  });

  it("keeps discovery baselines isolated when the same user id exists on another server", async () => {
    await AsyncStorage.setItem(
      getKnownMediaStorageKey("server-a", "same-user"),
      JSON.stringify(["movie-1"])
    );

    (mediaRepository.getRecentlyAdded as jest.Mock).mockResolvedValueOnce([
      { id: "movie-1", name: "Movie on B", type: "Movie" }
    ]);
    (mediaRepository.getResumeItems as jest.Mock).mockResolvedValueOnce([]);

    await syncNewMediaNotifications("same-user", "server-b");

    expect(notificationService.notifyNewMovie).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(getKnownMediaStorageKey("server-b", "same-user"))).toBe(
      JSON.stringify(["movie-1"])
    );
  });
});
