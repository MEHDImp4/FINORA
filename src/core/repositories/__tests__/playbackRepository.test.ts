import { PlaybackRepository } from "../playbackRepository";
import { HttpClient } from "../../network/httpClient";

describe("PlaybackRepository", () => {
  let mockHttpClient: jest.Mocked<HttpClient>;
  let repository: PlaybackRepository;

  beforeEach(() => {
    mockHttpClient = {
      request: jest.fn().mockResolvedValue({})
    } as unknown as jest.Mocked<HttpClient>;

    repository = new PlaybackRepository({
      getHttpClient: () => mockHttpClient
    } as any);
  });

  it("reports playback start to /Sessions/Playing", async () => {
    await repository.reportPlaybackStart({
      itemId: "movie-1",
      mediaSourceId: "src-1",
      positionTicks: 10000000,
      playMethod: "DirectPlay"
    });

    expect(mockHttpClient.request).toHaveBeenCalledWith("/Sessions/Playing", {
      method: "POST",
      body: JSON.stringify({
        ItemId: "movie-1",
        MediaSourceId: "src-1",
        PositionTicks: 10000000,
        PlayMethod: "DirectPlay",
        AudioStreamIndex: undefined,
        SubtitleStreamIndex: undefined,
        CanSeek: true
      })
    });
  });

  it("reports playback progress to /Sessions/Playing/Progress", async () => {
    await repository.reportPlaybackProgress({
      itemId: "movie-1",
      positionTicks: 25000000,
      isPaused: true,
      eventName: "Pause"
    });

    expect(mockHttpClient.request).toHaveBeenCalledWith("/Sessions/Playing/Progress", {
      method: "POST",
      body: JSON.stringify({
        ItemId: "movie-1",
        MediaSourceId: "movie-1",
        PositionTicks: 25000000,
        IsPaused: true,
        EventName: "Pause"
      })
    });
  });

  it("reports playback stop to /Sessions/Playing/Stopped", async () => {
    await repository.reportPlaybackStopped({
      itemId: "movie-1",
      positionTicks: 60000000
    });

    expect(mockHttpClient.request).toHaveBeenCalledWith("/Sessions/Playing/Stopped", {
      method: "POST",
      params: {
        ItemId: "movie-1",
        MediaSourceId: "movie-1",
        PositionTicks: 60000000
      },
      body: JSON.stringify({
        ItemId: "movie-1",
        MediaSourceId: "movie-1",
        PositionTicks: 60000000
      })
    });
  });

  it("handles network errors gracefully without crashing or throwing", async () => {
    mockHttpClient.request.mockRejectedValueOnce(new Error("Network disconnect"));

    // Should not throw
    await expect(
      repository.reportPlaybackProgress({
        itemId: "movie-1",
        positionTicks: 1234
      })
    ).resolves.not.toThrow();
  });

  it("includes PlaySessionId and stream indices in reporting payloads (PLR-03)", async () => {
    await repository.reportPlaybackStart({
      itemId: "movie-1",
      mediaSourceId: "src-1",
      playSessionId: "ps-1",
      positionTicks: 0,
      playMethod: "Transcode",
      audioStreamIndex: 2,
      subtitleStreamIndex: 5
    });
    const calls = mockHttpClient.request.mock.calls;
    const startBody = JSON.parse(calls[0]![1]!.body as string);
    expect(startBody.PlaySessionId).toBe("ps-1");
    expect(startBody.AudioStreamIndex).toBe(2);
    expect(startBody.SubtitleStreamIndex).toBe(5);

    await repository.reportPlaybackProgress({
      itemId: "movie-1",
      playSessionId: "ps-1",
      positionTicks: 10,
      audioStreamIndex: 2,
      subtitleStreamIndex: 5
    });
    const progressCall = calls[1]![1]!;
    const progressBody = JSON.parse(progressCall.body as string);
    expect(progressBody.PlaySessionId).toBe("ps-1");
    expect(progressBody.AudioStreamIndex).toBe(2);
    expect(progressBody.SubtitleStreamIndex).toBe(5);

    await repository.reportPlaybackStopped({
      itemId: "movie-1",
      playSessionId: "ps-1",
      positionTicks: 99
    });
    const stopCall = calls[2]![1]!;
    expect((stopCall.params as Record<string, unknown>).PlaySessionId).toBe("ps-1");
    expect(JSON.parse(stopCall.body as string).PlaySessionId).toBe("ps-1");
  });

  it("retries a transient Stop failure once and then succeeds", async () => {
    mockHttpClient.request
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValueOnce({});

    await repository.reportPlaybackStopped({ itemId: "movie-1", positionTicks: 1 });

    expect(mockHttpClient.request).toHaveBeenCalledTimes(2);
  }, 10000);

  it("gives up after two failed Stop attempts without throwing", async () => {
    mockHttpClient.request.mockRejectedValue(new Error("down"));

    await expect(
      repository.reportPlaybackStopped({ itemId: "movie-1" })
    ).resolves.toBeUndefined();

    expect(mockHttpClient.request).toHaveBeenCalledTimes(2);
  }, 10000);
});
