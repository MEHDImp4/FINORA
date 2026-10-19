import { useEffect, useRef, useMemo, useCallback, useSyncExternalStore } from "react";
import { useVideoPlayer, VideoPlayer } from "expo-video";
import { FinoraPlayerEngine } from "./FinoraPlayerEngine";
import { FinoraPlayerControls, FinoraPlayerSnapshot, IFinoraPlayerEngine } from "./types";
import { logger } from "../../core/network/logger";
import {
  decideSourceChange,
  isStaleGeneration,
  LatestSourceReplacementQueue,
  SourceChangeDecision
} from "./sourceReplacement";

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

type QueuedVideoSource = {
  uri: string;
  headers?: Record<string, string>;
};

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
  const videoSource = useMemo<QueuedVideoSource | null>(() => {
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
  const nativePlayerRef = useRef(player);
  nativePlayerRef.current = player;

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
  const activeReplacementGenerationRef = useRef<number | null>(null);
  // A native readyToPlay event can arrive before or after replaceAsync resolves.
  // Only the generation whose replacement promise has settled may consume its
  // pending seek/play decision; this blocks a late ready event from source A while
  // source C is already being replaced.
  const settledReplacementGenerationRef = useRef<number | null>(null);

  const applyPendingSource = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    if (isStaleGeneration(pending.generation, sourceGenerationRef.current)) {
      pendingRef.current = null;
      return;
    }
    if (
      activeReplacementGenerationRef.current !== pending.generation ||
      settledReplacementGenerationRef.current !== pending.generation
    ) {
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
    } finally {
      if (activeReplacementGenerationRef.current === pending.generation) {
        activeReplacementGenerationRef.current = null;
      }
      if (settledReplacementGenerationRef.current === pending.generation) {
        settledReplacementGenerationRef.current = null;
      }
    }
  }, [player]);
  const applyPendingSourceRef = useRef(applyPendingSource);
  applyPendingSourceRef.current = applyPendingSource;

  // `replaceAsync` mutates the same native player. Keep the transport ordering in
  // a pure latest-only queue so an older native replacement can never finish after
  // a newer request and become the final source.
  const replacementQueueRef = useRef<LatestSourceReplacementQueue<QueuedVideoSource> | null>(null);
  if (!replacementQueueRef.current) {
    replacementQueueRef.current = new LatestSourceReplacementQueue<QueuedVideoSource>(
      async (source) => {
        const nativePlayer = nativePlayerRef.current;
        if (typeof nativePlayer.replaceAsync === "function") {
          await nativePlayer.replaceAsync(source);
          return;
        }
        const fallback = nativePlayer as unknown as { replace?: (value: unknown) => void };
        if (typeof fallback.replace === "function") {
          fallback.replace(source);
        }
      },
      {
        onStart: (generation) => {
          activeReplacementGenerationRef.current = generation;
          settledReplacementGenerationRef.current = null;
        },
        onSuccess: (generation) => {
          if (isStaleGeneration(generation, sourceGenerationRef.current)) return;
          if (activeReplacementGenerationRef.current !== generation) return;
          settledReplacementGenerationRef.current = generation;

          const nativePlayer = nativePlayerRef.current;
          // Some platforms fire readyToPlay before replaceAsync resolves. The event
          // handler deliberately ignores it until this success callback marks the
          // generation as settled, so finish immediately when status is already ready.
          if (nativePlayer.status === "readyToPlay") {
            applyPendingSourceRef.current();
          }
        },
        onError: (generation, error) => {
          if (isStaleGeneration(generation, sourceGenerationRef.current)) return;
          if (pendingRef.current?.generation === generation) {
            pendingRef.current = null;
          }
          if (activeReplacementGenerationRef.current === generation) {
            activeReplacementGenerationRef.current = null;
          }
          if (settledReplacementGenerationRef.current === generation) {
            settledReplacementGenerationRef.current = null;
          }
          logger.warn("[useFinoraPlayer] source replacement failed:", error);
        }
      }
    );
  }

  // Apply the stream once the matching replacement is ready. A ready event from
  // an older replacement must never apply the newest pending seek/play decision.
  useEffect(() => {
    if (!player) return;
    const subscription = player.addListener("statusChange", ({ status }) => {
      if (status !== "readyToPlay") return;

      const activeGeneration = activeReplacementGenerationRef.current;
      if (activeGeneration === null) return;
      if (isStaleGeneration(activeGeneration, sourceGenerationRef.current)) return;
      if (settledReplacementGenerationRef.current !== activeGeneration) return;

      applyPendingSource();
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
    replacementQueueRef.current?.enqueue(generation, videoSource);
  }, [
    player,
    engine,
    videoSource,
    sourceUrl,
    contentId,
    autoPlay,
    initialPositionSeconds,
    initialDurationSeconds
  ]);

  // Invalidate queued work on unmount so late native completions cannot re-apply
  // seek/play state after the screen has been released.
  useEffect(() => {
    return () => {
      sourceGenerationRef.current += 1;
      replacementQueueRef.current?.dispose();
      pendingRef.current = null;
      activeReplacementGenerationRef.current = null;
      settledReplacementGenerationRef.current = null;
    };
  }, []);

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
