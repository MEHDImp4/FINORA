import { MediaRepository } from "../mediaRepository";
import { JellyfinClient } from "../../jellyfin/jellyfinClient";
import { HttpClient } from "../../../core/network/httpClient";
import { FinoraError } from "../../../core/errors";

jest.mock("../../jellyfin/jellyfinClient");
jest.mock("../../../core/network/httpClient");

describe("MediaRepository", () => {
  let repository: MediaRepository;
  let mockClient: jest.Mocked<JellyfinClient>;
  let mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(() => {
    mockHttpClient = new HttpClient() as jest.Mocked<HttpClient>;
    mockHttpClient.request = jest.fn();

    mockClient = new JellyfinClient() as jest.Mocked<JellyfinClient>;
    mockClient.getHttpClient = jest.fn(() => mockHttpClient);

    repository = new MediaRepository(mockClient);
  });

  it("getLibraries calls /Users/{userId}/Views and maps results", async () => {
    mockHttpClient.request.mockResolvedValue({
      Items: [
        { Id: "lib-1", Name: "Movies", CollectionType: "movies" },
        { Id: "lib-2", Name: "Series", CollectionType: "tvshows" }
      ]
    });

    const libraries = await repository.getLibraries("user-123", mockHttpClient);

    expect(mockHttpClient.request).toHaveBeenCalledWith("/Users/user-123/Views");
    expect(libraries).toHaveLength(2);
    expect(libraries[0].name).toBe("Movies");
    expect(libraries[1].collectionType).toBe("tvshows");
  });

  it("getItems builds query parameters and returns mapped MediaItem array", async () => {
    mockHttpClient.request.mockResolvedValue({
      Items: [
        {
          Id: "item-1",
          Name: "Movie 1",
          Type: "Movie",
          RunTimeTicks: 72000000000 // 120 mins
        }
      ]
    });

    const items = await repository.getItems(
      "user-123",
      {
        parentId: "lib-1",
        includeItemTypes: ["Movie"],
        sortBy: "DateCreated",
        sortOrder: "Descending",
        limit: 20
      },
      mockHttpClient
    );

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      "/Users/user-123/Items",
      expect.objectContaining({
        params: expect.objectContaining({
          ParentId: "lib-1",
          IncludeItemTypes: "Movie",
          SortBy: "DateCreated",
          SortOrder: "Descending",
          Limit: 20
        })
      })
    );
    expect(items).toHaveLength(1);
    expect(items[0].runtimeMinutes).toBe(120);
  });

  it("getResumeItems calls /UserItems/Resume with limit", async () => {
    mockHttpClient.request.mockResolvedValue({
      Items: [
        {
          Id: "resume-1",
          Name: "Episode 1",
          Type: "Episode",
          UserData: { PlaybackPositionTicks: 1000 }
        }
      ]
    });

    const items = await repository.getResumeItems("user-123", 10, mockHttpClient);

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      "/UserItems/Resume",
      expect.objectContaining({
        params: expect.objectContaining({ Limit: 10 })
      })
    );
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Episode 1");
  });

  it("getItem calls /Users/{userId}/Items/{itemId} and maps single item", async () => {
    mockHttpClient.request.mockResolvedValue({
      Id: "item-99",
      Name: "Specific Film",
      Type: "Movie"
    });

    const item = await repository.getItem("user-123", "item-99", mockHttpClient);

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      "/Users/user-123/Items/item-99",
      expect.objectContaining({
        params: expect.objectContaining({
          Fields: expect.stringContaining("People")
        })
      })
    );
    expect(item.id).toBe("item-99");
    expect(item.name).toBe("Specific Film");
  });

  it("getSeasons calls /Shows/{seriesId}/Seasons and maps season list", async () => {
    mockHttpClient.request.mockResolvedValue({
      Items: [
        { Id: "season-1", Name: "Season 1", Type: "Season" },
        { Id: "season-2", Name: "Season 2", Type: "Season" }
      ]
    });

    const seasons = await repository.getSeasons("user-123", "series-1", mockHttpClient);

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      "/Shows/series-1/Seasons",
      expect.objectContaining({
        params: expect.objectContaining({
          UserId: "user-123"
        })
      })
    );
    expect(seasons).toHaveLength(2);
    expect(seasons[0].name).toBe("Season 1");
  });

  it("getEpisodes calls /Shows/{seriesId}/Episodes and maps episode list", async () => {
    mockHttpClient.request.mockResolvedValue({
      Items: [
        { Id: "ep-1", Name: "Pilot", Type: "Episode", IndexNumber: 1, ParentIndexNumber: 1 }
      ]
    });

    const episodes = await repository.getEpisodes("user-123", "series-1", "season-1", mockHttpClient);

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      "/Shows/series-1/Episodes",
      expect.objectContaining({
        params: expect.objectContaining({
          UserId: "user-123",
          SeasonId: "season-1"
        })
      })
    );
    expect(episodes).toHaveLength(1);
    expect(episodes[0].name).toBe("Pilot");
  });

  it("filters out virtual and missing items from resume and recently added", async () => {
    mockHttpClient.request.mockResolvedValueOnce({
      Items: [
        { Id: "res-real", Name: "Real Episode", LocationType: "FileSystem" },
        { Id: "res-virt", Name: "Deleted Episode", LocationType: "Virtual" },
        { Id: "res-miss", Name: "Missing Episode", IsMissing: true }
      ]
    });

    const resumeItems = await repository.getResumeItems("user-123", 10, mockHttpClient);
    expect(resumeItems).toHaveLength(1);
    expect(resumeItems[0].id).toBe("res-real");

    mockHttpClient.request.mockResolvedValueOnce([
      { Id: "rec-real", Name: "Real Show", LocationType: "FileSystem" },
      { Id: "rec-virt", Name: "Virtual Season", LocationType: "Virtual" }
    ]);

    const recentItems = await repository.getRecentlyAdded("user-123", undefined, 10, mockHttpClient);
    expect(recentItems).toHaveLength(1);
    expect(recentItems[0].id).toBe("rec-real");
  });

  it("getSeasons excludes virtual, missing, and 0-episode seasons", async () => {
    mockHttpClient.request.mockResolvedValue({
      Items: [
        { Id: "s-1", Name: "Season 1", LocationType: "FileSystem", ItemCounts: { EpisodeCount: 8 } },
        { Id: "s-2", Name: "Season 2", LocationType: "Virtual" },
        { Id: "s-3", Name: "Season 3", IsMissing: true },
        { Id: "s-4", Name: "Season 4", LocationType: "FileSystem", ItemCounts: { EpisodeCount: 0 } }
      ]
    });

    const seasons = await repository.getSeasons("user-123", "series-1", mockHttpClient);
    expect(seasons).toHaveLength(1);
    expect(seasons[0].id).toBe("s-1");
  });

  it("filters out empty deleted series (0 episodes / 0 seasons) from recently added and items", async () => {
    mockHttpClient.request.mockResolvedValueOnce([
      { Id: "show-active", Name: "Active Show", Type: "Series", RecursiveItemCount: 20, ChildCount: 2 },
      { Id: "show-deleted", Name: "Prison Break", Type: "Series", RecursiveItemCount: 0, ChildCount: 0 },
      { Id: "show-no-seasons", Name: "Ghost Show", Type: "Series", ChildCount: 0 },
      { Id: "movie-empty", Name: "Deleted Movie", Type: "Movie", MediaSourceCount: 0 }
    ]);

    const recent = await repository.getRecentlyAdded("user-123", undefined, 10, mockHttpClient);
    expect(recent).toHaveLength(1);
    expect(recent[0].id).toBe("show-active");
  });

  it("refreshLibrary calls POST /Library/Refresh and throttles within 30 seconds", async () => {
    mockHttpClient.request.mockResolvedValue({});

    await repository.refreshLibrary(mockHttpClient);
    expect(mockHttpClient.request).toHaveBeenCalledWith("/Library/Refresh", { method: "POST" });

    // Second call immediately after should be throttled
    mockHttpClient.request.mockClear();
    await repository.refreshLibrary(mockHttpClient);
    expect(mockHttpClient.request).not.toHaveBeenCalled();
  });

  it("refreshLibrary suppresses errors from Jellyfin without throwing", async () => {
    // Create new repo instance to reset throttling timestamp
    const freshRepo = new MediaRepository(mockClient);
    mockHttpClient.request.mockRejectedValueOnce(new Error("Unauthorized"));

    await expect(freshRepo.refreshLibrary(mockHttpClient)).resolves.not.toThrow();
  });

  it("throws FinoraError on missing userId parameter", async () => {
    await expect(repository.getLibraries("", mockHttpClient)).rejects.toThrow(FinoraError);
  });
});
