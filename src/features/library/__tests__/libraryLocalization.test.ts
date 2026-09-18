import { getLocalizedLibraryName, getLocalizedGenre } from "../libraryLocalization";

describe("getLocalizedLibraryName", () => {
  const mockT = (key: string) => {
    switch (key) {
      case "home.moviesCategory":
        return "Films";
      case "home.seriesCategory":
        return "Séries";
      case "home.collectionsCategory":
        return "Collections";
      default:
        return key;
    }
  };

  const mockTEnglish = (key: string) => {
    switch (key) {
      case "home.moviesCategory":
        return "Movies";
      case "home.seriesCategory":
        return "Series";
      case "home.collectionsCategory":
        return "Collections";
      default:
        return key;
    }
  };

  it("translates French server library 'Films' to 'Movies' in English", () => {
    expect(getLocalizedLibraryName({ name: "Films", collectionType: "movies" }, mockTEnglish)).toBe("Movies");
    expect(getLocalizedLibraryName({ name: "Films", collectionType: null }, mockTEnglish)).toBe("Movies");
  });

  it("translates English server library 'TV Shows' to 'Séries' in French", () => {
    expect(getLocalizedLibraryName({ name: "TV Shows", collectionType: "tvshows" }, mockT)).toBe("Séries");
    expect(getLocalizedLibraryName({ name: "Series", collectionType: null }, mockT)).toBe("Séries");
  });

  it("translates 'Collections' or 'Boxsets' to active language", () => {
    expect(getLocalizedLibraryName({ name: "Boxsets", collectionType: "boxsets" }, mockTEnglish)).toBe("Collections");
  });

  it("preserves custom library names", () => {
    expect(getLocalizedLibraryName({ name: "Anime 2024", collectionType: null }, mockT)).toBe("Anime 2024");
    expect(getLocalizedLibraryName({ name: "Concerts", collectionType: "musicvideos" }, mockTEnglish)).toBe("Concerts");
  });
});

describe("getLocalizedGenre", () => {
  it("normalizes and translates compound genres to French", () => {
    expect(getLocalizedGenre("Action & Adventure", "fr")).toBe("Action & Aventure");
    expect(getLocalizedGenre("action & adventure", "fr")).toBe("Action & Aventure");
    expect(getLocalizedGenre("Sci-Fi & Fantasy", "fr")).toBe("Science-Fiction & Fantastique");
  });

  it("normalizes truncated 'Action &' metadata cleanly", () => {
    expect(getLocalizedGenre("Action &", "fr")).toBe("Action & Aventure");
    expect(getLocalizedGenre("Action &", "en")).toBe("Action & Adventure");
  });

  it("localizes standard genres in French", () => {
    expect(getLocalizedGenre("Comedy", "fr")).toBe("Comédie");
    expect(getLocalizedGenre("Animation", "fr")).toBe("Animation");
    expect(getLocalizedGenre("Horror", "fr")).toBe("Horreur");
    expect(getLocalizedGenre("Drama", "fr")).toBe("Drame");
  });

  it("returns English genres when language is English", () => {
    expect(getLocalizedGenre("Action & Adventure", "en")).toBe("Action & Adventure");
    expect(getLocalizedGenre("Comedy", "en")).toBe("Comedy");
    expect(getLocalizedGenre("Drame", "en")).toBe("Drama");
  });

  it("handles null, empty, or custom unknown genres gracefully", () => {
    expect(getLocalizedGenre(null, "fr")).toBe("");
    expect(getLocalizedGenre("", "fr")).toBe("");
    expect(getLocalizedGenre("Custom Indie", "fr")).toBe("Custom Indie");
  });
});

