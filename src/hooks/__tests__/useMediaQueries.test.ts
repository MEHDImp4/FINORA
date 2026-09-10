import { mediaKeys } from "../useMediaQueries";

describe("useMediaQueries", () => {
  describe("mediaKeys", () => {
    it("generates predictable hierarchical keys", () => {
      expect(mediaKeys.all).toEqual(["media"]);
      expect(mediaKeys.libraries("user-1")).toEqual(["media", "libraries", "user-1"]);
      expect(mediaKeys.resume("user-1", 10)).toEqual(["media", "resume", "user-1", 10]);
      expect(mediaKeys.recentlyAdded("user-1", "parent-9", 15)).toEqual([
        "media",
        "recentlyAdded",
        "user-1",
        "parent-9",
        15
      ]);
      expect(mediaKeys.detail("user-1", "item-99")).toEqual([
        "media",
        "detail",
        "user-1",
        "item-99"
      ]);
      expect(mediaKeys.items("user-1", "parent-2", { limit: 5 })).toEqual([
        "media",
        "items",
        "user-1",
        "parent-2",
        { limit: 5 }
      ]);
    });
  });
});
