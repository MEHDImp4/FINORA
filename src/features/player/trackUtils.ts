import { MediaStreamInfo } from "../../types/media";

/**
 * Normalizes 2-letter and 3-letter ISO language codes to a common baseline (ISO 639-1)
 * so that Jellyfin metadata ("fre", "fra", "fr") matches native player track representations.
 */
export function normalizeLanguage(lang?: string | null): string {
  if (!lang) return "";
  const cleaned = lang.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned || cleaned === "und") return "";

  const isoMap: Record<string, string> = {
    fre: "fr",
    fra: "fr",
    eng: "en",
    spa: "es",
    deu: "de",
    ger: "de",
    ita: "it",
    jpn: "ja",
    kor: "ko",
    chi: "zh",
    zho: "zh",
    rus: "ru",
    por: "pt",
    ara: "ar",
    hin: "hi",
    dut: "nl",
    nld: "nl",
    swe: "sv",
    nor: "no",
    dan: "da",
    fin: "fi",
    pol: "pl",
    tur: "tr",
    ces: "cs",
    cze: "cs",
    ell: "el",
    gre: "el",
    heb: "he",
    hun: "hu",
    ind: "id",
    ron: "ro",
    rum: "ro",
    ukr: "uk",
    vie: "vi"
  };

  return isoMap[cleaned] || cleaned.slice(0, 2);
}

/**
 * Finds the corresponding native expo-video AudioTrack from availableAudioTracks
 * that matches a Jellyfin MediaStreamInfo stream index.
 *
 * Evaluation order:
 * 1. Exact ID match (t.id === String(streamIndex))
 * 2. Normalized language match (e.g. fre / fra / French)
 * 3. Title / Label inclusion match
 * 4. Ordinal position in container stream list
 */
export function findMatchingAudioTrack(
  availableTracks: any[] = [],
  audioStreams: MediaStreamInfo[] = [],
  targetStreamIndex?: number
): any | undefined {
  if (!availableTracks || availableTracks.length === 0 || targetStreamIndex === undefined) {
    return undefined;
  }

  const targetOrdinal = audioStreams.findIndex((s) => s.index === targetStreamIndex);
  const targetStream = targetOrdinal >= 0 ? audioStreams[targetOrdinal] : undefined;

  // 1. Direct ID match (e.g. t.id === "2" or t.id === "1/2")
  const byId = availableTracks.find(
    (t) =>
      t.id === String(targetStreamIndex) ||
      (targetStream?.index !== undefined && t.id?.endsWith?.(`/${targetStream.index}`))
  );
  if (byId) return byId;

  // 2. Normalized language & title heuristics
  if (targetStream) {
    const targetNorm = normalizeLanguage(targetStream.language);
    const targetTitle = (targetStream.displayTitle || (targetStream as any).title || "").toLowerCase();

    // Check language match
    if (targetNorm) {
      const byLang = availableTracks.find((t) => {
        const trackNorm = normalizeLanguage(t.language);
        if (trackNorm && trackNorm === targetNorm) return true;
        const trackLabel = (t.label || "").toLowerCase();
        if (trackLabel && (trackLabel.startsWith(targetNorm) || trackLabel.includes(targetNorm))) return true;
        return false;
      });
      if (byLang) return byLang;
    }

    // Check display title or label substring
    if (targetTitle) {
      const byTitle = availableTracks.find((t) => {
        const trackLabel = (t.label || "").toLowerCase();
        const trackName = (t.name || "").toLowerCase();
        return (
          (trackLabel && (targetTitle.includes(trackLabel) || trackLabel.includes(targetTitle))) ||
          (trackName && (targetTitle.includes(trackName) || trackName.includes(targetTitle)))
        );
      });
      if (byTitle) return byTitle;
    }
  }

  // 3. Container stream ordinal fallback
  // In container formats (MKV, MP4), tracks in ExoPlayer are enumerated in identical order to Jellyfin
  if (targetOrdinal >= 0 && targetOrdinal < availableTracks.length) {
    return availableTracks[targetOrdinal];
  }

  return undefined;
}

/**
 * Finds the corresponding native expo-video SubtitleTrack from availableSubtitleTracks
 * that matches a Jellyfin MediaStreamInfo subtitle stream index.
 */
export function findMatchingSubtitleTrack(
  availableTracks: any[] = [],
  subtitleStreams: MediaStreamInfo[] = [],
  targetStreamIndex?: number | null
): any | undefined {
  if (!availableTracks || availableTracks.length === 0 || targetStreamIndex === undefined || targetStreamIndex === null) {
    return undefined;
  }

  const targetOrdinal = subtitleStreams.findIndex((s) => s.index === targetStreamIndex);
  const targetStream = targetOrdinal >= 0 ? subtitleStreams[targetOrdinal] : undefined;

  // 1. Direct ID match (e.g. t.id === "2" or t.id === "1/2")
  const byId = availableTracks.find(
    (t) =>
      t.id === String(targetStreamIndex) ||
      (targetStream?.index !== undefined && t.id?.endsWith?.(`/${targetStream.index}`))
  );
  if (byId) return byId;

  // 2. Normalized language & title heuristics
  if (targetStream) {
    const targetNorm = normalizeLanguage(targetStream.language);
    const targetTitle = (targetStream.displayTitle || (targetStream as any).title || "").toLowerCase();

    if (targetNorm) {
      const byLang = availableTracks.find((t) => {
        const trackNorm = normalizeLanguage(t.language);
        if (trackNorm && trackNorm === targetNorm) return true;
        const trackLabel = (t.label || "").toLowerCase();
        if (trackLabel && (trackLabel.startsWith(targetNorm) || trackLabel.includes(targetNorm))) return true;
        return false;
      });
      if (byLang) return byLang;
    }

    if (targetTitle) {
      const byTitle = availableTracks.find((t) => {
        const trackLabel = (t.label || "").toLowerCase();
        return trackLabel && (targetTitle.includes(trackLabel) || trackLabel.includes(targetTitle));
      });
      if (byTitle) return byTitle;
    }
  }

  // 3. Container stream ordinal fallback
  if (targetOrdinal >= 0 && targetOrdinal < availableTracks.length) {
    return availableTracks[targetOrdinal];
  }

  return undefined;
}
