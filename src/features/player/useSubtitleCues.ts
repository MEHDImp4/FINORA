import { useState, useEffect, useRef } from "react";
import { SubtitleCue, parseSubtitleContent } from "./subtitleParser";
import { MediaStreamInfo } from "../../types/media";
import { formatAuthorizationHeader } from "../../core/jellyfin/clientInfo";
import { logger } from "../../core/network/logger";

interface UseSubtitleCuesParams {
  itemId: string;
  mediaSourceId?: string;
  subtitleStreamIndex: number | null;
  serverUrl?: string;
  token?: string;
  localPath?: string;
  streams?: MediaStreamInfo[];
}

interface UseSubtitleCuesResult {
  cues: SubtitleCue[];
  isLoading: boolean;
  isCustomSubtitleActive: boolean;
  hasError: boolean;
}

// In-memory cache for parsed subtitle cues by key: `${itemId}_${streamIndex}`
const subtitleCuesCache = new Map<string, SubtitleCue[]>();

function getOrigin(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function stripJellyfinCredentialParams(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("api_key");
    parsed.searchParams.delete("ApiKey");
    parsed.searchParams.delete("Token");
    parsed.searchParams.delete("token");
    return parsed.toString();
  } catch {
    return url;
  }
}

export function useSubtitleCues({
  itemId,
  mediaSourceId,
  subtitleStreamIndex,
  serverUrl,
  token,
  localPath,
  streams
}: UseSubtitleCuesParams): UseSubtitleCuesResult {
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // 1. Immediately reset cues whenever subtitleStreamIndex changes
    // This prevents stale cues from the previous language lingering on screen
    setCues([]);

    // If no subtitle is selected or stream index is null
    if (subtitleStreamIndex === null || subtitleStreamIndex === undefined) {
      setIsLoading(false);
      setHasError(false);
      return;
    }

    const cacheKey = `${itemId}_${subtitleStreamIndex}`;
    if (subtitleCuesCache.has(cacheKey)) {
      const cached = subtitleCuesCache.get(cacheKey)!;
      setCues(cached);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    let isMounted = true;
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchCues = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        const cleanServerUrl = (serverUrl || "").replace(/\/+$/, "");
        const jellyfinOrigin = getOrigin(cleanServerUrl);
        const sid = mediaSourceId || itemId;
        const targetStream = streams?.find((s) => s.index === subtitleStreamIndex);

        // Image-based subtitles (PGS, VOBSUB) cannot be fetched as text — skip them gracefully
        const codecLower = (targetStream?.codec || "").toLowerCase();
        const isImageBased = ["dvdsub", "hdmv_pgs_subtitle", "pgs", "vobsub"].includes(codecLower) ||
          (targetStream?.isExternal === false && !targetStream?.isTextSubtitleStream && !codecLower);

        if (isImageBased) {
          logger.info(
            `[useSubtitleCues] Skipping image-based subtitle stream ${subtitleStreamIndex} (codec: ${codecLower || "unknown"}). Use native player subtitles for this track.`
          );
          if (isMounted) {
            setCues([]);
            setHasError(true);
            setIsLoading(false);
          }
          return;
        }

        // Build candidate URLs to try in order of priority. DeliveryUrl is server-provided
        // and may be absolute, so credentials are decided per candidate below.
        const rawCandidates: string[] = [];

        // Candidate 1: Exact DeliveryUrl from Jellyfin if provided
        if (targetStream?.deliveryUrl) {
          const delivery = targetStream.deliveryUrl;
          const fullDelivery = delivery.startsWith("http")
            ? delivery
            : `${cleanServerUrl}${delivery.startsWith("/") ? "" : "/"}${delivery}`;
          rawCandidates.push(fullDelivery);
        }

        // Candidate 2: Standard Jellyfin WebVTT endpoint
        rawCandidates.push(
          `${cleanServerUrl}/Videos/${itemId}/${sid}/Subtitles/${subtitleStreamIndex}/Stream.vtt`
        );

        // Candidate 3: Sub-index 0 WebVTT endpoint (common in Jellyfin extracted streams)
        rawCandidates.push(
          `${cleanServerUrl}/Videos/${itemId}/${sid}/Subtitles/${subtitleStreamIndex}/0/Stream.vtt`
        );

        // Candidate 4: Standard Jellyfin SRT endpoint
        rawCandidates.push(
          `${cleanServerUrl}/Videos/${itemId}/${sid}/Subtitles/${subtitleStreamIndex}/Stream.srt`
        );

        // Candidate 5: Sub-index 0 SRT endpoint
        rawCandidates.push(
          `${cleanServerUrl}/Videos/${itemId}/${sid}/Subtitles/${subtitleStreamIndex}/0/Stream.srt`
        );

        // Candidate 6: Item direct WebVTT endpoint (without mediaSourceId)
        rawCandidates.push(
          `${cleanServerUrl}/Videos/${itemId}/Subtitles/${subtitleStreamIndex}/Stream.vtt`
        );

        // Candidate 7: Item direct SRT endpoint
        rawCandidates.push(
          `${cleanServerUrl}/Videos/${itemId}/Subtitles/${subtitleStreamIndex}/Stream.srt`
        );

        // Candidate 8: Standard Jellyfin ASS endpoint
        rawCandidates.push(
          `${cleanServerUrl}/Videos/${itemId}/${sid}/Subtitles/${subtitleStreamIndex}/Stream.ass`
        );

        // Candidate 9: Sub-index 0 ASS endpoint
        rawCandidates.push(
          `${cleanServerUrl}/Videos/${itemId}/${sid}/Subtitles/${subtitleStreamIndex}/0/Stream.ass`
        );

        // Candidate 10: Item direct ASS endpoint
        rawCandidates.push(
          `${cleanServerUrl}/Videos/${itemId}/Subtitles/${subtitleStreamIndex}/Stream.ass`
        );

        // Candidate 11: Format=SRT parameter (forces Jellyfin to convert to SRT)
        rawCandidates.push(
          `${cleanServerUrl}/Videos/${itemId}/${sid}/Subtitles/${subtitleStreamIndex}/Stream.srt?Format=SRT`
        );

        // Candidate 12: Format=VTT parameter (forces Jellyfin to convert to WebVTT)
        rawCandidates.push(
          `${cleanServerUrl}/Videos/${itemId}/${sid}/Subtitles/${subtitleStreamIndex}/Stream.vtt?Format=WebVTT`
        );

        // Candidate 13: Backup with different path structure (emby-style)
        rawCandidates.push(
          `${cleanServerUrl}/Videos/${itemId}/${sid}/${subtitleStreamIndex}/Stream.vtt`
        );

        const candidates = Array.from(new Set(rawCandidates));
        const acceptHeader = "text/vtt, text/plain, application/x-subrip, text/x-ssa, text/x-ass, */*";

        let parsedCues: SubtitleCue[] | null = null;

        for (const rawUrl of candidates) {
          if (abortController.signal.aborted) return;

          try {
            const candidateOrigin = getOrigin(rawUrl);
            const isJellyfinOrigin = Boolean(
              jellyfinOrigin && candidateOrigin && candidateOrigin === jellyfinOrigin
            );

            // Never forward a Jellyfin token, Authorization header, or token-bearing
            // query string to a server-provided cross-origin DeliveryUrl.
            const url = isJellyfinOrigin ? rawUrl : stripJellyfinCredentialParams(rawUrl);
            const requestHeaders: Record<string, string> = { Accept: acceptHeader };
            if (isJellyfinOrigin && token) {
              requestHeaders["Authorization"] = formatAuthorizationHeader("finora-mobile", token);
              requestHeaders["X-Emby-Token"] = token;
              requestHeaders["X-MediaBrowser-Token"] = token;
            }

            logger.debug(
              `[useSubtitleCues] Trying subtitle candidate: ${stripJellyfinCredentialParams(url)}`
            );
            const res = await fetch(url, {
              signal: abortController.signal,
              headers: requestHeaders
            });

            if (res.ok) {
              const text = await res.text();
              const parsed = parseSubtitleContent(text);
              if (parsed.length > 0) {
                parsedCues = parsed;
                logger.info(
                  `[useSubtitleCues] Successfully loaded ${parsed.length} cues for stream ${subtitleStreamIndex}`
                );
                break;
              }
            }
          } catch (candidateErr: any) {
            if (candidateErr.name === "AbortError") return;
            // Continue trying next candidate
          }
        }

        if (parsedCues && parsedCues.length > 0) {
          if (isMounted) {
            subtitleCuesCache.set(cacheKey, parsedCues);
            setCues(parsedCues);
            setIsLoading(false);
            setHasError(false);
          }
        } else {
          logger.warn(
            `[useSubtitleCues] All subtitle candidates failed for stream ${subtitleStreamIndex}`
          );
          if (isMounted) {
            setCues([]);
            setHasError(true);
            setIsLoading(false);
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        logger.warn(`[useSubtitleCues] Error fetching subtitles for stream ${subtitleStreamIndex}:`, err);
        if (isMounted) {
          setCues([]);
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    fetchCues();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [itemId, mediaSourceId, subtitleStreamIndex, serverUrl, token, localPath, streams]);

  return {
    cues,
    isLoading,
    isCustomSubtitleActive: cues.length > 0 && subtitleStreamIndex !== null && !hasError,
    hasError
  };
}
