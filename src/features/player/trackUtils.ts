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

  // When metadata audioStreams is empty, targetStreamIndex directly refers to the native track index
  if (audioStreams.length === 0 && targetStreamIndex >= 0 && targetStreamIndex < availableTracks.length) {
    return availableTracks[targetStreamIndex];
  }

  const targetOrdinal = audioStreams.findIndex((s) => s.index === targetStreamIndex);
  const targetStream = targetOrdinal >= 0 ? audioStreams[targetOrdinal] : undefined;
  if (!targetStream) return undefined;

  const targetNorm = normalizeLanguage(targetStream.language);
  const targetTitle = (targetStream.displayTitle || (targetStream as any).title || "").toLowerCase();

  // 1. Language match (primary criteria)
  if (targetNorm) {
    // Find all tracks matching target language
    const langCandidates = availableTracks.filter((t) => {
      const trackNorm = normalizeLanguage(t.language);
      if (trackNorm && trackNorm === targetNorm) return true;
      const trackLabel = (t.label || "").toLowerCase();
      if (trackLabel && (trackLabel === targetNorm || trackLabel.startsWith(`${targetNorm} `) || trackLabel.includes(`(${targetNorm})`))) {
        return true;
      }
      return false;
    });

    if (langCandidates.length === 1) {
      return langCandidates[0];
    }

    if (langCandidates.length > 1) {
      // Multiple tracks of same language: match title or channel/codec layout
      if (targetTitle) {
        const byTitle = langCandidates.find((t) => {
          const trackLabel = (t.label || "").toLowerCase();
          const trackName = (t.name || "").toLowerCase();
          return (
            (trackLabel && (targetTitle.includes(trackLabel) || trackLabel.includes(targetTitle))) ||
            (trackName && (targetTitle.includes(trackName) || trackName.includes(targetTitle)))
          );
        });
        if (byTitle) return byTitle;
      }

      // Match relative ordinal among tracks with same language
      const sameLangStreams = audioStreams.filter((s) => normalizeLanguage(s.language) === targetNorm);
      const streamLangRank = sameLangStreams.findIndex((s) => s.index === targetStreamIndex);
      if (streamLangRank >= 0 && streamLangRank < langCandidates.length) {
        return langCandidates[streamLangRank];
      }

      return langCandidates[0];
    }
  }

  // 2. Title / Label match (if language wasn't matched or wasn't specified)
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

  // 3. ID match ONLY IF languages don't conflict
  const byId = availableTracks.find(
    (t) =>
      t.id === String(targetStreamIndex) ||
      (targetStream.index !== undefined && t.id?.endsWith?.(`/${targetStream.index}`))
  );
  if (byId) {
    const trackNorm = normalizeLanguage(byId.language);
    // If target has a language and track has a language, they must not conflict
    if (!targetNorm || !trackNorm || targetNorm === trackNorm) {
      return byId;
    }
  }

  // 4. Ordinal fallback ONLY IF languages don't conflict
  if (targetOrdinal >= 0 && targetOrdinal < availableTracks.length) {
    const candidate = availableTracks[targetOrdinal];
    const candidateNorm = normalizeLanguage(candidate?.language);
    if (!targetNorm || !candidateNorm || targetNorm === candidateNorm) {
      return candidate;
    }
  }

  // No reliable match found: return undefined so Tier 2 server stream switch can take over
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

  // When metadata subtitleStreams is empty, targetStreamIndex directly refers to the native track index
  if (subtitleStreams.length === 0 && targetStreamIndex >= 0 && targetStreamIndex < availableTracks.length) {
    return availableTracks[targetStreamIndex];
  }

  const targetOrdinal = subtitleStreams.findIndex((s) => s.index === targetStreamIndex);
  const targetStream = targetOrdinal >= 0 ? subtitleStreams[targetOrdinal] : undefined;
  if (!targetStream) return undefined;

  const targetNorm = normalizeLanguage(targetStream.language);
  const targetTitle = (targetStream.displayTitle || (targetStream as any).title || "").toLowerCase();

  // 1. Language match (primary criteria)
  if (targetNorm) {
    const langCandidates = availableTracks.filter((t) => {
      const trackNorm = normalizeLanguage(t.language);
      if (trackNorm && trackNorm === targetNorm) return true;
      const trackLabel = (t.label || "").toLowerCase();
      if (trackLabel && (trackLabel === targetNorm || trackLabel.startsWith(`${targetNorm} `) || trackLabel.includes(`(${targetNorm})`))) {
        return true;
      }
      return false;
    });

    if (langCandidates.length === 1) {
      return langCandidates[0];
    }

    if (langCandidates.length > 1) {
      if (targetTitle) {
        const byTitle = langCandidates.find((t) => {
          const trackLabel = (t.label || "").toLowerCase();
          return trackLabel && (targetTitle.includes(trackLabel) || trackLabel.includes(targetTitle));
        });
        if (byTitle) return byTitle;
      }

      const sameLangStreams = subtitleStreams.filter((s) => normalizeLanguage(s.language) === targetNorm);
      const streamLangRank = sameLangStreams.findIndex((s) => s.index === targetStreamIndex);
      if (streamLangRank >= 0 && streamLangRank < langCandidates.length) {
        return langCandidates[streamLangRank];
      }

      return langCandidates[0];
    }
  }

  // 2. Title match
  if (targetTitle) {
    const byTitle = availableTracks.find((t) => {
      const trackLabel = (t.label || "").toLowerCase();
      return trackLabel && (targetTitle.includes(trackLabel) || trackLabel.includes(targetTitle));
    });
    if (byTitle) return byTitle;
  }

  // 3. ID match ONLY IF languages don't conflict
  const byId = availableTracks.find(
    (t) =>
      t.id === String(targetStreamIndex) ||
      (targetStream.index !== undefined && t.id?.endsWith?.(`/${targetStream.index}`))
  );
  if (byId) {
    const trackNorm = normalizeLanguage(byId.language);
    if (!targetNorm || !trackNorm || targetNorm === trackNorm) {
      return byId;
    }
  }

  // 4. Ordinal fallback ONLY IF languages don't conflict
  if (targetOrdinal >= 0 && targetOrdinal < availableTracks.length) {
    const candidate = availableTracks[targetOrdinal];
    const candidateNorm = normalizeLanguage(candidate?.language);
    if (!targetNorm || !candidateNorm || targetNorm === candidateNorm) {
      return candidate;
    }
  }

  return undefined;
}
