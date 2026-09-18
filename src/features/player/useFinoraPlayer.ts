import { useEffect, useRef, useMemo, useCallback, useSyncExternalStore } from "react";
import { useVideoPlayer, VideoPlayer } from "expo-video";
import { FinoraPlayerEngine } from "./FinoraPlayerEngine";
import { FinoraPlayerControls, FinoraPlayerSnapshot, IFinoraPlayerEngine } from "./types";
import { logger } from "../../core/network/logger";
import { decideSourceChange, isStaleGeneration, SourceChangeDecision } from "./sourceReplacement";

export interface UseFinoraPlayerOptions {
  sourceUrl?: string;
  headers?: Record<string, string>;
  initialPositionSeconds?: number;
  initialDurationSeconds?: number;
  autoPlay?: boolean;
  initialPlaybackRate?: number;
  /**
   * Stable identity of the content item. A change means new content (e.g. the
   * next episode), so the new resume position applies instead of the current one.
   */
  contentId?: string;
}

export interface UseFinoraPlayerResult {
  engine: IFinoraPlayerEngine;
  player: VideoPlayer;
  snapshot: FinoraPlayerSnapshot;
  controls: FinoraPlayerControls;
}

/**
 * Player ownership model B: a single persistent native `VideoPlayer` is created
 * once (with a null source) and FINORA drives every source change through
 * `replaceAsync`. `useVideoPlayer` therefore never recreates the native player on
 * a track/quality/episode change, which removes the double-load / double-buffer
 * behaviour of the previous `useVideoPlayer(source)` + `replaceAsync` combination.
 */
