import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncNewMediaNotifications, STORAGE_KEY_KNOWN_MEDIA } from "../useNotificationSync";
import { mediaRepository } from "../../../core/repositories/mediaRepository";
import { notificationService } from "../../../core/notifications/notificationService";
import { useNotificationStore, DEFAULT_NOTIFICATION_PREFERENCES } from "../../../stores/notificationStore";

jest.mock("../../../core/repositories/mediaRepository");
jest.mock("../../../core/notifications/notificationService");

describe("syncNewMediaNotifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES }
    });
  });

  it("seeds baseline on first run without dispatching notifications", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    const mockRecent = [
      { id: "item-1", name: "Dune", type: "Movie", year: 2024 },
      { id: "item-2", name: "Shogun", type: "Series", year: 2024 }
    ];

    (mediaRepository.getRecentlyAdded as jest.Mock).mockResolvedValueOnce(mockRecent);
    (mediaRepository.getResumeItems as jest.Mock).mockResolvedValueOnce([]);

    await syncNewMediaNotifications("user-123");

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY_KNOWN_MEDIA,
      JSON.stringify(["item-1", "item-2"])
    );
    expect(notificationService.notifyNewMovie).not.toHaveBeenCalled();
    expect(notificationService.notifyNewSeries).not.toHaveBeenCalled();
  });

  it("dispatches new movie notification when new movie appears", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify(["item-old-1", "item-old-2"])
    );

    const mockRecent = [
      { id: "item-new-movie", name: "Oppenheimer", type: "Movie", year: 2023 },
      { id: "item-old-1", name: "Old Movie", type: "Movie" }
    ];

    (mediaRepository.getRecentlyAdded as jest.Mock).mockResolvedValueOnce(mockRecent);
    (mediaRepository.getResumeItems as jest.Mock).mockResolvedValueOnce([]);

    await syncNewMediaNotifications("user-123");

    expect(notificationService.notifyNewMovie).toHaveBeenCalledWith({
      movieTitle: "Oppenheimer",
      movieId: "item-new-movie",
      year: 2023
    });
  });

  it("dispatches new episode notification for watched series", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
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

    await syncNewMediaNotifications("user-123");

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
});
