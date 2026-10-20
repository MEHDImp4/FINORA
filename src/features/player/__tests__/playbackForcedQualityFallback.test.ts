import { createPlaybackPlan } from "../playbackPlanner";
import { DeviceProfile } from "../deviceProfile";
import { MediaItem } from "../../../types/media";

const serverUrl = "https://demo.jellyfin.org";

const item: MediaItem = {
  id: "episode-quality-fallback",
  name: "Quality Fallback",
  type: "Episode",
  genres: [],
  playbackPositionTicks: 0,
  totalTicks: 12_000_000_000,
  playedPercentage: 0,
  isPlayed: false,
  isFavorite: false,
  container: "mp4",
  mediaSourceId: "source-1",
  mediaStreams: [
    { type: "Video", codec: "h264", width: 1920, height: 1080, bitRate: 12_000_000 },
    { type: "Audio", codec: "aac", channels: 2, isDefault: true }
  ]
};

describe("quality-aware forced compatibility fallback", () => {
  it("keeps a manual 480p selection authoritative", () => {
    const plan = createPlaybackPlan({
      item,
      serverUrl,
      platform: "android",
      quality: "480p",
      forceMode: "transcode"
    });

    expect(plan.mode).toBe("transcode");
    expect(plan.quality).toBe("480p");
    expect(plan.maxWidth).toBe(854);
    expect(plan.maxHeight).toBe(480);
    expect(plan.bitrate).toBe(1_500_000);
    expect(plan.url).toContain("maxWidth=854");
    expect(plan.url).toContain("maxHeight=480");
    expect(plan.url).toContain("videoBitRate=1500000");
    expect(plan.url).toContain("maxVideoBitRate=1500000");
  });

  it("gives Auto an explicit source-aware compatibility target", () => {
    const plan = createPlaybackPlan({
      item,
      serverUrl,
      platform: "android",
      quality: "auto",
      forceMode: "transcode"
    });

    expect(plan.mode).toBe("transcode");
    expect(plan.quality).toBe("auto");
    expect(plan.maxWidth).toBe(1920);
    expect(plan.maxHeight).toBe(1080);
    expect(plan.bitrate).toBe(20_000_000);
    expect(plan.url).toContain("maxWidth=1920");
    expect(plan.url).toContain("maxHeight=1080");
    expect(plan.url).toContain("videoBitRate=20000000");
  });

  it("keeps Auto within explicit device limits", () => {
    const limitedProfile: DeviceProfile = {
      supportedContainers: ["mp4"],
      supportedVideoCodecs: ["h264"],
      supportedAudioCodecs: ["aac"],
      maxResolution: { width: 1280, height: 720 },
      maxBitrate: 5_000_000
    };

    const plan = createPlaybackPlan({
      item,
      serverUrl,
      quality: "auto",
      forceMode: "transcode",
      deviceProfile: limitedProfile
    });

    expect(plan.maxWidth).toBe(1280);
    expect(plan.maxHeight).toBe(720);
    expect(plan.bitrate).toBe(5_000_000);
    expect(plan.url).toContain("maxWidth=1280");
    expect(plan.url).toContain("maxHeight=720");
    expect(plan.url).toContain("videoBitRate=5000000");
  });

  it("does not silently cap Original during forced codec recovery", () => {
    const plan = createPlaybackPlan({
      item,
      serverUrl,
      platform: "android",
      quality: "original",
      forceMode: "transcode"
    });

    expect(plan.mode).toBe("transcode");
    expect(plan.quality).toBe("original");
    expect(plan.maxWidth).toBeUndefined();
    expect(plan.maxHeight).toBeUndefined();
    expect(plan.bitrate).toBeUndefined();
    expect(plan.url).not.toContain("maxWidth=");
    expect(plan.url).not.toContain("videoBitRate=");
  });
});
