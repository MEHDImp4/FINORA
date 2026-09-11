import { useEffect, useRef, useState, useMemo } from "react";
import { useVideoPlayer, VideoPlayer } from "expo-video";
import { FinoraPlayerEngine } from "./FinoraPlayerEngine";
import { FinoraPlayerControls, FinoraPlayerSnapshot, IFinoraPlayerEngine } from "./types";

export interface UseFinoraPlayerOptions {
  sourceUrl?: string;
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
  initialPositionSeconds = 0,
  autoPlay = false
}: UseFinoraPlayerOptions = {}): UseFinoraPlayerResult {
  const engineRef = useRef<FinoraPlayerEngine | null>(null);

  if (!engineRef.current) {
    engineRef.current = new FinoraPlayerEngine(null, initialPositionSeconds);
  }

  const engine = engineRef.current;

  // Initialize native expo-video player
  const player = useVideoPlayer(sourceUrl || null, (p) => {
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

  // If sourceUrl changes, replace in player
  useEffect(() => {
    if (sourceUrl && player) {
      player.replace(sourceUrl);
    }
  }, [sourceUrl, player]);

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
