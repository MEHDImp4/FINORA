import React from "react";
import renderer, { act } from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlayerScreen } from "../components/PlayerScreen";
import { MediaItem } from "../../../types/media";

// Mock dependencies
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn()
  })
}));

describe("PlayerScreen", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false }
      }
    });
  });

  const mockItem: MediaItem = {
    id: "item-movie-1",
    name: "Blade Runner 2049",
    type: "Movie",
    genres: ["Sci-Fi"],
    playbackPositionTicks: 120000000, // 12 seconds
    totalTicks: 600000000,
    playedPercentage: 20,
    isPlayed: false,
    isFavorite: false,
    mediaStreams: [
      { type: "Video", codec: "h264" },
      { type: "Audio", codec: "aac" }
    ]
  };

  const createMockRepo = () => ({
    reportPlaybackStart: jest.fn().mockResolvedValue(undefined),
    reportPlaybackProgress: jest.fn().mockResolvedValue(undefined),
    reportPlaybackStopped: jest.fn().mockResolvedValue(undefined)
  });

  it("renders video view surface and title header", () => {
    const mockRepo = createMockRepo();
    let root: any;
    act(() => {
      root = renderer.create(
        <QueryClientProvider client={queryClient}>
          <PlayerScreen
            item={mockItem}
            serverUrl="https://demo.jellyfin.org"
            token="test-token"
            onBack={jest.fn()}
            playbackRepository={mockRepo}
            overlayAutoHideMs={0}
          />
        </QueryClientProvider>
      );
    });

    const videoView = root.root.findByProps({ testID: "expo-video-view" });
    expect(videoView).toBeTruthy();

    const backButton = root.root.findByProps({ testID: "overlay-back-button" });
    expect(backButton).toBeTruthy();

    act(() => {
      root.unmount();
    });
  });

  it("triggers onBack when back button is pressed", () => {
    const onBackMock = jest.fn();
    const mockRepo = createMockRepo();
    let root: any;
    act(() => {
      root = renderer.create(
        <QueryClientProvider client={queryClient}>
          <PlayerScreen
            item={mockItem}
            serverUrl="https://demo.jellyfin.org"
            token="test-token"
            onBack={onBackMock}
            playbackRepository={mockRepo}
            overlayAutoHideMs={0}
          />
        </QueryClientProvider>
      );
    });

    const backButton = root.root.findByProps({ testID: "overlay-back-button" });
    act(() => {
      backButton.props.onPress();
    });

    expect(onBackMock).toHaveBeenCalledTimes(1);
    expect(mockRepo.reportPlaybackStopped).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
  });

  it("applies preferred playback speed from preferences store", async () => {
    const { usePlaybackPreferencesStore } = require("../../../stores/playbackPreferencesStore");
    await usePlaybackPreferencesStore.getState().setPlaybackSpeed(1.5);

    const mockRepo = createMockRepo();
    let root: any;
    act(() => {
      root = renderer.create(
        <QueryClientProvider client={queryClient}>
          <PlayerScreen
            item={mockItem}
            serverUrl="https://demo.jellyfin.org"
            token="test-token"
            onBack={jest.fn()}
            playbackRepository={mockRepo}
            overlayAutoHideMs={0}
          />
        </QueryClientProvider>
      );
    });

    const videoView = root.root.findByProps({ testID: "expo-video-view" });
    expect(videoView.props.player.playbackRate).toBe(1.5);

    act(() => {
      root.unmount();
    });
  });

  it("renders next episode button and triggers onNextEpisode when available", async () => {
    const originalFetch = global.fetch;
    const mockCurrentEpisode = {
      Id: "item-episode-1",
      Name: "Episode 1",
      IndexNumber: 1,
      ParentIndexNumber: 1
    };
    const mockNextEpisodeItem = {
      Id: "item-episode-2",
      Name: "Episode 2",
      IndexNumber: 2,
      ParentIndexNumber: 1
    };
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ Items: [mockCurrentEpisode, mockNextEpisodeItem] })
    });

    const episodeItem: MediaItem = {
      id: "item-episode-1",
      name: "Episode 1",
      type: "Episode",
      seriesId: "series-1",
      seasonId: "season-1",
      seriesName: "Arcane",
      seasonIndex: 1,
      episodeIndex: 1,
      genres: ["Action", "Animation"],
      playbackPositionTicks: 0,
      totalTicks: 2400000000,
      playedPercentage: 0,
      isPlayed: false,
      isFavorite: false
    };

    const onNextEpisodeMock = jest.fn();
    const mockRepo = createMockRepo();
    let root: any;

    await act(async () => {
      root = renderer.create(
        <QueryClientProvider client={queryClient}>
          <PlayerScreen
            item={episodeItem}
            serverUrl="https://demo.jellyfin.org"
            token="test-token"
            onBack={jest.fn()}
            onNextEpisode={onNextEpisodeMock}
            playbackRepository={mockRepo}
            overlayAutoHideMs={0}
          />
        </QueryClientProvider>
      );
    });

    const nextEpisodeBtn = root.root.findByProps({ testID: "overlay-next-episode-button" });
    expect(nextEpisodeBtn).toBeTruthy();

    await act(async () => {
      nextEpisodeBtn.props.onPress();
    });

    expect(onNextEpisodeMock).toHaveBeenCalledWith("item-episode-2");

    act(() => {
      root.unmount();
    });

    global.fetch = originalFetch;
  });
});
