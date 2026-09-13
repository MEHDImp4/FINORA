import { useState, useEffect, useRef } from "react";
import { SubtitleCue, parseSubtitleContent } from "./subtitleParser";
import { logger } from "../../core/network/logger";

interface UseSubtitleCuesParams {
  itemId: string;
  mediaSourceId?: string;
  subtitleStreamIndex: number | null;
  serverUrl?: string;
  token?: string;
  localPath?: string;
}

interface UseSubtitleCuesResult {
  cues: SubtitleCue[];
  isLoading: boolean;
  isCustomSubtitleActive: boolean;
  hasError: boolean;
}

// In-memory cache for parsed subtitle cues by key: `${itemId}_${streamIndex}`
const subtitleCuesCache = new Map<string, SubtitleCue[]>();

export function useSubtitleCues({
  itemId,
  mediaSourceId,
  subtitleStreamIndex,
  serverUrl,
  token,
  localPath
}: UseSubtitleCuesParams): UseSubtitleCuesResult {
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // If no subtitle is selected
    if (subtitleStreamIndex === null || subtitleStreamIndex === undefined) {
      setCues([]);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    const cacheKey = `${itemId}_${subtitleStreamIndex}`;
    if (subtitleCuesCache.has(cacheKey)) {
      setCues(subtitleCuesCache.get(cacheKey)!);
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
        const sid = mediaSourceId || itemId;
        const vttUrl = `${cleanServerUrl}/Videos/${itemId}/${sid}/Subtitles/${subtitleStreamIndex}/Stream.vtt${
          token ? `?api_key=${encodeURIComponent(token)}` : ""
        }`;

        logger.debug(`[useSubtitleCues] Fetching WebVTT from: ${cleanServerUrl}/Videos/${itemId}/.../Stream.vtt`);

        const res = await fetch(vttUrl, {
          signal: abortController.signal,
          headers: {
            Accept: "text/vtt, text/plain, */*"
          }
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to load WebVTT subtitles`);
        }

        const rawText = await res.text();
        const parsed = parseSubtitleContent(rawText);

        if (isMounted) {
          subtitleCuesCache.set(cacheKey, parsed);
          setCues(parsed);
          setIsLoading(false);
          logger.info(`[useSubtitleCues] Loaded ${parsed.length} cues for stream ${subtitleStreamIndex}`);
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        logger.warn(`[useSubtitleCues] Could not fetch WebVTT for stream ${subtitleStreamIndex}:`, err);
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
  }, [itemId, mediaSourceId, subtitleStreamIndex, serverUrl, token, localPath]);

  return {
    cues,
    isLoading,
    isCustomSubtitleActive: cues.length > 0 && subtitleStreamIndex !== null && !hasError,
    hasError
  };
}
