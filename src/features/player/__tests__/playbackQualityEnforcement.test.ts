import { MediaItem } from "../../../types/media";
import { createPlaybackPlan } from "../playbackPlanner";

describe("Playback quality enforcement", () => {
  const serverUrl = "https://demo.jellyfin.org";
  const baseItem: MediaItem = {
    id: "quality-item",
    name: "Quality Test",
    type: "Movie",
    genres: [],
    playbackPositionTicks: 0,
    totalTicks: 1000000,
    playedPercentage: 0,
    isPlayed: false,
    isFavorite: false,
    container: "mp4"
  };

  it("re-encodes 1080p video when source bitrate exceeds the selected 10 Mbps cap", () => {
    const item: MediaItem = {
      ...baseItem,
      mediaStreams: [
        { type: "Video", codec: "h264", width: 1920, height: 1080, bitRate: 25000000 },
        { type: "Audio", codec: "aac", channels: 2 }
      ]
    };

    const plan = createPlaybackPlan({ item, serverUrl, quality: "1080p" });

    expect(plan.mode).toBe("transcode");
    expect(plan.videoCodec).toBe("h264");
    expect(plan.url).toContain("videoCodec=h264");
    expect(plan.url).toContain("maxVideoBitRate=10000000");
  });

  it("allows video copy when 1080p source is already below the selected bitrate cap", () => {
    const item: MediaItem = {
      ...baseItem,
      mediaStreams: [
        { type: "Video", codec: "h264", width: 1920, height: 1080, bitRate: 8000000 },
        { type: "Audio", codec: "aac", channels: 2 }
      ]
    };

    const plan = createPlaybackPlan({ item, serverUrl, quality: "1080p" });

    expect(plan.mode).toBe("transcode");
    expect(plan.videoCodec).toBe("copy");
    expect(plan.url).toContain("videoCodec=copy");
    expect(plan.url).toContain("maxVideoBitRate=10000000");
  });

  it("re-encodes when source bitrate is unknown so an explicit quality cap cannot be bypassed", () => {
    const item: MediaItem = {
      ...baseItem,
      mediaStreams: [
        { type: "Video", codec: "h264", width: 1920, height: 1080 },
        { type: "Audio", codec: "aac", channels: 2 }
      ]
    };

    const plan = createPlaybackPlan({ item, serverUrl, quality: "1080p" });

    expect(plan.mode).toBe("transcode");
    expect(plan.videoCodec).toBe("h264");
    expect(plan.url).toContain("maxVideoBitRate=10000000");
  });

  it("transcodes Auto playback that exceeds Android resolution and bitrate limits", () => {
    const item: MediaItem = {
      ...baseItem,
      mediaStreams: [
        { type: "Video", codec: "h264", width: 7680, height: 4320, bitRate: 160000000 },
        { type: "Audio", codec: "aac", channels: 2 }
      ]
    };

    const plan = createPlaybackPlan({
      item,
      serverUrl,
      quality: "auto",
      platform: "android"
    });

    expect(plan.mode).toBe("transcode");
    expect(plan.videoCodec).toBe("h264");
    expect(plan.url).toContain("maxWidth=3840&maxHeight=2160");
    expect(plan.url).toContain("maxVideoBitRate=100000000");
    expect(plan.reason).toContain("resolution 7680x4320 exceeds 3840x2160");
    expect(plan.reason).toContain("bitrate 160000000 exceeds 100000000");
  });

  it("keeps supported 4K Android media in Direct Play when Auto stays within the device profile", () => {
    const item: MediaItem = {
      ...baseItem,
      mediaStreams: [
        { type: "Video", codec: "hevc", width: 3840, height: 2160, bitRate: 80000000 },
        { type: "Audio", codec: "aac", channels: 2 }
      ]
    };

    const plan = createPlaybackPlan({
      item,
      serverUrl,
      quality: "auto",
      platform: "android"
    });

    expect(plan.mode).toBe("direct-play");
    expect(plan.videoCodec).toBe("hevc");
  });

  it("preserves Original as an explicit unrestricted source-quality choice", () => {
    const item: MediaItem = {
      ...baseItem,
      mediaStreams: [
        { type: "Video", codec: "h264", width: 7680, height: 4320, bitRate: 160000000 },
        { type: "Audio", codec: "aac", channels: 2 }
      ]
    };

    const plan = createPlaybackPlan({
      item,
      serverUrl,
      quality: "original",
      platform: "android"
    });

    expect(plan.mode).toBe("direct-play");
    expect(plan.quality).toBe("original");
    expect(plan.url).not.toContain("maxVideoBitRate=");
    expect(plan.url).not.toContain("maxWidth=");
  });
});
