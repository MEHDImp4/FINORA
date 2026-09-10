import {
  buildImageUrl,
  getPosterUrl,
  getBackdropUrl,
  getLogoUrl
} from "../imageUrlBuilder";

describe("imageUrlBuilder", () => {
  const baseUrl = "https://jellyfin.example.com";
  const itemId = "item-12345";

  it("constructs full image url with fillWidth, quality and tag", () => {
    const url = buildImageUrl(baseUrl, itemId, "Primary", {
      width: 400,
      quality: 90,
      tag: "tag-abc"
    });

    expect(url).toContain("https://jellyfin.example.com/Items/item-12345/Images/Primary");
    expect(url).toContain("fillWidth=400");
    expect(url).toContain("quality=90");
    expect(url).toContain("tag=tag-abc");
  });

  it("handles empty baseUrl or itemId gracefully", () => {
    expect(buildImageUrl("", itemId)).toBe("");
    expect(buildImageUrl(baseUrl, "")).toBe("");
  });

  it("getPosterUrl generates poster with default width 340", () => {
    const url = getPosterUrl(baseUrl, itemId, "poster-tag");
    expect(url).toContain("/Items/item-12345/Images/Primary");
    expect(url).toContain("fillWidth=340");
    expect(url).toContain("tag=poster-tag");
  });

  it("getBackdropUrl generates backdrop with default width 1080", () => {
    const url = getBackdropUrl(baseUrl, itemId, "backdrop-tag");
    expect(url).toContain("/Items/item-12345/Images/Backdrop");
    expect(url).toContain("fillWidth=1080");
    expect(url).toContain("quality=80");
  });

  it("getLogoUrl generates logo with default width 400", () => {
    const url = getLogoUrl(baseUrl, itemId);
    expect(url).toContain("/Items/item-12345/Images/Logo");
    expect(url).toContain("fillWidth=400");
  });
});
