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
    expect(plan.url).toBe("https://demo.jellyfin.org/Videos/item-123/stream?static=true");
    expect(plan.url).not.toContain(token);
    expect(plan.url).not.toContain("api_key=");
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
      "https://demo.jellyfin.org/Videos/item-123/stream?videoCodec=copy&audioCodec=copy"
    );
    expect(plan.url).not.toContain(token);
    expect(plan.url).not.toContain("api_key=");
    expect(plan.reason).toContain("unsupported; remuxing codecs directly");
  });

  it("selects Direct Stream for MKV when platform is 'ios'", () => {
    const item: MediaItem = {
      ...baseItem,
      mediaStreams: [
        { type: "Video", codec: "h264" },
        { type: "Audio", codec: "aac" }
      ]
    };

    const plan = createPlaybackPlan({
      item,
      serverUrl,
      token,
      container: "mkv",
      platform: "ios"
    });

    expect(plan.mode).toBe("direct-stream");
    expect(plan.reason).toContain("unsupported; remuxing codecs directly");
  });

  it("selects Direct Play for MKV when platform is 'android'", () => {
    const item: MediaItem = {
      ...baseItem,
      mediaStreams: [
        { type: "Video", codec: "h264" },
        { type: "Audio", codec: "aac" }
      ]
    };

    const plan = createPlaybackPlan({
      item,
      serverUrl,
      token,
      container: "mkv",
      platform: "android"
    });

    expect(plan.mode).toBe("direct-play");
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
    expect(plan.url).not.toContain(token);
    expect(plan.url).not.toContain("api_key=");
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
    expect(plan.url).not.toContain(token);
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
    expect(plan.url).not.toContain(token);
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
    expect(plan.url).not.toContain(token);
    expect(plan.audioCodec).toBe("aac");
  });

  it("does not embed authentication tokens in generated network playback URLs", () => {
    const directItem: MediaItem = {
      ...baseItem,
      mediaStreams: [
        { type: "Video", codec: "h264", width: 1920, height: 1080 },
        { type: "Audio", codec: "aac", channels: 2 }
      ]
    };
    const transcodeItem: MediaItem = {
      ...baseItem,
      mediaStreams: [
        { type: "Video", codec: "vc1", width: 1920, height: 1080 },
        { type: "Audio", codec: "aac", channels: 2 }
      ]
    };

    const plans = [
      createPlaybackPlan({ item: directItem, serverUrl, token, container: "mp4" }),
      createPlaybackPlan({ item: transcodeItem, serverUrl, token, container: "mp4" }),
      createPlaybackPlan({ item: directItem, serverUrl, token, container: "mp4", quality: "720p" })
    ];

    for (const plan of plans) {
      expect(plan.url).not.toContain(token);
      expect(plan.url).not.toMatch(/[?&](?:api_key|token)=/i);
    }
  });

  it("sanitizes token and api_key from legacy URLs", () => {
    const rawUrl = "https://demo.jellyfin.org/Videos/123/stream?static=true&api_key=super_secret_token";
    const sanitized = getSanitizedPlaybackUrl(rawUrl);

    expect(sanitized).not.toContain("super_secret_token");
    expect(sanitized).toContain("api_key=[REDACTED]");
  });

  describe("Quality Selection & Transcoding", () => {
    const fullHdItem: MediaItem = {
      ...baseItem,
      mediaStreams: [
        { type: "Video", codec: "h264", width: 1920, height: 1080 },
        { type: "Audio", codec: "aac", channels: 2 }
      ]
    };

    it("injects 720p quality parameters and transcodes when 720p is selected", () => {
      const plan = createPlaybackPlan({
        item: fullHdItem,
        serverUrl,
        token,
        container: "mp4",
        quality: "720p"
      });

      expect(plan.mode).toBe("transcode");
      expect(plan.quality).toBe("720p");
      expect(plan.maxWidth).toBe(1280);
      expect(plan.maxHeight).toBe(720);
      expect(plan.bitrate).toBe(4000000);
      expect(plan.url).toContain("maxWidth=1280&maxHeight=720&videoBitRate=4000000&maxVideoBitRate=4000000");
      expect(plan.url).toContain("videoCodec=h264");
      expect(plan.url).not.toContain(token);
      expect(plan.reason).toContain("Transcoding to requested quality: 720p HD - 4 Mbps");
    });

    it("injects 480p quality parameters when 480p is selected", () => {
      const plan = createPlaybackPlan({
        item: fullHdItem,
        serverUrl,
        token,
        container: "mp4",
        quality: "480p"
      });

      expect(plan.mode).toBe("transcode");
      expect(plan.quality).toBe("480p");
      expect(plan.maxWidth).toBe(854);
      expect(plan.maxHeight).toBe(480);
      expect(plan.bitrate).toBe(1500000);
      expect(plan.url).toContain("maxWidth=854&maxHeight=480&videoBitRate=1500000&maxVideoBitRate=1500000");
      expect(plan.url).not.toContain(token);
    });

    it("injects 1080p quality constraints for 4K media", () => {
      const fourKItem: MediaItem = {
        ...baseItem,
        mediaStreams: [
          { type: "Video", codec: "hevc", width: 3840, height: 2160 },
          { type: "Audio", codec: "aac", channels: 2 }
        ]
      };

      const plan = createPlaybackPlan({
        item: fourKItem,
        serverUrl,
        token,
        container: "mp4",
        quality: "1080p"
      });

      expect(plan.mode).toBe("transcode");
      expect(plan.quality).toBe("1080p");
      expect(plan.maxWidth).toBe(1920);
      expect(plan.maxHeight).toBe(1080);
      expect(plan.bitrate).toBe(10000000);
      expect(plan.url).toContain("maxWidth=1920&maxHeight=1080&videoBitRate=10000000");
      expect(plan.url).toContain("videoCodec=h264");
      expect(plan.url).not.toContain(token);
    });

    it("direct plays when quality is 'original' on supported media", () => {
      const plan = createPlaybackPlan({
        item: fullHdItem,
        serverUrl,
        token,
        container: "mp4",
        quality: "original"
      });

      expect(plan.mode).toBe("direct-play");
      expect(plan.quality).toBe("original");
      expect(plan.url).not.toContain("videoBitRate=");
      expect(plan.url).not.toContain(token);
    });

    it("always uses direct play for offline local files regardless of quality setting", () => {
      const plan = createPlaybackPlan({
        item: fullHdItem,
        serverUrl,
        token,
        localPath: "file:///data/user/0/finora/video.mp4",
        quality: "480p"
      });

      expect(plan.mode).toBe("direct-play");
      expect(plan.url).toBe("file:///data/user/0/finora/video.mp4");
      expect(plan.reason).toContain("Offline local file playback");
    });
  });

  describe("Forced transport (PLR-01 fallback)", () => {
    const compatItem: MediaItem = {
      ...baseItem,
      mediaStreams: [
        { type: "Video", codec: "h264" },
        { type: "Audio", codec: "aac" }
      ]
    };

    it("forces a full transcode even when direct play would be chosen", () => {
      const plan = createPlaybackPlan({
        item: compatItem,
        serverUrl,
        token,
        container: "mp4",
        forceMode: "transcode"
      });

      expect(plan.mode).toBe("transcode");
      expect(plan.url).toContain("master.m3u8");
      expect(plan.url).toContain("videoCodec=h264&audioCodec=aac");
      expect(plan.reason).toContain("Forced transcode fallback");
    });

    it("forces direct stream and direct play when requested", () => {
      const directStream = createPlaybackPlan({
        item: compatItem,
        serverUrl,
        token,
        container: "mp4",
        forceMode: "direct-stream"
      });
      expect(directStream.mode).toBe("direct-stream");
      expect(directStream.url).toContain("videoCodec=copy&audioCodec=copy");

      const directPlay = createPlaybackPlan({
        item: compatItem,
        serverUrl,
        token,
        container: "mp4",
        forceMode: "direct-play"
      });
      expect(directPlay.mode).toBe("direct-play");
      expect(directPlay.url).toContain("static=true");
    });

    it("still uses the local file for offline playback regardless of a forced mode", () => {
      const plan = createPlaybackPlan({
        item: compatItem,
        serverUrl,
        token,
        localPath: "file:///data/finora/video.mp4",
        forceMode: "transcode"
      });

      expect(plan.mode).toBe("direct-play");
      expect(plan.url).toBe("file:///data/finora/video.mp4");
    });
  });
});
