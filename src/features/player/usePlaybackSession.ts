import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { FinoraPlayerSnapshot, IFinoraPlayerEngine } from "./types";
import { PlaybackMode } from "./playbackPlanner";
import { playbackRepository, PlaybackRepository } from "../../core/repositories/playbackRepository";

export interface UsePlaybackSessionOptions {
  itemId: string;
  mediaSourceId?: string;
  playMethod?: PlaybackMode;
  engine: IFinoraPlayerEngine;
  snapshot: FinoraPlayerSnapshot;
  repository?: PlaybackRepository;
  throttleIntervalMs?: number;
}

export function usePlaybackSession({
  itemId,
  mediaSourceId,
  playMethod = "direct-play",
  engine,
  snapshot,
  repository = playbackRepository,
  throttleIntervalMs = 8000
}: UsePlaybackSessionOptions): void {
  const hasStartedRef = useRef(false);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const lastReportedPausedRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Convert seconds to Jellyfin ticks (10,000,000 ticks per second)
  const secondsToTicks = (seconds: number): number => {
    return Math.round(seconds * 10000000);
  };

  const mapPlayMethod = (method: PlaybackMode): "DirectPlay" | "DirectStream" | "Transcode" => {
    switch (method) {
      case "direct-stream":
        return "DirectStream";
      case "transcode":
        return "Transcode";
      case "direct-play":
      default:
        return "DirectPlay";
    }
  };

  // Report start when player begins playing for the first time
  useEffect(() => {
    if (!itemId) return;

    if (snapshot.state === "playing" && !hasStartedRef.current) {
      hasStartedRef.current = true;
      repository.reportPlaybackStart({
        itemId,
        mediaSourceId: mediaSourceId || itemId,
        positionTicks: secondsToTicks(snapshot.currentTimeSeconds),
        playMethod: mapPlayMethod(playMethod)
      });
    }
  }, [snapshot.state, itemId, mediaSourceId, playMethod, repository]);

  // Periodic throttled progress reporting + state change reporting
  useEffect(() => {
    if (!itemId || !hasStartedRef.current) return;

    const reportProgress = (eventName: "TimeUpdate" | "Pause" | "Unpause", isPaused: boolean) => {
      lastReportedPausedRef.current = isPaused;
      repository.reportPlaybackProgress({
        itemId,
        mediaSourceId: mediaSourceId || itemId,
        positionTicks: secondsToTicks(snapshotRef.current.currentTimeSeconds),
        isPaused,
        eventName
      });
    };

    // State transition pause/resume reporting
    const isPaused = snapshot.state === "paused";
    if (isPaused !== lastReportedPausedRef.current) {
      reportProgress(isPaused ? "Pause" : "Unpause", isPaused);
    }

    // Interval ticker for active playback
    if (snapshot.state === "playing") {
      timerRef.current = setInterval(() => {
        reportProgress("TimeUpdate", false);
      }, throttleIntervalMs);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [snapshot.state, itemId, mediaSourceId, repository, throttleIntervalMs]);

  // Listen to AppState (background / active)
  useEffect(() => {
    if (!itemId) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState.match(/inactive|background/)) {
        // App moving to background: send immediate progress
        if (hasStartedRef.current) {
          repository.reportPlaybackProgress({
            itemId,
            mediaSourceId: mediaSourceId || itemId,
            positionTicks: secondsToTicks(snapshotRef.current.currentTimeSeconds),
            isPaused: true,
            eventName: "Pause"
          });
        }
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [itemId, mediaSourceId, repository]);

  // Report stopped on unmount or ended
  useEffect(() => {
    return () => {
      if (hasStartedRef.current && itemId) {
        repository.reportPlaybackStopped({
          itemId,
          mediaSourceId: mediaSourceId || itemId,
          positionTicks: secondsToTicks(snapshotRef.current.currentTimeSeconds)
        });
      }
    };
  }, [itemId, mediaSourceId, repository]);
}
