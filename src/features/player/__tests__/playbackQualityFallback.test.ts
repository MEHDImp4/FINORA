import { createPlaybackPlan } from "../playbackPlanner";
import { MediaItem } from "../../../types/media";

const serverUrl = "https://demo.jellyfin.org";

function makeItem(codec = "hevc"): MediaItem {
  return {
    id: "episode-quality-1",
    name: "Quality Test",
    type: "Episode",
    genres: [],
    playbackPositionTicks: 0,
    totalTicks: 12_000_000_000,
    playedPercentage: 0,
    isPlayed: false,
    isFavorite: false,
    container: "mkv",
    mediaSourceId: "source-1",
    mediaStreams: [
      { type: "Video", codec, width: 1920, height: 1080, bitRate: 12_000_000 },
      { type: "Audio", codec: "aac", channels: 2, isDefault: true }
    ]
  };
}

describe("quality-aware compatibility fallback", () => {
  it("keeps a manual 480p selection authoritative after direct-play fallback", () => {
    const plan = createPlaybackPlan({
      item: makeItem(),
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
    expect(plan.url).toContain("videoCodec=h264");
    expect(plan.url).toContain("maxWidth=854");
    expect(plan.url).toContain("maxHeight=480");
    expect(plan.url).toContain("videoBitRate=1500000");
  });

  it("uses an explicit high-quality 1080p target for Auto compatibility fallback", () => {
    const plan = createPlaybackPlan({
      item: makeItem(),
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

  it("also constrains automatic transcoding when the source codec itself is unsupported", () => {
    const plan = createPlaybackPlan({
      item: makeItem("vc1"),
      serverUrl,
      platform: "android",
      quality: "auto"
    });

    expect(plan.mode).toBe("transcode");
    expect(plan.videoCodec).toBe("h264");
    expect(plan.maxWidth).toBe(1920);
    expect(plan.maxHeight).toBe(1080);
    expect(plan.bitrate).toBe(20_000_000);
    expect(plan.url).toContain("videoBitRate=20000000");
  });
});
