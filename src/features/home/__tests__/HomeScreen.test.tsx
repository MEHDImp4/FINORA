import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HomeScreen from "../../../app/(tabs)/index";
import { useAuthStore } from "../../../stores/authStore";
import { useResumeItems, useRecentlyAdded, useLibraries, useWatchlistItems } from "../../../hooks/useMediaQueries";
import { useToggleFavorite } from "../../../hooks/useUserDataMutations";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn()
  }),
  useFocusEffect: jest.fn((cb) => {
    cb();
  })
}));

import { useNetworkDiagnostic } from "../../../core/network/networkStatusService";

jest.mock("../../../stores/authStore");
jest.mock("../../../hooks/useMediaQueries");
jest.mock("../../../hooks/useUserDataMutations");
jest.mock("../../../core/network/networkStatusService", () => ({
  useNetworkDiagnostic: jest.fn(() => ({
    failureType: null,
    isChecking: false,
    runDiagnostic: jest.fn()
  }))
}));

describe("HomeScreen", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    mockPush.mockClear();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false }
      }
    });

    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      userId: "user-123",
      userName: "FinoraTester",
      serverUrl: "https://jellyfin.example.com"
    });

    (useResumeItems as jest.Mock).mockReturnValue({
      data: [
        {
          id: "resume-1",
          name: "Breaking Bad - S01E02",
          type: "Episode",
          playedPercentage: 45,
          isPlayed: false,
          isFavorite: false
        }
      ],
      isLoading: false,
      refetch: jest.fn()
    });

    (useRecentlyAdded as jest.Mock).mockReturnValue({
      data: [
        {
          id: "recent-1",
          name: "Oppenheimer",
          type: "Movie",
          backdropImageTag: "backdrop-tag-opp",
          playedPercentage: 0,
          isPlayed: false,
          isFavorite: false
        }
      ],
      isLoading: false,
      refetch: jest.fn()
    });

    (useLibraries as jest.Mock).mockReturnValue({
      data: [{ id: "lib-1", name: "Movies", collectionType: "movies" }],
      isLoading: false,
      refetch: jest.fn()
    });

    (useWatchlistItems as jest.Mock).mockReturnValue({
      data: [
        {
          id: "watchlist-1",
          name: "Interstellar",
          type: "Movie",
          isFavorite: true,
          playedPercentage: 0,
          isPlayed: false
        }
      ],
      isLoading: false,
      refetch: jest.fn()
    });

    (useToggleFavorite as jest.Mock).mockReturnValue({
      mutate: jest.fn()
    });
  });

  it("renders HeroBanner and carousels without crashing", () => {
    const component = ReactTestRenderer.create(
      <QueryClientProvider client={queryClient}>
        <HomeScreen />
      </QueryClientProvider>
    );
    const root = component.root;

    // Check that sections render
    expect(root.findByProps({ title: "Continue Watching" })).toBeDefined();
    expect(root.findByProps({ title: "Recently Added" })).toBeDefined();

    ReactTestRenderer.act(() => {
      component.unmount();
    });
  });

  it("rotates HeroBanner item dynamically on pull-to-refresh", async () => {
    (useRecentlyAdded as jest.Mock).mockReturnValue({
      data: [
        {
          id: "recent-1",
          name: "Oppenheimer",
          type: "Movie",
          backdropImageTag: "backdrop-tag-opp"
        },
        {
          id: "recent-2",
          name: "Interstellar",
          type: "Movie",
          backdropImageTag: "backdrop-tag-inter"
        }
      ],
      isLoading: false,
      refetch: jest.fn()
    });

    let component: any;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(
        <QueryClientProvider client={queryClient}>
          <HomeScreen />
        </QueryClientProvider>
      );
    });

    const root = component.root;
    // Initial hero item should be Oppenheimer
    expect(root.findByProps({ accessibilityLabel: "Featured: Oppenheimer" })).toBeDefined();

    // Find ScrollView and trigger onRefresh from refreshControl prop
    const scrollView = root.findByType("ScrollView" as any);
    expect(scrollView.props.refreshControl).toBeDefined();

    await ReactTestRenderer.act(async () => {
      await scrollView.props.refreshControl.props.onRefresh();
    });

    // Hero banner should now have rotated to Interstellar
    expect(root.findByProps({ accessibilityLabel: "Featured: Interstellar" })).toBeDefined();

    // Trigger onRefresh again to verify circular rotation
    await ReactTestRenderer.act(async () => {
      await scrollView.props.refreshControl.props.onRefresh();
    });

    // Hero banner should cycle back to Oppenheimer
    expect(root.findByProps({ accessibilityLabel: "Featured: Oppenheimer" })).toBeDefined();

    ReactTestRenderer.act(() => {
      component.unmount();
    });
  });

  it("renders NetworkFailureStateView when server is unreachable and no content is cached", async () => {
    (useNetworkDiagnostic as jest.Mock).mockReturnValue({
      failureType: "server_unreachable",
      isChecking: false,
      runDiagnostic: jest.fn()
    });

    (useResumeItems as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      refetch: jest.fn()
    });

    (useRecentlyAdded as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      refetch: jest.fn()
    });

    (useLibraries as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      refetch: jest.fn()
    });

    (useWatchlistItems as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: jest.fn()
    });

    let component: any;
    await ReactTestRenderer.act(async () => {
      component = ReactTestRenderer.create(
        <QueryClientProvider client={queryClient}>
          <HomeScreen />
        </QueryClientProvider>
      );
    });

    const root = component.root;
    // Should render NetworkFailureStateView with the go-to-downloads button
    const failureView = root.findByProps({ testID: "network-failure-state-view" });
    expect(failureView).toBeDefined();

    const downloadsBtn = root.findByProps({ testID: "failure-go-downloads-button" });
    expect(downloadsBtn).toBeDefined();

    ReactTestRenderer.act(() => {
      component.unmount();
    });
  });

  it("navigates to library with correct tab when pressing category pills", () => {
    const component = ReactTestRenderer.create(
      <QueryClientProvider client={queryClient}>
        <HomeScreen />
      </QueryClientProvider>
    );
    const root = component.root;

    // Press Watchlist pill
    const watchlistPill = root.findByProps({ accessibilityLabel: "Browse Watchlist" });
    ReactTestRenderer.act(() => {
      watchlistPill.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(tabs)/library",
      params: { tab: "watchlist" }
    });

    // Press Movies pill
    const moviesPill = root.findByProps({ accessibilityLabel: "Browse Movies" });
    ReactTestRenderer.act(() => {
      moviesPill.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(tabs)/library",
      params: { tab: "lib-1" }
    });

    ReactTestRenderer.act(() => {
      component.unmount();
    });
  });
});
