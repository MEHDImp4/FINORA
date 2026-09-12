import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HomeScreen from "../../../app/(tabs)/index";
import { useAuthStore } from "../../../stores/authStore";
import { useResumeItems, useRecentlyAdded, useLibraries, useWatchlistItems } from "../../../hooks/useMediaQueries";
import { useToggleFavorite } from "../../../hooks/useUserDataMutations";

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  }),
  useFocusEffect: jest.fn((cb) => {
    cb();
  })
}));

jest.mock("../../../stores/authStore");
jest.mock("../../../hooks/useMediaQueries");
jest.mock("../../../hooks/useUserDataMutations");

describe("HomeScreen", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
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
});
