import { useEffect, useRef, useState, useMemo } from "react";
import { useVideoPlayer, VideoPlayer } from "expo-video";
import { FinoraPlayerEngine } from "./FinoraPlayerEngine";
import { FinoraPlayerControls, FinoraPlayerSnapshot, IFinoraPlayerEngine } from "./types";
import { logger } from "../../core/network/logger";

export interface UseFinoraPlayerOptions {
  sourceUrl?: string;
  headers?: Record<string, string>;
  initialPositionSeconds?: number;
  autoPlay?: boolean;
}

export interface UseFinoraPlayerResult {
  engine: IFinoraPlayerEngine;
  player: VideoPlayer;
  snapshot: FinoraPlayerSnapshot;
  controls: FinoraPlayerControls;
}

export function useFinoraPlayer({
  sourceUrl,
  headers,
  initialPositionSeconds = 0,
  autoPlay = false
}: UseFinoraPlayerOptions = {}): UseFinoraPlayerResult {
  const engineRef = useRef<FinoraPlayerEngine | null>(null);

  if (!engineRef.current) {
    engineRef.current = new FinoraPlayerEngine(null, initialPositionSeconds);
  }

  const engine = engineRef.current;

  // Prepare video source with optional auth headers
  const videoSource = useMemo(() => {
    if (!sourceUrl) return null;
    if (headers && Object.keys(headers).length > 0) {
      return {
        uri: sourceUrl,
        headers
      };
    }
    return { uri: sourceUrl };
  }, [sourceUrl, headers]);

  // Initialize native expo-video player
  const player = useVideoPlayer(videoSource, (p) => {
    if (autoPlay) {
      p.play();
    }
  });

  // Attach native player to FINORA engine
  useEffect(() => {
    if (player) {
      engine.attachPlayer(player, initialPositionSeconds);
    }
  }, [player, engine, initialPositionSeconds]);

  const pendingSeekPositionRef = useRef<number | null>(null);
  const pendingPlayRef = useRef<boolean>(false);
  const prevSourceUrlRef = useRef<string | undefined>(sourceUrl);

  // If sourceUrl changes, replace in player while preserving position and play state
  useEffect(() => {
    if (!videoSource || !player) return;
    if (prevSourceUrlRef.current !== sourceUrl) {
      if (prevSourceUrlRef.current) {
        const currentPos = player.currentTime || engine.getSnapshot().currentTimeSeconds;
        const wasPlaying = player.playing || engine.getSnapshot().state === "playing";

        if (currentPos > 0) {
          pendingSeekPositionRef.current = currentPos;
          pendingPlayRef.current = wasPlaying;
        }
      }

      if (typeof player.replaceAsync === "function") {
        player
          .replaceAsync(videoSource)
          .then(() => {
            if (player.status === "readyToPlay") {
              if (pendingSeekPositionRef.current !== null) {
                const targetPos = pendingSeekPositionRef.current;
                const shouldPlay = pendingPlayRef.current;
                pendingSeekPositionRef.current = null;
                try {
                  player.currentTime = targetPos;
                  if (shouldPlay) {
                    player.play();
                  }
                } catch {
                  // Ignore
                }
              } else if (autoPlay) {
                player.play();
              }
            }
          })
          .catch((err) => {
            logger.warn("[useFinoraPlayer] replaceAsync error:", err);
          });
      } else if (typeof (player as any).replace === "function") {
        (player as any).replace(videoSource, true);
      }
    }
    prevSourceUrlRef.current = sourceUrl;
  }, [videoSource, sourceUrl, player, engine, autoPlay]);

  // Restore playback position after source replacement
  useEffect(() => {
    if (!player) return;
    const sub = player.addListener("statusChange", ({ status }) => {
      if (status === "readyToPlay" && pendingSeekPositionRef.current !== null) {
        const targetPos = pendingSeekPositionRef.current;
        const shouldPlay = pendingPlayRef.current;
        pendingSeekPositionRef.current = null;
        try {
          player.currentTime = targetPos;
          if (shouldPlay) {
            player.play();
          }
        } catch {
          // Ignore
        }
      }
    });

    return () => {
      sub?.remove?.();
    };
  }, [player]);

  // Subscribe to engine state
  const [snapshot, setSnapshot] = useState<FinoraPlayerSnapshot>(() => engine.getSnapshot());

  useEffect(() => {
    const unsubscribe = engine.subscribe((newSnapshot) => {
      setSnapshot(newSnapshot);
    });

    return () => {
      unsubscribe();
    };
  }, [engine]);

  // Cleanup on unmount
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
