import { UserDataRepository } from "../userDataRepository";
import { JellyfinClient } from "../../jellyfin/jellyfinClient";
import { HttpClient } from "../../network/httpClient";
import { FinoraError } from "../../errors";

jest.mock("../../jellyfin/jellyfinClient");
jest.mock("../../network/httpClient");

describe("UserDataRepository", () => {
  let repository: UserDataRepository;
  let mockClient: jest.Mocked<JellyfinClient>;
  let mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(() => {
    mockHttpClient = new HttpClient() as jest.Mocked<HttpClient>;
    mockHttpClient.request = jest.fn();

    mockClient = new JellyfinClient() as jest.Mocked<JellyfinClient>;
    mockClient.getHttpClient = jest.fn(() => mockHttpClient);

    repository = new UserDataRepository(mockClient);
  });

  describe("setFavorite", () => {
    it("marks favorite with the field-merge user-data endpoint (POST)", async () => {
      await repository.setFavorite("user-1", "item-100", true, mockHttpClient);

      expect(mockHttpClient.request).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.request).toHaveBeenCalledWith("/UserItems/item-100/UserData", {
        method: "POST",
        params: { userId: "user-1" },
        body: JSON.stringify({ IsFavorite: true })
      });
    });

    it("unmarks favorite through the same field-merge endpoint", async () => {
      await repository.setFavorite("user-1", "item-100", false, mockHttpClient);

      expect(mockHttpClient.request).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.request).toHaveBeenCalledWith("/UserItems/item-100/UserData", {
        method: "POST",
        params: { userId: "user-1" },
        body: JSON.stringify({ IsFavorite: false })
      });
    });

    it("never touches played state or resume (regression: toggling favorite must preserve progress)", async () => {
      await repository.setFavorite("user-1", "item-100", true, mockHttpClient);
      await repository.setFavorite("user-1", "item-100", false, mockHttpClient);

      const endpoints = (mockHttpClient.request as jest.Mock).mock.calls.map(
        ([endpoint]: [string]) => endpoint
      );
      expect(endpoints).toEqual([
        "/UserItems/item-100/UserData",
        "/UserItems/item-100/UserData"
      ]);
      expect(endpoints).not.toContain("/Users/user-1/PlayedItems/item-100");
      expect(endpoints).not.toContain("/PlayingItems/item-100");
      expect(endpoints).not.toContain("/Users/user-1/FavoriteItems/item-100");
    });

    it("sends only IsFavorite and no playback-progress fields", async () => {
      await repository.setFavorite("user-1", "item-100", true, mockHttpClient);

      const [, options] = (mockHttpClient.request as jest.Mock).mock.calls[0];
      const payload = JSON.parse(options.body);
      expect(payload).toEqual({ IsFavorite: true });
      expect(payload).not.toHaveProperty("PlaybackPositionTicks");
      expect(payload).not.toHaveProperty("Played");
      expect(payload).not.toHaveProperty("PlayCount");
      expect(payload).not.toHaveProperty("LastPlayedDate");
    });

    it("throws FinoraError when userId or itemId is missing", async () => {
      await expect(repository.setFavorite("", "item-100", true, mockHttpClient)).rejects.toThrow(
        FinoraError
      );
      expect(mockHttpClient.request).not.toHaveBeenCalled();
    });
  });

  describe("markPlayed & markUnplayed", () => {
    it("markPlayed sends POST to PlayedItems", async () => {
      await repository.markPlayed("user-1", "item-100", mockHttpClient);

      expect(mockHttpClient.request).toHaveBeenCalledWith(
        "/Users/user-1/PlayedItems/item-100",
        { method: "POST" }
      );
    });

    it("markUnplayed sends DELETE to PlayedItems", async () => {
      await repository.markUnplayed("user-1", "item-100", mockHttpClient);

      expect(mockHttpClient.request).toHaveBeenCalledWith(
        "/Users/user-1/PlayedItems/item-100",
        { method: "DELETE" }
      );
    });
  });

  describe("updatePlaybackPosition", () => {
    it("reports progress ticks to /Sessions/Playing/Progress", async () => {
      await repository.updatePlaybackPosition("item-100", 500000000, mockHttpClient);

      expect(mockHttpClient.request).toHaveBeenCalledWith(
        "/Sessions/Playing/Progress",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            ItemId: "item-100",
            PositionTicks: 500000000
          })
        })
      );
    });
  });

  describe("removeFromResume", () => {
    it("sends DELETE to PlayingItems and PlayedItems", async () => {
      await repository.removeFromResume("user-1", "item-100", mockHttpClient);

      expect(mockHttpClient.request).toHaveBeenCalledWith(
        "/PlayingItems/item-100",
        { method: "DELETE" }
      );
      expect(mockHttpClient.request).toHaveBeenCalledWith(
        "/Users/user-1/PlayedItems/item-100",
        { method: "DELETE" }
      );
    });

    it("throws FinoraError when userId or itemId is missing", async () => {
      await expect(repository.removeFromResume("", "item-100", mockHttpClient)).rejects.toThrow(
        FinoraError
      );
    });
  });
});
