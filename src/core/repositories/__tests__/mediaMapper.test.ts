import {
  mapJellyfinItemToMediaItem,
  mapJellyfinViewToLibrary,
  mapJellyfinType
} from "../mediaMapper";

describe("mediaMapper", () => {
  describe("mapJellyfinType", () => {
    it("maps recognized Jellyfin types accurately", () => {
      expect(mapJellyfinType("Movie")).toBe("Movie");
      expect(mapJellyfinType("Series")).toBe("Series");
      expect(mapJellyfinType("Season")).toBe("Season");
      expect(mapJellyfinType("Episode")).toBe("Episode");
      expect(mapJellyfinType("BoxSet")).toBe("BoxSet");
      expect(mapJellyfinType("Folder")).toBe("Folder");
      expect(mapJellyfinType("MusicAlbum")).toBe("Unknown");
      expect(mapJellyfinType(undefined)).toBe("Unknown");
    });
  });

  describe("mapJellyfinItemToMediaItem", () => {
    it("maps a full movie item and computes runtime and progress accurately", () => {
      const dto = {
        Id: "movie-123",
        Name: "Inception",
        Type: "Movie",
        Overview: "A thief who steals corporate secrets...",
        ProductionYear: 2010,
        // 148 minutes = 148 * 60 * 10,000,000 = 88,800,000,000 ticks
        RunTimeTicks: 88800000000,
        CommunityRating: 8.82,
        Genres: ["Action", "Sci-Fi"],
        ImageTags: {
          Primary: "tag-primary-abc",
          Logo: "tag-logo-xyz"
        },
        BackdropImageTags: ["tag-backdrop-1", "tag-backdrop-2"],
        ImageBlurHashes: {
          Primary: { "tag-primary-abc": "LGF5]+Yk^6#M@-5c,1J5@[or[Q6." }
        },
        UserData: {
          PlaybackPositionTicks: 44400000000, // 50%
          Played: false,
          IsFavorite: true
        }
      };

      const result = mapJellyfinItemToMediaItem(dto);

      expect(result.id).toBe("movie-123");
      expect(result.name).toBe("Inception");
      expect(result.type).toBe("Movie");
      expect(result.year).toBe(2010);
      expect(result.runtimeMinutes).toBe(148);
      expect(result.communityRating).toBe(8.8);
      expect(result.genres).toEqual(["Action", "Sci-Fi"]);
      expect(result.primaryImageTag).toBe("tag-primary-abc");
      expect(result.backdropImageTag).toBe("tag-backdrop-1");
      expect(result.logoImageTag).toBe("tag-logo-xyz");
      expect(result.blurhash).toBe("LGF5]+Yk^6#M@-5c,1J5@[or[Q6.");
      expect(result.playbackPositionTicks).toBe(44400000000);
      expect(result.playedPercentage).toBe(50);
      expect(result.isPlayed).toBe(false);
      expect(result.isFavorite).toBe(true);
    });

    it("handles played item percentage calculation", () => {
      const dto = {
        Id: "movie-456",
        Name: "Watched Film",
        Type: "Movie",
        RunTimeTicks: 60000000000,
        UserData: {
          PlaybackPositionTicks: 0,
          Played: true
        }
      };

      const result = mapJellyfinItemToMediaItem(dto);
      expect(result.isPlayed).toBe(true);
      expect(result.playedPercentage).toBe(100);
    });

    it("handles minimal item with missing fields without crashing", () => {
      const dto = { Id: "min-1" };
      const result = mapJellyfinItemToMediaItem(dto);

      expect(result.id).toBe("min-1");
      expect(result.name).toBe("Untitled");
      expect(result.type).toBe("Unknown");
      expect(result.genres).toEqual([]);
      expect(result.playbackPositionTicks).toBe(0);
      expect(result.playedPercentage).toBe(0);
      expect(result.isPlayed).toBe(false);
      expect(result.isFavorite).toBe(false);
    });
  });

  describe("mapJellyfinViewToLibrary", () => {
    it("maps Jellyfin view to MediaLibrary entity", () => {
      const dto = {
        Id: "lib-movies",
        Name: "Movies",
        CollectionType: "movies",
        ImageTags: { Primary: "tag-primary-lib" }
      };

      const result = mapJellyfinViewToLibrary(dto);
      expect(result.id).toBe("lib-movies");
      expect(result.name).toBe("Movies");
      expect(result.collectionType).toBe("movies");
      expect(result.primaryImageTag).toBe("tag-primary-lib");
    });
  });
});
