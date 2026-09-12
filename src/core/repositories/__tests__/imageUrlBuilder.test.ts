import {
  buildImageUrl,
  getPosterUrl,
  getBackdropUrl,
  getLogoUrl,
  getMediaPosterUrl,
  getMediaThumbnailUrl
} from "../imageUrlBuilder";

describe("imageUrlBuilder", () => {
  const baseUrl = "https://jellyfin.example.com";
  const itemId = "item-12345";

  it("constructs full image url with fillWidth, quality and tag", () => {
    const url = buildImageUrl(baseUrl, itemId, "Primary", {
      width: 400,
      quality: 90,
      tag: "tag-abc"
    });

    expect(url).toContain("https://jellyfin.example.com/Items/item-12345/Images/Primary");
    expect(url).toContain("fillWidth=400");
    expect(url).toContain("quality=90");
    expect(url).toContain("tag=tag-abc");
  });

  it("handles empty baseUrl or itemId gracefully", () => {
    expect(buildImageUrl("", itemId)).toBe("");
    expect(buildImageUrl(baseUrl, "")).toBe("");
  });

  it("getPosterUrl generates poster with default width 340", () => {
    const url = getPosterUrl(baseUrl, itemId, "poster-tag");
    expect(url).toContain("/Items/item-12345/Images/Primary");
    expect(url).toContain("fillWidth=340");
    expect(url).toContain("tag=poster-tag");
  });

  it("getBackdropUrl generates backdrop with default width 1080", () => {
    const url = getBackdropUrl(baseUrl, itemId, "backdrop-tag");
    expect(url).toContain("/Items/item-12345/Images/Backdrop");
    expect(url).toContain("fillWidth=1080");
    expect(url).toContain("quality=80");
  });

  it("getLogoUrl generates logo with default width 400", () => {
    const url = getLogoUrl(baseUrl, itemId);
    expect(url).toContain("/Items/item-12345/Images/Logo");
    expect(url).toContain("fillWidth=400");
  });

  it("appends apiKey when specified in options", () => {
    const url = buildImageUrl(baseUrl, itemId, "Primary", {
      apiKey: "secret-token-xyz"
    });
    expect(url).toContain("api_key=secret-token-xyz");
  });

  describe("getMediaPosterUrl", () => {
    it("uses seriesId and seriesPrimaryImageTag for episodes", () => {
      const episodeItem: any = {
        id: "ep-1",
        type: "Episode",
        name: "Pilot",
        seriesId: "series-99",
        seriesPrimaryImageTag: "series-tag-123",
        primaryImageTag: "ep-still-456"
      };

      const url = getMediaPosterUrl(baseUrl, episodeItem);
      expect(url).toContain("/Items/series-99/Images/Primary");
      expect(url).toContain("tag=series-tag-123");
    });

    it("uses item id and primaryImageTag for movies and series", () => {
      const movieItem: any = {
        id: "movie-1",
        type: "Movie",
        name: "Inception",
        primaryImageTag: "movie-tag-123"
      };

      const url = getMediaPosterUrl(baseUrl, movieItem);
      expect(url).toContain("/Items/movie-1/Images/Primary");
      expect(url).toContain("tag=movie-tag-123");
    });
  });

  describe("getMediaThumbnailUrl", () => {
    it("uses episode Primary image (16:9 still frame) for episodes", () => {
      const episodeItem: any = {
        id: "ep-1",
        type: "Episode",
        name: "Pilot",
        seriesId: "series-99",
        primaryImageTag: "ep-still-456"
      };

      const url = getMediaThumbnailUrl(baseUrl, episodeItem);
      expect(url).toContain("/Items/ep-1/Images/Primary");
      expect(url).toContain("tag=ep-still-456");
      expect(url).not.toContain("Backdrop");
    });

    it("falls back to series backdrop for episodes without still frame", () => {
      const episodeWithoutStill: any = {
        id: "ep-1",
        type: "Episode",
        name: "Pilot",
        seriesId: "series-99",
        parentBackdropImageTag: "series-bd-789"
      };

      const url = getMediaThumbnailUrl(baseUrl, episodeWithoutStill);
      expect(url).toContain("/Items/series-99/Images/Backdrop");
      expect(url).toContain("tag=series-bd-789");
    });

    it("uses item backdrop for movies and series", () => {
      const movieItem: any = {
        id: "movie-1",
        type: "Movie",
        name: "Inception",
        backdropImageTag: "bd-tag-abc"
      };

      const url = getMediaThumbnailUrl(baseUrl, movieItem);
      expect(url).toContain("/Items/movie-1/Images/Backdrop");
      expect(url).toContain("tag=bd-tag-abc");
    });
  });
});
