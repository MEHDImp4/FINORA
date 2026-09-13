import React from "react";
import ReactTestRenderer, { act } from "react-test-renderer";
import SearchScreen from "../../../app/(tabs)/search";
import { searchHistoryService } from "../searchHistory";

// Mock router
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn()
  })
}));

// Mock authStore
jest.mock("../../../stores/authStore", () => ({
  useAuthStore: (selector: any) =>
    selector({
      session: {
        userId: "user-123",
        serverUrl: "https://jellyfin.example.com",
        serverName: "Test Server",
        accessToken: "mock-token",
        username: "testuser"
      }
    })
}));

// Mock useSearchMedia
const mockUseSearchMedia = jest.fn();
jest.mock("../../../hooks/useSearchQueries", () => ({
  useSearchMedia: (...args: any[]) => mockUseSearchMedia(...args)
}));

describe("SearchScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.spyOn(searchHistoryService, "getRecentSearches").mockResolvedValue(["Matrix"]);
    jest.spyOn(searchHistoryService, "addSearchTerm").mockResolvedValue(["Inception", "Matrix"]);
    jest.spyOn(searchHistoryService, "removeSearchTerm").mockResolvedValue([]);
    jest.spyOn(searchHistoryService, "clearSearchHistory").mockResolvedValue();

    mockUseSearchMedia.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders search input, category chips, and recent search history when idle", async () => {
    let tree: any;
    await act(async () => {
      tree = ReactTestRenderer.create(<SearchScreen />);
    });

    const searchInput = tree.root.findByProps({ accessibilityLabel: "Search input" });
    expect(searchInput).toBeTruthy();

    const movieChip = tree.root.findByProps({ accessibilityLabel: "Filter by Movies" });
    expect(movieChip).toBeTruthy();

    const historyItem = tree.root.findByProps({ accessibilityLabel: "Search for Matrix" });
    expect(historyItem).toBeTruthy();

    act(() => {
      tree.unmount();
    });
  });

  it("renders search results when results are returned", async () => {
    const mockResults = [
      {
        id: "item-1",
        name: "Interstellar",
        type: "Movie",
        year: 2014,
        playedPercentage: 0,
        isPlayed: false,
        primaryImageTag: "tag-1"
      }
    ];

    mockUseSearchMedia.mockReturnValue({
      data: mockResults,
      isLoading: false,
      isFetching: false
    });

    let tree: any;
    await act(async () => {
      tree = ReactTestRenderer.create(<SearchScreen />);
    });

    // Enter text in search
    const searchInput = tree.root.findByProps({ accessibilityLabel: "Search input" });
    act(() => {
      searchInput.props.onChangeText("Inter");
      jest.advanceTimersByTime(300);
    });

    const mediaCard = tree.root.findByProps({ accessibilityLabel: "Interstellar, 2014" });
    expect(mediaCard).toBeTruthy();

    act(() => {
      mediaCard.props.onPress();
    });

    expect(mockPush).toHaveBeenCalledWith("/details/item-1");

    act(() => {
      tree.unmount();
    });
  });

  it("navigates to seriesId when an episode search result with seriesId is pressed", async () => {
    const mockResults = [
      {
        id: "ep-456",
        name: "Ozymandias",
        seriesName: "Breaking Bad",
        seriesId: "series-789",
        type: "Episode",
        playedPercentage: 0,
        isPlayed: false,
        primaryImageTag: "tag-ep"
      }
    ];

    mockUseSearchMedia.mockReturnValue({
      data: mockResults,
      isLoading: false,
      isFetching: false
    });

    let tree: any;
    await act(async () => {
      tree = ReactTestRenderer.create(<SearchScreen />);
    });

    const searchInput = tree.root.findByProps({ accessibilityLabel: "Search input" });
    act(() => {
      searchInput.props.onChangeText("Ozymandias");
      jest.advanceTimersByTime(300);
    });

    const mediaCard = tree.root.findByProps({ accessibilityHint: "Double tap to open media details" });
    expect(mediaCard).toBeTruthy();

    act(() => {
      mediaCard.props.onPress();
    });

    expect(mockPush).toHaveBeenCalledWith("/details/series-789");

    act(() => {
      tree.unmount();
    });
  });
});

