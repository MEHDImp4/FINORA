import React from "react";
import renderer, { act } from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlayerScreen } from "../components/PlayerScreen";
import { MediaItem } from "../../../types/media";

async function waitUntil(predicate: () => boolean, attempts = 300): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  throw new Error("Condition was not reached before the microtask limit");
}

async function waitForPlayer(predicate: () => boolean): Promise<void> {
  await act(async () => {
    await waitUntil(predicate);
    await Promise.resolve();
    await Promise.resolve();
  });
}

const subtitleItem: MediaItem = {
  id: "subtitle-routing-movie",
  name: "Subtitle Routing Movie",
  type: "Movie",
  genres: ["Drama"],
  playbackPositionTicks: 0,
  totalTicks: 600000000,
  playedPercentage: 0,
  isPlayed: false,
  isFavorite: false,
  container: "mkv",
  mediaSourceId: "subtitle-routing-source",
  mediaStreams: [
    { type: "Video", codec: "h264", width: 1920, height: 1080, bitRate: 8_000_000 },
    { type: "Audio", codec: "aac", index: 1, language: "eng", isDefault: true },
    {
      type: "Subtitle",
      codec: "srt",
      index: 2,
      language: "eng",
      displayTitle: "English",
      isTextSubtitleStream: true
    }
  ]
};

const createMockRepo = () => ({
  reportPlaybackStart: jest.fn().mockResolvedValue(undefined),
  reportPlaybackProgress: jest.fn().mockResolvedValue(undefined),
  reportPlaybackStopped: jest.fn().mockResolvedValue(undefined)
});

function renderPlayer(queryClient: QueryClient) {
  return renderer.create(
    <QueryClientProvider client={queryClient}>
      <PlayerScreen
        item={subtitleItem}
        serverUrl="https://demo.jellyfin.org"
        token="test-token"
        onBack={jest.fn()}
        playbackRepository={createMockRepo()}
        overlayAutoHideMs={0}
      />
    </QueryClientProvider>
  );
}

async function select720p(root: any, player: any): Promise<number> {
  const before = player._replaceCount;

  act(() => {
    root.root.findByProps({ testID: "overlay-tracks-button" }).props.onPress();
  });
  act(() => {
    root.root.findByProps({ testID: "tab-quality" }).props.onPress();
  });
  act(() => {
    root.root.findByProps({ testID: "quality-option-720p" }).props.onPress();
  });

  await waitForPlayer(() => player._replaceCount > before);
  return player._replaceCount;
}

async function selectEnglishSubtitle(root: any): Promise<void> {
  act(() => {
    root.root.findByProps({ testID: "overlay-tracks-button" }).props.onPress();
  });
  act(() => {
    root.root.findByProps({ testID: "tab-subtitles" }).props.onPress();
  });
  act(() => {
    root.root.findByProps({ testID: "subtitle-option-2" }).props.onPress();
  });
}

describe("PlayerScreen subtitle transport routing", () => {
  it("selects a matching native subtitle without rebuilding the video source", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: false });
    (global as any).fetch = fetchMock;

    let root: any;
    try {
      await act(async () => {
        root = renderPlayer(queryClient);
      });

      const player = root.root.findByProps({ testID: "expo-video-view" }).props.player;
      await waitForPlayer(() => player._replaceCount > 0);
      const baselineReplaceCount = await select720p(root, player);
      expect(player._source.uri).toContain("master.m3u8");

      const nativeSubtitle = { id: "native-en", language: "en", label: "English" };
      player.availableSubtitleTracks = [nativeSubtitle];

      await selectEnglishSubtitle(root);
      await waitForPlayer(() => player.subtitleTrack === nativeSubtitle);

      // Give the subtitle cue request/fallback effect time to settle. A native
      // match must still leave the video source untouched.
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(player.subtitleTrack).toBe(nativeSubtitle);
      expect(player._replaceCount).toBe(baselineReplaceCount);
      expect(player._source.uri).not.toContain("SubtitleStreamIndex=2");
      expect(player._source.uri).not.toContain("subtitleStreamIndex=2");
    } finally {
      act(() => {
        root?.unmount();
      });
      (global as any).fetch = originalFetch;
    }
  });

  it("falls back to a server-selected subtitle only when client rendering fails", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: false });
    (global as any).fetch = fetchMock;

    let root: any;
    try {
      await act(async () => {
        root = renderPlayer(queryClient);
      });

      const player = root.root.findByProps({ testID: "expo-video-view" }).props.player;
      await waitForPlayer(() => player._replaceCount > 0);
      const baselineReplaceCount = await select720p(root, player);

      player.availableSubtitleTracks = [];
      await selectEnglishSubtitle(root);
      await waitForPlayer(
        () =>
          typeof player._source?.uri === "string" &&
          player._source.uri.includes("SubtitleStreamIndex=2")
      );

      expect(fetchMock).toHaveBeenCalled();
      expect(player._replaceCount).toBeGreaterThan(baselineReplaceCount);
      expect(player._source.uri).toContain("SubtitleStreamIndex=2");
      expect(player._source.uri).toContain("subtitleStreamIndex=2");
    } finally {
      act(() => {
        root?.unmount();
      });
      (global as any).fetch = originalFetch;
    }
  });
});
