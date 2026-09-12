import { createPlaybackPlan, getSanitizedPlaybackUrl } from "../playbackPlanner";
import { getDefaultDeviceProfile } from "../deviceProfile";
import { MediaItem } from "../../../types/media";

describe("PlaybackPlanner", () => {
  const baseItem: MediaItem = {
    id: "item-123",
    name: "Interstellar",
    type: "Movie",
    genres: ["Sci-Fi"],
    playbackPositionTicks: 0,
    totalTicks: 1000000,
    playedPercentage: 0,
    isPlayed: false,
    isFavorite: false
  };

  const serverUrl = "https://demo.jellyfin.org";
  const token = "secure-token-abc-999";

  it("selects Direct Play when container and codecs are natively supported", () => {
    const item: MediaItem = {
      ...baseItem,
      mediaStreams: [
        { type: "Video", codec: "h264", width: 1920, height: 1080 },
        { type: "Audio", codec: "aac", channels: 2 }
      ]
    };

    const plan = createPlaybackPlan({
      item,
      serverUrl,
      token,
      container: "mp4"
    });

    expect(plan.mode).toBe("direct-play");
    expect(plan.url).toBe("https://demo.jellyfin.org/Videos/item-123/stream?static=true&api_key=secure-token-abc-999");
    expect(plan.videoCodec).toBe("h264");
    expect(plan.audioCodec).toBe("aac");
  });

  it("selects Direct Stream when container is unsupported but codecs match", () => {
    const item: MediaItem = {
      ...baseItem,
      mediaStreams: [
        { type: "Video", codec: "h264" },
        { type: "Audio", codec: "aac" }
      ]
    };

    const iosProfile = getDefaultDeviceProfile("ios"); // does not support mkv
    const plan = createPlaybackPlan({
      item,
      serverUrl,
      token,
      container: "mkv",
      deviceProfile: iosProfile
    });

    expect(plan.mode).toBe("direct-stream");
    expect(plan.url).toBe(
      "https://demo.jellyfin.org/Videos/item-123/stream?videoCodec=copy&audioCodec=copy&api_key=secure-token-abc-999"
    );
    expect(plan.reason).toContain("unsupported; remuxing codecs directly");
  });

  it("selects Transcoding when video codec is unsupported", () => {
    const item: MediaItem = {
      ...baseItem,
      mediaStreams: [
        { type: "Video", codec: "vc1" },
        { type: "Audio", codec: "aac" }
      ]
    };

    const plan = createPlaybackPlan({
      item,
      serverUrl,
      token,
      container: "mp4"
    });

    expect(plan.mode).toBe("transcode");
    expect(plan.url).toContain("master.m3u8?videoCodec=h264&audioCodec=aac");
    expect(plan.reason).toContain("video codec 'vc1'");
  });

  it("selects Transcoding when audio codec is unsupported", () => {
    const item: MediaItem = {
      ...baseItem,
      mediaStreams: [
        { type: "Video", codec: "h264" },
        { type: "Audio", codec: "dts-hd" }
      ]
    };

    const plan = createPlaybackPlan({
      item,
      serverUrl,
      token,
      container: "mp4"
    });

    expect(plan.mode).toBe("transcode");
    expect(plan.url).toContain("master.m3u8");
    expect(plan.reason).toContain("audio codec 'dts-hd'");
  });

  it("handles fallback when no mediaStreams metadata is available", () => {
    const plan = createPlaybackPlan({
      item: baseItem,
      serverUrl,
      token,
      container: "mp4"
    });

    expect(plan.mode).toBe("direct-play");
  });

  it("selects Direct Stream with AudioStreamIndex when a non-default audio track is selected", () => {
    const item: MediaItem = {
      ...baseItem,
      mediaStreams: [
        { type: "Video", codec: "h264", width: 1920, height: 1080 },
        { type: "Audio", index: 1, codec: "aac", channels: 2, isDefault: true, language: "eng" },
        { type: "Audio", index: 2, codec: "aac", channels: 2, isDefault: false, language: "fre" }
      ]
    };

    const plan = createPlaybackPlan({
      item,
      serverUrl,
      token,
      container: "mp4",
      audioStreamIndex: 2
    });

    expect(plan.mode).toBe("direct-stream");
    expect(plan.url).toContain("AudioStreamIndex=2");
    expect(plan.url).toContain("videoCodec=copy&audioCodec=copy");
    expect(plan.audioCodec).toBe("copy");
  });

  it("transcodes audio with AudioStreamIndex when selected audio track is DTS", () => {
    const item: MediaItem = {
      ...baseItem,
      mediaStreams: [
        { type: "Video", codec: "h264", width: 1920, height: 1080 },
        { type: "Audio", index: 1, codec: "aac", channels: 2, isDefault: true, language: "eng" },
        { type: "Audio", index: 2, codec: "dts", channels: 6, isDefault: false, language: "fre" }
      ]
    };

    const plan = createPlaybackPlan({
      item,
      serverUrl,
      token,
      container: "mp4",
      audioStreamIndex: 2
    });

    expect(plan.mode).toBe("direct-stream");
    expect(plan.url).toContain("AudioStreamIndex=2");
    expect(plan.url).toContain("videoCodec=copy&audioCodec=aac&audioChannels=2");
    expect(plan.audioCodec).toBe("aac");
  });

  it("sanitizes token and api_key from URLs", () => {
    const rawUrl = "https://demo.jellyfin.org/Videos/123/stream?static=true&api_key=super_secret_token";
    const sanitized = getSanitizedPlaybackUrl(rawUrl);

    expect(sanitized).not.toContain("super_secret_token");
    expect(sanitized).toContain("api_key=[REDACTED]");
  });
});
