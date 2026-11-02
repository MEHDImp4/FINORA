import {
  isTranscodedQuality,
  stripTokensFromUrl
} from "../download/DownloadResumeService";

describe("download architecture helpers", () => {
  it("keeps resume limited to original-file downloads", () => {
    expect(isTranscodedQuality("original")).toBe(false);
    expect(isTranscodedQuality("720p")).toBe(true);
  });

  it("removes credential query parameters before persistence", () => {
    const sanitized = stripTokensFromUrl(
      "https://jellyfin.example.test/Videos/1?api_key=secret&Token=secret2&mediaSourceId=abc"
    );
    expect(sanitized).not.toContain("secret");
    expect(sanitized).toContain("mediaSourceId=abc");
  });
});
