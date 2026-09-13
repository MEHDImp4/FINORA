import {
  calculateMatchPercentage,
  extractUserGenreProfile,
  getRecommendedForYou,
  getBecauseYouWatched
} from "../recommendationEngine";
import { MediaItem } from "../../../types/media";

const mockItem = (id: string, name: string, genres: string[], rating = 8.0, isFavorite = false, type: any = "Movie"): MediaItem => ({
  id,
  name,
  type,
  genres,
  communityRating: rating,
  isFavorite,
  playbackPositionTicks: 0,
  totalTicks: 1000,
  playedPercentage: 0,
  isPlayed: false
});

describe("recommendationEngine", () => {
  it("calculates match percentage bounded between 75 and 99", () => {
    const weights = new Map<string, number>([["Action", 10], ["Sci-Fi", 5]]);
    const itemWithMatchingGenres = mockItem("1", "Movie A", ["Action", "Sci-Fi"], 9.0, true);
    const itemWithoutGenres = mockItem("2", "Movie B", [], 2.0, false);

    const highMatch = calculateMatchPercentage(itemWithMatchingGenres, weights, 15);
    const lowMatch = calculateMatchPercentage(itemWithoutGenres, weights, 15);

    expect(highMatch).toBeGreaterThanOrEqual(75);
    expect(highMatch).toBeLessThanOrEqual(99);
    expect(lowMatch).toBeGreaterThanOrEqual(75);
    expect(lowMatch).toBeLessThanOrEqual(99);
    expect(highMatch).toBeGreaterThan(lowMatch);
  });

  it("extracts weighted user genres prioritizing resume and watchlist", () => {
    const resume = [mockItem("1", "R1", ["Anime", "Action"])];
    const watchlist = [mockItem("2", "W1", ["Anime", "Fantasy"])];
    const recent = [mockItem("3", "Rec1", ["Drama"])];

    const { genreWeights, totalWeight } = extractUserGenreProfile(resume, watchlist, recent);

    // Anime appears in resume (weight 3) and watchlist (weight 2) -> 5
    expect(genreWeights.get("Anime")).toBe(5);
    expect(genreWeights.get("Action")).toBe(3);
    expect(genreWeights.get("Fantasy")).toBe(2);
    expect(genreWeights.get("Drama")).toBe(1);
    expect(totalWeight).toBe(11);
  });

  it("produces recommended items sorted by match score and excludes resume items", () => {
    const resume = [mockItem("res-1", "Watched Movie", ["Sci-Fi"])];
    const catalog = [
      mockItem("res-1", "Watched Movie", ["Sci-Fi"]), // should be excluded
      mockItem("cat-1", "Unrelated Comedy", ["Comedy"], 5.0),
      mockItem("cat-2", "Matching Sci-Fi", ["Sci-Fi"], 9.0)
    ];

    const recommended = getRecommendedForYou(catalog, resume, []);
    expect(recommended.length).toBe(2);
    expect(recommended.find((r) => r.item.id === "res-1")).toBeUndefined();
    expect(recommended[0].item.id).toBe("cat-2");
    expect(recommended[0].matchScore).toBeGreaterThanOrEqual(recommended[1].matchScore);
  });

  it("builds because-you-watched based on last resume item", () => {
    const resume = [mockItem("res-1", "Attack on Titan", ["Anime", "Action"])];
    const catalog = [
      mockItem("res-1", "Attack on Titan", ["Anime", "Action"]),
      mockItem("cat-1", "Demon Slayer", ["Anime", "Fantasy"]),
      mockItem("cat-2", "Romance Movie", ["Romance"])
    ];

    const section = getBecauseYouWatched(resume, catalog);
    expect(section).not.toBeNull();
    expect(section?.sourceItem.id).toBe("res-1");
    expect(section?.items.length).toBe(1);
    expect(section?.items[0].item.name).toBe("Demon Slayer");
  });
});
