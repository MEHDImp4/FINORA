import {
  buildImageUrl,
  getPosterUrl,
  getBackdropUrl,
  getLogoUrl,
  getMediaPosterUrl,
  getMediaThumbnailUrl,
  getMediaPosterUrls,
  getMediaThumbnailUrls,
  getHeroBannerUrls
} from "../imageUrlBuilder";

describe("imageUrlBuilder", () => {
  const baseUrl = "https://jellyfin.example.com";
  const itemId = "item-12345";

  it("constructs full image url with maxWidth, quality and tag", () => {
    const url = buildImageUrl(baseUrl, itemId, "Primary", {
      width: 400,
      quality: 90,
      tag: "tag-abc"
    });

    expect(url).toContain("https://jellyfin.example.com/Items/item-12345/Images/Primary");
    expect(url).toContain("maxWidth=400");
    expect(url).toContain("quality=90");
    expect(url).toContain("tag=tag-abc");
  });

  it("uses fillWidth and fillHeight when both are specified", () => {
    const url = buildImageUrl(baseUrl, itemId, "Primary", {
      fillWidth: 400,
      fillHeight: 600
    });

    expect(url).toContain("fillWidth=400");
    expect(url).toContain("fillHeight=600");
    expect(url).not.toContain("maxWidth");
  });

  it("handles empty baseUrl or itemId gracefully", () => {
    expect(buildImageUrl("", itemId)).toBe("");
    expect(buildImageUrl(baseUrl, "")).toBe("");
  });

  it("getPosterUrl generates poster with default width 340", () => {
    const url = getPosterUrl(baseUrl, itemId, "poster-tag");
    expect(url).toContain("/Items/item-12345/Images/Primary");
    expect(url).toContain("maxWidth=340");
    expect(url).toContain("tag=poster-tag");
  });

  it("getBackdropUrl generates backdrop with default width 1080", () => {
    const url = getBackdropUrl(baseUrl, itemId, "backdrop-tag");
    expect(url).toContain("/Items/item-12345/Images/Backdrop");
    expect(url).toContain("maxWidth=1080");
    expect(url).toContain("quality=80");
  });

  it("getLogoUrl generates logo with default width 400", () => {
    const url = getLogoUrl(baseUrl, itemId);
    expect(url).toContain("/Items/item-12345/Images/Logo");
    expect(url).toContain("maxWidth=400");
  });

  it("appends apiKey when specified in options", () => {
    const url = buildImageUrl(baseUrl, itemId, "Primary", {
      apiKey: "secret-token-xyz"
    });
    expect(url).toContain("api_key=secret-token-xyz");
  });

  describe("getMediaPosterUrl & getMediaPosterUrls", () => {
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

      const urls = getMediaPosterUrls(baseUrl, episodeItem);
      expect(urls.length).toBeGreaterThanOrEqual(1);
      expect(urls[0]).toBe(url);
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

    it("provides fallback candidates for items without primary tag", () => {
      const movieWithoutTag: any = {
        id: "movie-2",
        type: "Movie",
        name: "Untagged Movie"
      };

      const urls = getMediaPosterUrls(baseUrl, movieWithoutTag);
      expect(urls[0]).toContain("https://jellyfin.example.com/Items/movie-2/Images/Primary");
      expect(urls[0]).toContain("maxWidth=340");
    });
  });

  describe("getMediaThumbnailUrl & getMediaThumbnailUrls", () => {
    it("prioritizes series Primary poster for episodes as first choice", () => {
      const episodeItem: any = {
        id: "ep-1",
        type: "Episode",
        name: "Pilot",
        seriesId: "series-99",
        seriesPrimaryImageTag: "series-poster-123",
        primaryImageTag: "ep-still-456",
        parentBackdropImageTag: "series-bd-789"
      };

      const url = getMediaThumbnailUrl(baseUrl, episodeItem);
      expect(url).toContain("/Items/series-99/Images/Primary");
      expect(url).toContain("tag=series-poster-123");

      const urls = getMediaThumbnailUrls(baseUrl, episodeItem);
      expect(urls[0]).toBe(url);
      expect(urls.some((u) => u.includes("series-bd-789"))).toBe(true);
      // Episode still should be relegated to the end of the candidate list
      expect(urls[urls.length - 2]).toContain("/Items/ep-1/Images/Primary");
    });

    it("falls back to series backdrop for episodes without poster tags", () => {
      const episodeWithoutPoster: any = {
        id: "ep-1",
        type: "Episode",
        name: "Pilot",
        seriesId: "series-99",
        parentBackdropImageTag: "series-bd-789"
      };

      const urls = getMediaThumbnailUrls(baseUrl, episodeWithoutPoster);
      expect(urls.some((u) => u.includes("/Items/series-99/Images/Backdrop"))).toBe(true);
    });

    it("prioritizes primary poster for movies and series", () => {
      const movieItem: any = {
        id: "movie-1",
        type: "Movie",
        name: "Inception",
        primaryImageTag: "movie-poster-abc",
        backdropImageTag: "bd-tag-abc"
      };

      const url = getMediaThumbnailUrl(baseUrl, movieItem);
      expect(url).toContain("/Items/movie-1/Images/Primary");
      expect(url).toContain("tag=movie-poster-abc");

      const urls = getMediaThumbnailUrls(baseUrl, movieItem);
      expect(urls[0]).toBe(url);
      expect(urls.some((u) => u.includes("/Images/Backdrop"))).toBe(true);
    });
  });

  describe("getHeroBannerUrls", () => {
    it("returns empty array when baseUrl or item is missing", () => {
      expect(getHeroBannerUrls("", {} as any)).toEqual([]);
      expect(getHeroBannerUrls(baseUrl, null as any)).toEqual([]);
    });

    it("prioritizes official primary poster in 1080p and falls back to backdrop", () => {
      const item: any = {
        id: "hero-1",
        type: "Movie",
        backdropImageTag: "hero-bd-123",
        primaryImageTag: "hero-pri-456"
      };

      const urls = getHeroBannerUrls(baseUrl, item, 1080);
      expect(urls.length).toBeGreaterThanOrEqual(2);
      expect(urls[0]).toContain("/Items/hero-1/Images/Primary");
      expect(urls[0]).toContain("maxWidth=1080");
      expect(urls[0]).toContain("tag=hero-pri-456");

      // Verify backdrop fallback is also present
      expect(urls.some((u) => u.includes("/Items/hero-1/Images/Backdrop"))).toBe(true);
    });

    it("prioritizes series primary poster and excludes episode still when item is an episode", () => {
      const episode: any = {
        id: "ep-10",
        type: "Episode",
        seriesId: "series-50",
        seriesPrimaryImageTag: "series-poster-tag",
        parentBackdropImageTag: "series-bd-tag",
        primaryImageTag: "ep-still-tag"
      };

      const urls = getHeroBannerUrls(baseUrl, episode, 1080);
      expect(urls[0]).toContain("/Items/series-50/Images/Primary");
      expect(urls[0]).toContain("tag=series-poster-tag");
      expect(urls.some((u) => u.includes("/Items/series-50/Images/Backdrop") && u.includes("series-bd-tag"))).toBe(true);
      // Episode still should never appear on the hero banner
      expect(urls.some((u) => u.includes("ep-still-tag"))).toBe(false);
    });
  });
});

