import {
  getCreditsStartSeconds,
  getNextEpisodePromptStartSeconds,
  NEXT_EPISODE_FALLBACK_SECONDS
} from "../nextEpisodeTiming";

describe("nextEpisodeTiming", () => {
  it("uses Jellyfin CreditsStart when available", () => {
    const chapters = [
      { name: "Chapter 1", startPositionTicks: 0, markerType: "Chapter" as const },
      { name: "Credits", startPositionTicks: 1_500_000_000, markerType: "CreditsStart" as const }
    ];

    expect(getCreditsStartSeconds(chapters)).toBe(150);
    expect(getNextEpisodePromptStartSeconds(chapters, 180)).toBe(150);
  });

  it("recognizes common outro chapter names", () => {
    expect(
      getCreditsStartSeconds([
        { name: "Générique de fin", startPositionTicks: 1_200_000_000, markerType: "Chapter" }
      ])
    ).toBe(120);
  });

  it("falls back to ten seconds before the real end", () => {
    expect(getNextEpisodePromptStartSeconds(undefined, 180)).toBe(
      180 - NEXT_EPISODE_FALLBACK_SECONDS
    );
  });

  it("returns null when duration is unknown", () => {
    expect(getNextEpisodePromptStartSeconds(undefined, 0)).toBeNull();
  });
});
