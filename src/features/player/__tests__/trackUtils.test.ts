import { normalizeLanguage, findMatchingAudioTrack, findMatchingSubtitleTrack } from "../trackUtils";
import { MediaStreamInfo } from "../../../types/media";

describe("trackUtils", () => {
  describe("normalizeLanguage", () => {
    it("normalizes common 3-letter codes to 2-letter codes", () => {
      expect(normalizeLanguage("fre")).toBe("fr");
      expect(normalizeLanguage("fra")).toBe("fr");
      expect(normalizeLanguage("eng")).toBe("en");
      expect(normalizeLanguage("spa")).toBe("es");
      expect(normalizeLanguage("deu")).toBe("de");
      expect(normalizeLanguage("jpn")).toBe("ja");
    });

    it("preserves 2-letter codes", () => {
      expect(normalizeLanguage("fr")).toBe("fr");
      expect(normalizeLanguage("en")).toBe("en");
      expect(normalizeLanguage("ja")).toBe("ja");
    });

    it("handles casing, whitespace, and undetermined language codes", () => {
      expect(normalizeLanguage("  FRA ")).toBe("fr");
      expect(normalizeLanguage("und")).toBe("");
      expect(normalizeLanguage(undefined)).toBe("");
      expect(normalizeLanguage(null)).toBe("");
      expect(normalizeLanguage("")).toBe("");
    });
  });

  describe("findMatchingAudioTrack", () => {
    const audioStreams: MediaStreamInfo[] = [
      {
        index: 1,
        type: "Audio",
        codec: "aac",
        channels: 2,
        isDefault: true,
        language: "eng",
        displayTitle: "English - AAC - Stereo"
      },
      {
        index: 2,
        type: "Audio",
        codec: "ac3",
        channels: 6,
        isDefault: false,
        language: "fre",
        displayTitle: "French - AC3 - 5.1"
      },
      {
        index: 5,
        type: "Audio",
        codec: "aac",
        channels: 2,
        isDefault: false,
        language: "jpn",
        displayTitle: "Japanese - Original"
      }
    ];

    it("returns undefined if availableTracks or targetStreamIndex is invalid", () => {
      expect(findMatchingAudioTrack([], audioStreams, 1)).toBeUndefined();
      expect(findMatchingAudioTrack(undefined as any, audioStreams, 1)).toBeUndefined();
      expect(findMatchingAudioTrack([{ id: "1" }], audioStreams, undefined)).toBeUndefined();
    });

    it("matches track by exact ID", () => {
      const availableTracks = [
        { id: "1", language: "eng", label: "English" },
        { id: "2", language: "fra", label: "French" }
      ];

      const match = findMatchingAudioTrack(availableTracks, audioStreams, 2);
      expect(match).toEqual(availableTracks[1]);
    });

    it("matches track by normalized language code (fre vs fra)", () => {
      const availableTracks = [
        { id: "track-a", language: "en", label: "Track 1" },
        { id: "track-b", language: "fra", label: "Track 2" }
      ];

      const match = findMatchingAudioTrack(availableTracks, audioStreams, 2);
      expect(match).toEqual(availableTracks[1]);
    });

    it("matches track by label matching stream displayTitle", () => {
      const availableTracks = [
        { id: "custom-1", language: "und", label: "English" },
        { id: "custom-2", language: "und", label: "French" }
      ];

      const match = findMatchingAudioTrack(availableTracks, audioStreams, 2);
      expect(match).toEqual(availableTracks[1]);
    });

    it("falls back to container ordinal index if IDs or languages are missing", () => {
      const availableTracks = [
        { id: "x", language: undefined, label: "Audio 1" },
        { id: "y", language: undefined, label: "Audio 2" },
        { id: "z", language: undefined, label: "Audio 3" }
      ];

      // Stream index 5 is ordinal 2 in audioStreams
      const match = findMatchingAudioTrack(availableTracks, audioStreams, 5);
      expect(match).toEqual(availableTracks[2]);
    });

    it("returns undefined when available tracks only contain another language (rejects false positive)", () => {
      // In HLS / server transcode, often only 1 track (e.g. English) is available in memory
      const singleTrackEnglish = [
        { id: "2", language: "en", label: "English" }
      ];

      // Requesting French (index 2 in audioStreams) MUST NOT return English just because id === "2" or ordinal === 0
      const match = findMatchingAudioTrack(singleTrackEnglish, audioStreams, 2);
      expect(match).toBeUndefined();
    });

    it("does not fall back to ordinal if language conflicts", () => {
      const conflictingTracks = [
        { id: "10", language: "de", label: "German" },
        { id: "11", language: "es", label: "Spanish" }
      ];

      // Stream index 1 is English; neither German nor Spanish should be returned
      const match = findMatchingAudioTrack(conflictingTracks, audioStreams, 1);
      expect(match).toBeUndefined();
    });
  });

  describe("findMatchingSubtitleTrack", () => {
    const subtitleStreams: MediaStreamInfo[] = [
      {
        index: 3,
        type: "Subtitle",
        codec: "subrip",
        language: "eng",
        displayTitle: "English [CC]"
      },
      {
        index: 4,
        type: "Subtitle",
        codec: "subrip",
        language: "fre",
        displayTitle: "Français"
      }
    ];

    it("returns undefined if target index is null or available tracks is empty", () => {
      expect(findMatchingSubtitleTrack([], subtitleStreams, 3)).toBeUndefined();
      expect(findMatchingSubtitleTrack([{ id: "3" }], subtitleStreams, null)).toBeUndefined();
    });

    it("matches subtitle track by ID or language", () => {
      const availableTracks = [
        { id: "3", language: "en", label: "English" },
        { id: "4", language: "fr", label: "French" }
      ];

      expect(findMatchingSubtitleTrack(availableTracks, subtitleStreams, 3)).toEqual(availableTracks[0]);
      expect(findMatchingSubtitleTrack(availableTracks, subtitleStreams, 4)).toEqual(availableTracks[1]);
    });
  });
});