export function useFinoraPlayer({
  sourceUrl,
  headers,
  initialPositionSeconds = 0,
  initialDurationSeconds = 0,
  autoPlay = false,
  initialPlaybackRate,
  contentId
}: UseFinoraPlayerOptions = {}): UseFinoraPlayerResult {
  const engineRef = useRef<FinoraPlayerEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new FinoraPlayerEngine(null, initialPositionSeconds, initialDurationSeconds);
  }
  const engine = engineRef.current;

  const headersKey = headers ? JSON.stringify(headers) : "";
  const videoSource = useMemo(() => {
    if (!sourceUrl) return null;
    if (headers && Object.keys(headers).length > 0) {
      return { uri: sourceUrl, headers };
    }
    return { uri: sourceUrl };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceUrl, headersKey]);

  // One persistent native player for the lifetime of the screen.
  const player = useVideoPlayer(null, (p) => {
    if (initialPlaybackRate && initialPlaybackRate !== 1.0) {
      try {
        p.playbackRate = initialPlaybackRate;
      } catch {
        // Safe fallback
      }
    }
  });

  // V1 policy: foreground-only playback. Backgrounding pauses and reports progress
  // (see usePlaybackSession). PiP is the only mode that keeps playing.
  useEffect(() => {
    if (!player) return;
    try {
      (player as unknown as { staysActiveInBackground?: boolean }).staysActiveInBackground = false;
    } catch {
      // Not settable on this platform/build — the default is already false.
    }
  }, [player]);

  // Attach the native player to the FINORA engine exactly once.
  useEffect(() => {
    engine.attachPlayer(player, initialPositionSeconds);
    if (initialPlaybackRate && initialPlaybackRate !== 1.0) {
      engine.setRate(initialPlaybackRate);
    }
    // initialPositionSeconds is intentionally read only on first attach; subsequent
    // content changes reset the engine through the source-change effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, engine]);

  useEffect(() => {
    if (!player) return;
    if (initialPlaybackRate && initialPlaybackRate !== 1.0) {
      try {
        player.playbackRate = initialPlaybackRate;
      } catch {
        // Safe fallback
      }
      engine.setRate(initialPlaybackRate);
    }
  }, [player, engine, initialPlaybackRate]);

  const sourceGenerationRef = useRef(0);
  const prevSourceRef = useRef<string | undefined>(undefined);
  const prevContentRef = useRef<string | undefined>(undefined);
  const appliedOnceRef = useRef(false);
  const pendingRef = useRef<{ generation: number; decision: SourceChangeDecision } | null>(null);

  const applyPendingSource = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    if (isStaleGeneration(pending.generation, sourceGenerationRef.current)) {
      pendingRef.current = null;
      return;
    }
    pendingRef.current = null;
    try {
      if (pending.decision.seekToSeconds !== null) {
        player.currentTime = pending.decision.seekToSeconds;
      }
      if (pending.decision.shouldPlay) {
        player.play();
      } else {
        player.pause();
      }
    } catch {
      // The player can be released mid-transition; nothing else to do.
    }
  }, [player]);

  // Apply the stream once it is ready. A stale (superseded) source is ignored.
  useEffect(() => {
    if (!player) return;
    const subscription = player.addListener("statusChange", ({ status }) => {
      if (status === "readyToPlay") {
        applyPendingSource();
      }
    });
    return () => {
      subscription?.remove?.();
    };
  }, [player, applyPendingSource]);

  // Re-apply the source whenever the URL changes, preserving position for the same
  // content and using the new resume position for new content.
  useEffect(() => {
    if (!player) return;
    if (sourceUrl === undefined) return;
    if (prevSourceRef.current === sourceUrl) return;

    const isFirst = !appliedOnceRef.current;
    const contentChanged =
      !isFirst && prevContentRef.current !== undefined && prevContentRef.current !== contentId;

    const snapshot = engine.getSnapshot();
    const decision = decideSourceChange({
      isFirstApplication: isFirst,
      contentChanged,
      previousPositionSeconds: snapshot.currentTimeSeconds,
      isPlaying: snapshot.state === "playing" || Boolean(player.playing),
      initialPositionSeconds,
      autoPlay
    });

    prevSourceRef.current = sourceUrl;
    prevContentRef.current = contentId;
    appliedOnceRef.current = true;

    const generation = sourceGenerationRef.current + 1;
    sourceGenerationRef.current = generation;
    pendingRef.current = { generation, decision };

    if (decision.resetEngine) {
      engine.reset?.(initialPositionSeconds, initialDurationSeconds);
    }

    if (!videoSource) return;

    const applySource = async () => {
      try {
        if (typeof player.replaceAsync === "function") {
          await player.replaceAsync(videoSource);
        } else if (typeof (player as unknown as { replace?: (s: unknown) => void }).replace === "function") {
          (player as unknown as { replace: (s: unknown) => void }).replace(videoSource);
        }
      } catch (error) {
        if (!isStaleGeneration(generation, sourceGenerationRef.current)) {
          logger.warn("[useFinoraPlayer] source replacement failed:", error);
        }
        return;
      }

      if (isStaleGeneration(generation, sourceGenerationRef.current)) return;
      // Some platforms resolve after the player is already ready; apply immediately.
      if (player.status === "readyToPlay") {
        applyPendingSource();
      }
    };

    applySource();
  }, [
    player,
    engine,
    videoSource,
    sourceUrl,
    contentId,
    autoPlay,
    initialPositionSeconds,
    initialDurationSeconds,
    applyPendingSource
  ]);

  const subscribe = useCallback(
    (onStoreChange: () => void) => engine.subscribe(onStoreChange),
    [engine]
  );
  const getSnapshot = useCallback(() => engine.getSnapshot(), [engine]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    return () => {
      engine.destroy();
    };
  }, [engine]);

  const controls: FinoraPlayerControls = useMemo(
    () => ({
      play: () => engine.play(),
      pause: () => engine.pause(),
      seekTo: (pos: number) => engine.seekTo(pos),
      seekBy: (delta: number) => engine.seekBy(delta),
      setVolume: (vol: number) => engine.setVolume(vol),
      setRate: (rate: number) => engine.setRate(rate),
      setMuted: (muted: boolean) => engine.setMuted(muted)
    }),
    [engine]
  );

  return {
    engine,
    player,
    snapshot,
    controls
  };
}
