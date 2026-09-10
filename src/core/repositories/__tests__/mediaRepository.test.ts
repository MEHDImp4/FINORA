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

    expect(mockHttpClient.request).toHaveBeenCalledWith("/Users/user-123/Items/item-99");
    expect(item.id).toBe("item-99");
    expect(item.name).toBe("Specific Film");
  });

  it("throws FinoraError on missing userId parameter", async () => {
    await expect(repository.getLibraries("", mockHttpClient)).rejects.toThrow(FinoraError);
  });
});
