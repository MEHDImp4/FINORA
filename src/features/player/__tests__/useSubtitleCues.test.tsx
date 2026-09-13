import React from "react";
import renderer, { act } from "react-test-renderer";
import { useSubtitleCues } from "../useSubtitleCues";
import { MediaStreamInfo } from "../../../types/media";

const originalFetch = global.fetch;

describe("useSubtitleCues", () => {
  let capturedResult: any;

  function TestComponent({
    itemId,
    mediaSourceId,
    subtitleStreamIndex,
    serverUrl,
    token,
    streams
  }: {
    itemId: string;
    mediaSourceId?: string;
    subtitleStreamIndex: number | null;
    serverUrl?: string;
    token?: string;
    streams?: MediaStreamInfo[];
  }) {
    const res = useSubtitleCues({
      itemId,
      mediaSourceId,
      subtitleStreamIndex,
      serverUrl,
      token,
      streams
    });
    capturedResult = res;
    return null;
  }

  afterEach(() => {
    global.fetch = originalFetch;
    capturedResult = null;
  });

  const mockStreams: MediaStreamInfo[] = [
    {
      type: "Subtitle",
      index: 3,
      codec: "subrip",
      language: "eng",
      displayTitle: "English",
      deliveryUrl: "/Videos/test-item/test-source/Subtitles/3/0/Stream.vtt"
    },
    {
      type: "Subtitle",
      index: 5,
      codec: "subrip",
      language: "fra",
      displayTitle: "French"
    }
  ];

  it("returns empty cues and inactive state when subtitleStreamIndex is null", () => {
    act(() => {
      renderer.create(
        <TestComponent
          itemId="item-1"
          subtitleStreamIndex={null}
          serverUrl="https://jellyfin.example.com"
          token="test-token"
        />
      );
    });

    expect(capturedResult.cues).toEqual([]);
    expect(capturedResult.isCustomSubtitleActive).toBe(false);
    expect(capturedResult.isLoading).toBe(false);
    expect(capturedResult.hasError).toBe(false);
  });

  it("fetches and parses WebVTT subtitles with authentication headers", async () => {
    const mockVtt = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
Bonjour le monde
`;

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => mockVtt
    });
    global.fetch = mockFetch;

    let root: any;
    await act(async () => {
      root = renderer.create(
        <TestComponent
          itemId="item-1"
          mediaSourceId="source-1"
          subtitleStreamIndex={3}
          serverUrl="https://jellyfin.example.com"
          token="secret-token-123"
          streams={mockStreams}
        />
      );
    });

    expect(mockFetch).toHaveBeenCalled();
    const [firstCallUrl, firstCallOptions] = mockFetch.mock.calls[0];
    expect(firstCallUrl).toContain("/Videos/test-item/test-source/Subtitles/3/0/Stream.vtt");
    expect(firstCallOptions.headers["Authorization"]).toContain("MediaBrowser");
    expect(firstCallOptions.headers["X-Emby-Token"]).toBe("secret-token-123");

    expect(capturedResult.cues).toHaveLength(1);
    expect(capturedResult.cues[0].text).toBe("Bonjour le monde");
    expect(capturedResult.isCustomSubtitleActive).toBe(true);
    expect(capturedResult.hasError).toBe(false);

    act(() => {
      root.unmount();
    });
  });

  it("falls back to candidate endpoints if deliveryUrl or initial candidate returns 404", async () => {
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => "WEBVTT\n\n1\n00:00:02.000 --> 00:00:05.000\nFallback successful\n"
      });
    global.fetch = mockFetch;

    let root: any;
    await act(async () => {
      root = renderer.create(
        <TestComponent
          itemId="item-2"
          mediaSourceId="source-2"
          subtitleStreamIndex={5}
          serverUrl="https://jellyfin.example.com"
          token="token-abc"
          streams={mockStreams}
        />
      );
    });

    expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(capturedResult.cues).toHaveLength(1);
    expect(capturedResult.cues[0].text).toBe("Fallback successful");
    expect(capturedResult.isCustomSubtitleActive).toBe(true);

    act(() => {
      root.unmount();
    });
  });

  it("resets cues immediately upon track switch so old cues do not persist", async () => {
    const mockFetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("10")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => "WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.000\nTrack 10 Cue\n"
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => "WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.000\nTrack 11 Cue\n"
      });
    });
    global.fetch = mockFetch;

    let root: any;
    await act(async () => {
      root = renderer.create(
        <TestComponent
          itemId="item-switch"
          subtitleStreamIndex={10}
          serverUrl="https://jellyfin.example.com"
          token="token"
        />
      );
    });

    expect(capturedResult.cues[0].text).toBe("Track 10 Cue");

    await act(async () => {
      root.update(
        <TestComponent
          itemId="item-switch"
          subtitleStreamIndex={11}
          serverUrl="https://jellyfin.example.com"
          token="token"
        />
      );
    });

    expect(capturedResult.cues[0].text).toBe("Track 11 Cue");

    await act(async () => {
      root.update(
        <TestComponent
          itemId="item-switch"
          subtitleStreamIndex={null}
          serverUrl="https://jellyfin.example.com"
          token="token"
        />
      );
    });

    expect(capturedResult.cues).toEqual([]);
    expect(capturedResult.isCustomSubtitleActive).toBe(false);

    act(() => {
      root.unmount();
    });
  });
});
