import {
  DOWNLOAD_QUALITIES,
  buildDownloadUrl,
  DownloadQuality
} from "../downloadQuality";

describe("Download Quality & Transcoding URL Builder", () => {
  const serverUrl = "https://jellyfin.example.com";
  const itemId = "movie-123";
  const token = "secret-token-xyz";

  it("builds raw download URL for original quality without transcoding", () => {
    const url = buildDownloadUrl(serverUrl, itemId, token, "original");
    expect(url).toBe("https://jellyfin.example.com/Items/movie-123/Download?api_key=secret-token-xyz");
    expect(url).not.toContain("stream.mp4");
  });

  it("builds progressive MP4 transcode URL for 720p HD", () => {
    const url = buildDownloadUrl(serverUrl, itemId, token, "720p");
    expect(url).toContain("/Videos/movie-123/stream.mp4?");
    expect(url).toContain("videoCodec=h264");
    expect(url).toContain("audioCodec=aac");
    expect(url).toContain("maxHeight=720");
    expect(url).toContain("videoBitRate=3500000");
    expect(url).toContain("api_key=secret-token-xyz");
  });

  it("builds progressive MP4 transcode URL for 1080p Full HD", () => {
    const url = buildDownloadUrl(serverUrl, itemId, token, "1080p");
    expect(url).toContain("/Videos/movie-123/stream.mp4?");
    expect(url).toContain("maxHeight=1080");
    expect(url).toContain("videoBitRate=7500000");
  });

  it("builds progressive MP4 transcode URL for 480p SD", () => {
    const url = buildDownloadUrl(serverUrl, itemId, token, "480p");
    expect(url).toContain("/Videos/movie-123/stream.mp4?");
    expect(url).toContain("maxHeight=480");
    expect(url).toContain("videoBitRate=1500000");
  });

  it("contains 4 quality profiles with 720p recommended", () => {
    expect(DOWNLOAD_QUALITIES).toHaveLength(4);
    const recommended = DOWNLOAD_QUALITIES.find((q) => q.id === "720p");
    expect(recommended?.badge).toBe("Recommandé");
  });
});
