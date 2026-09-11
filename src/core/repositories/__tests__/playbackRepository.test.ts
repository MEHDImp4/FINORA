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
});
