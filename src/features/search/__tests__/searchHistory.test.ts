import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  searchHistoryService,
  SEARCH_HISTORY_STORAGE_KEY,
  MAX_SEARCH_HISTORY_ITEMS
} from "../searchHistory";

describe("searchHistoryService", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it("returns empty array when no history exists", async () => {
    const history = await searchHistoryService.getRecentSearches();
    expect(history).toEqual([]);
  });

  it("adds search terms, trims whitespace, and ignores empty strings", async () => {
    await searchHistoryService.addSearchTerm("   ");
    let history = await searchHistoryService.getRecentSearches();
    expect(history).toEqual([]);

    await searchHistoryService.addSearchTerm("Inception");
    history = await searchHistoryService.getRecentSearches();
    expect(history).toEqual(["Inception"]);

    await searchHistoryService.addSearchTerm("  Interstellar  ");
    history = await searchHistoryService.getRecentSearches();
    expect(history).toEqual(["Interstellar", "Inception"]);
  });

  it("deduplicates case-insensitively and promotes existing term to top", async () => {
    await searchHistoryService.addSearchTerm("Batman");
    await searchHistoryService.addSearchTerm("Superman");
    await searchHistoryService.addSearchTerm("batman"); // lowercase duplicate

    const history = await searchHistoryService.getRecentSearches();
    expect(history).toEqual(["batman", "Superman"]);
  });

  it("caps history at MAX_SEARCH_HISTORY_ITEMS (10)", async () => {
    for (let i = 1; i <= 15; i++) {
      await searchHistoryService.addSearchTerm(`Movie ${i}`);
    }

    const history = await searchHistoryService.getRecentSearches();
    expect(history.length).toBe(MAX_SEARCH_HISTORY_ITEMS);
    expect(history[0]).toBe("Movie 15");
    expect(history[history.length - 1]).toBe("Movie 6");
  });

  it("removes a specific search term", async () => {
    await searchHistoryService.addSearchTerm("Matrix");
    await searchHistoryService.addSearchTerm("Avatar");

    const updated = await searchHistoryService.removeSearchTerm("matrix");
    expect(updated).toEqual(["Avatar"]);

    const current = await searchHistoryService.getRecentSearches();
    expect(current).toEqual(["Avatar"]);
  });

  it("clears all search history", async () => {
    await searchHistoryService.addSearchTerm("Dune");
    await searchHistoryService.addSearchTerm("Blade Runner");

    await searchHistoryService.clearSearchHistory();
    const history = await searchHistoryService.getRecentSearches();
    expect(history).toEqual([]);
  });

  it("isolates search history across different accounts (PRIV-001)", async () => {
    const { useAuthStore } = require("../../../stores/authStore");

    // Compte A logs in and searches "Breaking Bad"
    useAuthStore.setState({
      status: "authenticated",
      session: {
        serverId: "server-alpha",
        userId: "user-a",
        serverUrl: "https://jellyfin.example.com",
        token: "tok-a"
      }
    });

    await searchHistoryService.addSearchTerm("Breaking Bad");
    const historyA = await searchHistoryService.getRecentSearches();
    expect(historyA).toEqual(["Breaking Bad"]);

    // Logout
    useAuthStore.setState({
      status: "unauthenticated",
      session: null
    });

    // Compte B logs in on same server
    useAuthStore.setState({
      status: "authenticated",
      session: {
        serverId: "server-alpha",
        userId: "user-b",
        serverUrl: "https://jellyfin.example.com",
        token: "tok-b"
      }
    });

    // History of B must NOT contain "Breaking Bad"
    const historyB = await searchHistoryService.getRecentSearches();
    expect(historyB).not.toContain("Breaking Bad");
    expect(historyB).toEqual([]);

    // B searches "Better Call Saul"
    await searchHistoryService.addSearchTerm("Better Call Saul");

    // Compte A logs back in
    useAuthStore.setState({
      status: "authenticated",
      session: {
        serverId: "server-alpha",
        userId: "user-a",
        serverUrl: "https://jellyfin.example.com",
        token: "tok-a"
      }
    });

    const restoredHistoryA = await searchHistoryService.getRecentSearches();
    expect(restoredHistoryA).toContain("Breaking Bad");
    expect(restoredHistoryA).not.toContain("Better Call Saul");
  });
});
