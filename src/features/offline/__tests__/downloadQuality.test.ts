import {
  DOWNLOAD_QUALITIES,
  buildDownloadUrl,
  estimateTranscodedBytes
} from "../downloadQuality";

describe("Download Quality & Transcoding URL Builder", () => {
  const serverUrl = "https://jellyfin.example.com";
  const itemId = "movie-123";
  const token = "secret-token-xyz";

  it("builds raw download URL for original quality without credentials", () => {
    const url = buildDownloadUrl(serverUrl, itemId, token, "original");
    expect(url).toBe("https://jellyfin.example.com/Items/movie-123/Download");
    expect(url).not.toContain("stream.mp4");
    expect(url).not.toContain(token);
    expect(url).not.toContain("api_key=");
  });

  it("builds progressive MP4 transcode URL for 720p HD without credentials", () => {
    const url = buildDownloadUrl(serverUrl, itemId, token, "720p");
    expect(url).toContain("/Videos/movie-123/stream.mp4?");
    expect(url).toContain("videoCodec=h264");
    expect(url).toContain("audioCodec=aac");
    expect(url).toContain("maxHeight=720");
    expect(url).toContain("videoBitRate=3500000");
    expect(url).not.toContain(token);
    expect(url).not.toContain("api_key=");
  });

  it("builds progressive MP4 transcode URL for 1080p Full HD", () => {
    const url = buildDownloadUrl(serverUrl, itemId, token, "1080p");
    expect(url).toContain("/Videos/movie-123/stream.mp4?");
    expect(url).toContain("maxHeight=1080");
    expect(url).toContain("videoBitRate=7500000");
    expect(url).not.toContain(token);
  });

  it("builds progressive MP4 transcode URL for 480p SD", () => {
    const url = buildDownloadUrl(serverUrl, itemId, token, "480p");
    expect(url).toContain("/Videos/movie-123/stream.mp4?");
    expect(url).toContain("maxHeight=480");
    expect(url).toContain("videoBitRate=1500000");
    expect(url).not.toContain(token);
  });

  it("contains 4 quality profiles with original recommended", () => {
    expect(DOWNLOAD_QUALITIES).toHaveLength(4);
    const recommended = DOWNLOAD_QUALITIES.find((q) => q.id === "original");
    expect(recommended?.badge).toBe("Recommandé");
  });

  it("defaults to original quality when no quality is specified", () => {
    const url = buildDownloadUrl(serverUrl, itemId, token);
    expect(url).toBe("https://jellyfin.example.com/Items/movie-123/Download");
    expect(url).not.toContain(token);
  });

  it("builds correct authentication headers for Jellyfin downloads", () => {
    const { getDownloadHeaders } = require("../downloadQuality");
    const headers = getDownloadHeaders("token-abc-123");
    expect(headers["X-Emby-Token"]).toBe("token-abc-123");
    expect(headers["Authorization"]).toContain('Token="token-abc-123"');
    expect(headers["Authorization"]).toContain('Client="Finora"');

    const empty = getDownloadHeaders("");
    expect(empty).toEqual({});
  });
});

describe("estimateTranscodedBytes", () => {
  // Jellyfin ticks: 10 000 000 per second → 24 minutes = 14 400 s
  const TWENTY_FOUR_MIN_TICKS = 24 * 60 * 10_000_000;

  it("estimates a size for transcoded profiles from duration × bitrate", () => {
    // 1080p targets 7 500 000 bps video + 128 000 bps audio over 1440 s
    const bytes = estimateTranscodedBytes("1080p", TWENTY_FOUR_MIN_TICKS);
    const expected = Math.round(((7_500_000 + 128_000) * 1440) / 8);
    expect(bytes).toBe(expected);
    // ~1.37 GB — sanity check the magnitude
    expect(bytes).toBeGreaterThan(1_300_000_000);
    expect(bytes).toBeLessThan(1_450_000_000);
  });

  it("scales the estimate with the duration", () => {
    const short = estimateTranscodedBytes("720p", 60 * 10_000_000) as number;
    const long = estimateTranscodedBytes("720p", 120 * 10_000_000) as number;
    expect(long).toBe(short * 2);
  });

  it("returns undefined for original quality (real Content-Length is used)", () => {
    expect(estimateTranscodedBytes("original", TWENTY_FOUR_MIN_TICKS)).toBeUndefined();
  });

  it("returns undefined when the duration is unknown", () => {
    expect(estimateTranscodedBytes("1080p")).toBeUndefined();
    expect(estimateTranscodedBytes("1080p", 0)).toBeUndefined();
  });
});
