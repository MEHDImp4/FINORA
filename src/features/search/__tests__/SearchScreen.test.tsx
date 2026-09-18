import React from "react";
import ReactTestRenderer, { act } from "react-test-renderer";
import SearchScreen from "../../../app/(tabs)/search";
import { searchHistoryService } from "../searchHistory";
import { translate } from "../../../i18n";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn()
  })
}));

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

const mockUseSearchMedia = jest.fn();
const mockUseSearchSuggestions = jest.fn();
jest.mock("../../../hooks/useSearchQueries", () => ({
  useSearchMedia: (...args: any[]) => mockUseSearchMedia(...args),
  useSearchSuggestions: (...args: any[]) => mockUseSearchSuggestions(...args)
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

    mockUseSearchSuggestions.mockReturnValue({
      data: [],
      isLoading: false
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders search input and recent search history when idle without category chips", async () => {
    let tree: any;
    await act(async () => {
      tree = ReactTestRenderer.create(<SearchScreen />);
    });

    expect(tree.root.findByProps({ accessibilityLabel: translate("common.search") })).toBeTruthy();
    // Category chips were removed for clean Netflix-style design
    expect(tree.root.findAllByProps({ accessibilityLabel: translate("search.moviesCategory") }).length).toBe(0);
    expect(tree.root.findByProps({ accessibilityLabel: "Matrix" })).toBeTruthy();

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

    const searchInput = tree.root.findByProps({ accessibilityLabel: translate("common.search") });
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

    const searchInput = tree.root.findByProps({ accessibilityLabel: translate("common.search") });
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

  it("renders Netflix-style top searches list when search query is empty", async () => {
    const mockSuggestions = [
      {
        id: "suggested-1",
        name: "Dune",
        type: "Movie",
        year: 2021,
        playedPercentage: 0,
        isPlayed: false,
        primaryImageTag: "tag-dune"
      }
    ];

    mockUseSearchSuggestions.mockReturnValue({
      data: mockSuggestions,
      isLoading: false
    });

    let tree: any;
    await act(async () => {
      tree = ReactTestRenderer.create(<SearchScreen />);
    });

    expect(tree.root.findByProps({ children: translate("search.topSearches") })).toBeTruthy();
    expect(tree.root.findByProps({ accessibilityLabel: "Dune, 2021" })).toBeTruthy();
    expect(tree.root.findByProps({ accessibilityLabel: "Play Dune" })).toBeTruthy();

    act(() => {
      tree.unmount();
    });
  });

  it("filters out individual episodes and seasons from top searches so only full movies and series appear", async () => {
    const mockMixedSuggestions = [
      {
        id: "suggested-movie",
        name: "Interstellar",
        type: "Movie",
        year: 2014,
        playedPercentage: 0,
        isPlayed: false,
        primaryImageTag: "tag-movie"
      },
      {
        id: "suggested-episode",
        name: "Ozymandias",
        seriesName: "Breaking Bad",
        type: "Episode",
        year: 2013,
        playedPercentage: 0,
        isPlayed: false,
        primaryImageTag: "tag-ep"
      },
      {
        id: "suggested-series",
        name: "Breaking Bad",
        type: "Series",
        year: 2008,
        playedPercentage: 0,
        isPlayed: false,
        primaryImageTag: "tag-series"
      },
      {
        id: "suggested-season",
        name: "Season 5",
        type: "Season",
        year: 2012,
        playedPercentage: 0,
        isPlayed: false,
        primaryImageTag: "tag-season"
      }
    ];

    mockUseSearchSuggestions.mockReturnValue({
      data: mockMixedSuggestions,
      isLoading: false
    });

    let tree: any;
    await act(async () => {
      tree = ReactTestRenderer.create(<SearchScreen />);
    });

    // Movie and Series should be present
    expect(tree.root.findByProps({ accessibilityLabel: "Interstellar, 2014" })).toBeTruthy();
    expect(tree.root.findByProps({ accessibilityLabel: "Breaking Bad, 2008" })).toBeTruthy();

    // Episodes and Seasons MUST NOT be present in top searches
    expect(tree.root.findAllByProps({ accessibilityLabel: "Ozymandias, 2013" }).length).toBe(0);
    expect(tree.root.findAllByProps({ accessibilityLabel: "Season 5, 2012" }).length).toBe(0);

    act(() => {
      tree.unmount();
    });
  });
});


