import React from "react";
import ReactTestRenderer, { act } from "react-test-renderer";
import LibraryScreen from "../../../app/(tabs)/library";

// Mock router
const mockPush = jest.fn();
let mockSearchParams: { tab?: string } = {};
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn()
  }),
  useLocalSearchParams: () => mockSearchParams
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

// Mock media queries
const mockLibraries = [
  { id: "lib-movies", name: "Movies", type: "movies" },
  { id: "lib-shows", name: "TV Shows", type: "tvshows" }
];
const mockGenres = ["Action", "Comedy", "Sci-Fi"];
const mockItems = [
  {
    id: "movie-1",
    name: "The Matrix",
    type: "Movie",
    year: 1999,
    playedPercentage: 0,
    isPlayed: false,
    primaryImageTag: "tag-1"
  }
];

jest.mock("../../../hooks/useMediaQueries", () => ({
  useLibraries: () => ({ data: mockLibraries, isLoading: false }),
  useGenres: () => ({ data: mockGenres, isLoading: false }),
  useLibraryItems: () => ({ data: mockItems, isLoading: false }),
  useWatchlistItems: () => ({ data: [], isLoading: false })
}));

jest.mock("../../../hooks/useUserDataMutations", () => ({
  useToggleFavorite: () => ({ mutate: jest.fn() }),
  useMarkPlayed: () => ({ mutate: jest.fn() }),
  useRemoveFromResume: () => ({ mutate: jest.fn() })
}));

describe("LibraryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
  });

  it("renders library tabs, sort action, genres filter bar, and media grid", async () => {
    let tree: any;
    await act(async () => {
      tree = ReactTestRenderer.create(<LibraryScreen />);
    });

    // Check library tabs
    const moviesTab = tree.root.findByProps({ accessibilityLabel: "Select library Movies" });
    const showsTab = tree.root.findByProps({ accessibilityLabel: "Select library TV Shows" });
    expect(moviesTab).toBeTruthy();
    expect(showsTab).toBeTruthy();

    // Check sort button
    const sortBtn = tree.root.findByProps({ accessibilityLabel: "Open sort options" });
    expect(sortBtn).toBeTruthy();

    // Check genre chips
    const allGenresChip = tree.root.findByProps({ accessibilityLabel: "Filter by all genres" });
    const actionGenreChip = tree.root.findByProps({ accessibilityLabel: "Filter by genre Action" });
    expect(allGenresChip).toBeTruthy();
    expect(actionGenreChip).toBeTruthy();

    // Check item rendering and navigation
    const mediaCard = tree.root.findByProps({ accessibilityLabel: "The Matrix, 1999" });
    expect(mediaCard).toBeTruthy();

    act(() => {
      mediaCard.props.onPress();
    });

    expect(mockPush).toHaveBeenCalledWith("/details/movie-1");
  });

  it("opens and closes sort modal", async () => {
    let tree: any;
    await act(async () => {
      tree = ReactTestRenderer.create(<LibraryScreen />);
    });

    const sortBtn = tree.root.findByProps({ accessibilityLabel: "Open sort options" });
    act(() => {
      sortBtn.props.onPress();
    });

    const closeBtn = tree.root.findByProps({ accessibilityLabel: "Close sort options" });
    expect(closeBtn).toBeTruthy();

    act(() => {
      closeBtn.props.onPress();
    });
  });

  it("renders watchlist tab and allows selecting it", async () => {
    let tree: any;
    await act(async () => {
      tree = ReactTestRenderer.create(<LibraryScreen />);
    });

    const watchlistTab = tree.root.findByProps({ accessibilityLabel: "Select Watchlist" });
    expect(watchlistTab).toBeTruthy();

    act(() => {
      watchlistTab.props.onPress();
    });

    expect(watchlistTab.props.accessibilityState.selected).toBe(true);
  });

  it("selects library tab specified in route params.tab by ID", async () => {
    mockSearchParams = { tab: "lib-shows" };
    let tree: any;
    await act(async () => {
      tree = ReactTestRenderer.create(<LibraryScreen />);
    });

    const showsTab = tree.root.findByProps({ accessibilityLabel: "Select library TV Shows" });
    expect(showsTab.props.accessibilityState.selected).toBe(true);

    const moviesTab = tree.root.findByProps({ accessibilityLabel: "Select library Movies" });
    expect(moviesTab.props.accessibilityState.selected).toBe(false);
  });

  it("selects library tab specified in route params.tab by collectionType or name", async () => {
    mockSearchParams = { tab: "tvshows" };
    let tree: any;
    await act(async () => {
      tree = ReactTestRenderer.create(<LibraryScreen />);
    });

    const showsTab = tree.root.findByProps({ accessibilityLabel: "Select library TV Shows" });
    expect(showsTab.props.accessibilityState.selected).toBe(true);
  });

  it("toggles search bar and accepts search query input", async () => {
    let tree: any;
    await act(async () => {
      tree = ReactTestRenderer.create(<LibraryScreen />);
    });

    const searchToggle = tree.root.findByProps({ accessibilityLabel: "Open search" });
    expect(searchToggle).toBeTruthy();

    await act(async () => {
      searchToggle.props.onPress();
    });

    const searchInput = tree.root.findByProps({ accessibilityLabel: "Search input" });
    expect(searchInput).toBeTruthy();

    await act(async () => {
      searchInput.props.onChangeText("Inception");
    });

    expect(tree.root.findByProps({ accessibilityLabel: "Close search" })).toBeTruthy();
  });
});
