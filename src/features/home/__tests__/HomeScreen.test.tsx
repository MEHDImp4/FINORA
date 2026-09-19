import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HomeScreen from "../../../app/(tabs)/index";
import { useAuthStore } from "../../../stores/authStore";
import { useResumeItems, useRecentlyAdded, useLibraries, useWatchlistItems } from "../../../hooks/useMediaQueries";
import { useToggleFavorite } from "../../../hooks/useUserDataMutations";
import { translate } from "../../../i18n";

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

    (useToggleFavorite as jest.Mock).mockReturnValue({ mutate: jest.fn() });
  });

  it("renders HeroBanner and carousels without crashing", () => {
    const component = ReactTestRenderer.create(
      <QueryClientProvider client={queryClient}>
        <HomeScreen />
      </QueryClientProvider>
    );
    const root = component.root;

    expect(root.findByProps({ title: translate("home.continueWatching", undefined, "en") })).toBeDefined();
    expect(root.findByProps({ title: translate("home.recentlyAdded", undefined, "en") })).toBeDefined();

    ReactTestRenderer.act(() => {
      component.unmount();
    });
  });

  it("rotates HeroBanner item dynamically on pull-to-refresh", async () => {
    (useRecentlyAdded as jest.Mock).mockReturnValue({
      data: [
        { id: "recent-1", name: "Oppenheimer", type: "Movie", backdropImageTag: "backdrop-tag-opp" },
        { id: "recent-2", name: "Interstellar", type: "Movie", backdropImageTag: "backdrop-tag-inter" }
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
    expect(root.findByProps({ accessibilityLabel: translate("home.featured", { title: "Oppenheimer" }, "en") })).toBeDefined();

    const scrollView = root.findByType("ScrollView" as any);
    expect(scrollView.props.refreshControl).toBeDefined();

    await ReactTestRenderer.act(async () => {
      await scrollView.props.refreshControl.props.onRefresh();
    });
    expect(root.findByProps({ accessibilityLabel: translate("home.featured", { title: "Interstellar" }, "en") })).toBeDefined();

    await ReactTestRenderer.act(async () => {
      await scrollView.props.refreshControl.props.onRefresh();
    });
    expect(root.findByProps({ accessibilityLabel: translate("home.featured", { title: "Oppenheimer" }, "en") })).toBeDefined();

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
    (useResumeItems as jest.Mock).mockReturnValue({ data: [], isLoading: false, isError: true, refetch: jest.fn() });
    (useRecentlyAdded as jest.Mock).mockReturnValue({ data: [], isLoading: false, isError: true, refetch: jest.fn() });
    (useLibraries as jest.Mock).mockReturnValue({ data: [], isLoading: false, isError: true, refetch: jest.fn() });
    (useWatchlistItems as jest.Mock).mockReturnValue({ data: [], isLoading: false, isError: false, refetch: jest.fn() });

    let component: any;
    await ReactTestRenderer.act(async () => {
      component = ReactTestRenderer.create(
        <QueryClientProvider client={queryClient}>
          <HomeScreen />
        </QueryClientProvider>
      );
    });

    const root = component.root;
    expect(root.findByProps({ testID: "network-failure-state-view" })).toBeDefined();
    expect(root.findByProps({ testID: "failure-go-downloads-button" })).toBeDefined();

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

    const watchlistPill = root.findByProps({ accessibilityLabel: translate("home.myList", undefined, "en") });
    ReactTestRenderer.act(() => {
      watchlistPill.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(tabs)/library",
      params: { tab: "watchlist" }
    });

    const moviesPill = root.findByProps({ accessibilityLabel: "Movies" });
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

  it("resumes playback directly from Continue Watching instead of opening details", () => {
    const component = ReactTestRenderer.create(
      <QueryClientProvider client={queryClient}>
        <HomeScreen />
      </QueryClientProvider>
    );
    const root = component.root;

    const continueCarousel = root.findByProps({
      title: translate("home.continueWatching", undefined, "en")
    });

    ReactTestRenderer.act(() => {
      continueCarousel.props.onItemPress({
        id: "resume-1",
        name: "Breaking Bad - S01E02",
        type: "Episode",
        seriesId: "series-999",
        playbackPositionTicks: 123000000,
        playedPercentage: 45,
        isPlayed: false,
        isFavorite: false
      });
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/player/[id]",
      params: { id: "resume-1" }
    });

    ReactTestRenderer.act(() => {
      component.unmount();
    });
  });

  it("navigates to series details when an episode item with seriesId is pressed", () => {
    (useRecentlyAdded as jest.Mock).mockReturnValue({
      data: [
        {
          id: "ep-101",
          name: "Pilot",
          seriesName: "Breaking Bad",
          seriesId: "series-999",
          type: "Episode",
          backdropImageTag: "backdrop-tag-pilot",
          playedPercentage: 0,
          isPlayed: false,
          isFavorite: false
        }
      ],
      isLoading: false,
      refetch: jest.fn()
    });

    const component = ReactTestRenderer.create(
      <QueryClientProvider client={queryClient}>
        <HomeScreen />
      </QueryClientProvider>
    );
    const root = component.root;

    const card = root
      .findAllByProps({ accessibilityHint: "Double tap to open media details" })
      .find((el) => el.props.accessibilityLabel?.includes("Pilot"));
    expect(card).toBeDefined();
    ReactTestRenderer.act(() => {
      card?.props.onPress();
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/details/[id]",
      params: { id: "series-999" }
    });

    ReactTestRenderer.act(() => {
      component.unmount();
    });
  });
});
