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

  it("locks the player to landscape and exposes no portrait/orientation control", () => {
    const ScreenOrientation = require("expo-screen-orientation");
    ScreenOrientation.lockAsync.mockClear();

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

    expect(ScreenOrientation.lockAsync).toHaveBeenCalledWith(
      ScreenOrientation.OrientationLock.LANDSCAPE
    );

    const moreButton = root.root.findByProps({ testID: "overlay-more-button" });
    act(() => {
      moreButton.props.onPress();
    });

    expect(root.root.findAllByProps({ testID: "overlay-orientation-button" })).toHaveLength(0);

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

  it("preserves orientation when handing off to the next episode", async () => {
    const ScreenOrientation = require("expo-screen-orientation");
    ScreenOrientation.lockAsync.mockClear();

    const originalFetch = global.fetch;
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        Items: [
          { Id: "orientation-episode-1", Name: "Episode 1", IndexNumber: 1, ParentIndexNumber: 1 },
          { Id: "orientation-episode-2", Name: "Episode 2", IndexNumber: 2, ParentIndexNumber: 1 }
        ]
      })
    });

    const episodeItem: MediaItem = {
      id: "orientation-episode-1",
      name: "Episode 1",
      type: "Episode",
      seriesId: "series-orientation",
      seasonId: "season-orientation",
      seriesName: "Orientation Series",
      seasonIndex: 1,
      episodeIndex: 1,
      genres: [],
      playbackPositionTicks: 0,
      totalTicks: 2400000000,
      playedPercentage: 0,
      isPlayed: false,
      isFavorite: false
    };

    const onNextEpisode = jest.fn();
    const mockRepo = createMockRepo();
    let root: any;

    try {
      await act(async () => {
        root = renderer.create(
          <QueryClientProvider client={queryClient}>
            <PlayerScreen
              item={episodeItem}
              serverUrl="https://demo.jellyfin.org"
              token="test-token"
              onBack={jest.fn()}
              onNextEpisode={onNextEpisode}
              playbackRepository={mockRepo}
              overlayAutoHideMs={0}
            />
          </QueryClientProvider>
        );
      });

      const nextEpisodeBtn = root.root.findByProps({ testID: "overlay-next-episode-button" });
      await act(async () => {
        nextEpisodeBtn.props.onPress();
      });

      expect(onNextEpisode).toHaveBeenCalledWith("orientation-episode-2");

      act(() => {
        root.unmount();
      });

      expect(ScreenOrientation.lockAsync).not.toHaveBeenCalledWith(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("falls back from direct play to transcode exactly once, then surfaces a terminal error (PLR-01)", () => {
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

    const player = root.root.findByProps({ testID: "expo-video-view" }).props.player;
    expect(player._source.uri).toContain("static=true");
    expect(player._replaceCount).toBe(1);

    // Direct play fails to decode.
    act(() => {
      player.status = "error";
    });

    // Exactly one fallback: the source is rebuilt as an HLS transcode.
    expect(player._source.uri).toContain("master.m3u8");
    expect(player._replaceCount).toBe(2);

    // The transcode stream also fails: terminal error is shown, no further retry.
    act(() => {
      player.status = "error";
    });

    expect(root.root.findByProps({ testID: "player-error" })).toBeTruthy();
    expect(player._replaceCount).toBe(2);

    act(() => {
      root.unmount();
    });
  });

  it("pauses playback when PiP is dismissed while the app stays backgrounded", () => {
    const { AppState } = require("react-native");
    const originalState = AppState.currentState;
    Object.defineProperty(AppState, "currentState", {
      configurable: true,
      value: "background"
    });

    const mockRepo = createMockRepo();
    let root: any;
    try {
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
      const player = videoView.props.player;
      expect(player.playing).toBe(true);

      act(() => {
        videoView.props.onPictureInPictureStart();
        videoView.props.onPictureInPictureStop();
      });

      expect(player.playing).toBe(false);
    } finally {
      act(() => {
        root?.unmount();
      });
      Object.defineProperty(AppState, "currentState", {
        configurable: true,
        value: originalState
      });
    }
  });

  it("unlocks the UI when starting Picture-in-Picture fails (PLR-05)", async () => {
    const expoVideo = require("expo-video");
    const originalVideoView = expoVideo.VideoView;
    const React = require("react");
    expoVideo.VideoView = React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        startPictureInPicture: () => Promise.reject(new Error("pip unavailable")),
        stopPictureInPicture: jest.fn()
      }));
      return React.createElement("View", { testID: "expo-video-view", ...props });
    });

    const mockRepo = createMockRepo();
    let root: any;
    try {
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

      const pipButton = root.root.findByProps({ testID: "overlay-pip-button" });
      await act(async () => {
        pipButton.props.onPress();
        await new Promise((resolve) => setTimeout(resolve, 90));
      });

      // The controls are visible again, proving the UI is no longer stuck in PiP.
      expect(root.root.findByProps({ testID: "overlay-top-bar" })).toBeTruthy();
    } finally {
      act(() => {
        root?.unmount();
      });
      expoVideo.VideoView = originalVideoView;
    }
  });
});
