import { useCallback, useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { FinoraPlayerSnapshot, IFinoraPlayerEngine } from "./types";
import { PlaybackMode } from "./playbackPlanner";
import { playbackRepository, PlaybackRepository } from "../../core/repositories/playbackRepository";
import { offlineStorageService } from "../offline/offlineStorage";
import {
  PlaybackSessionTracker,
  StopReport,
  secondsToTicks
} from "./sessionLifecycle";

/** A position delta larger than this (between native ticks) is a seek, not playback. */
const SEEK_REPORT_THRESHOLD_SECONDS = 2.5;

export interface UsePlaybackSessionOptions {
  itemId: string;
  mediaSourceId?: string;
  playMethod?: PlaybackMode;
  engine: IFinoraPlayerEngine;
  snapshot: FinoraPlayerSnapshot;
  repository?: PlaybackRepository;
  throttleIntervalMs?: number;
  isOffline?: boolean;
  audioStreamIndex?: number;
  subtitleStreamIndex?: number | null;
  /** When true (e.g. Picture-in-Picture), backgrounding must not pause the player. */
  allowBackground?: boolean;
}

export interface UsePlaybackSessionResult {
  stopSession: (customTicks?: number) => void;
}

function mapPlayMethod(method: PlaybackMode): "DirectPlay" | "DirectStream" | "Transcode" {
  switch (method) {
    case "direct-stream":
      return "DirectStream";
    case "transcode":
      return "Transcode";
    case "direct-play":
    default:
      return "DirectPlay";
  }
}

/** Fire-and-forget a reporting promise so a failed report can never affect playback. */
function safeReport(promise: unknown): void {
  try {
    const maybe = promise as Promise<unknown> | undefined;
    if (maybe && typeof maybe.catch === "function") {
      maybe.catch(() => {});
    }
  } catch {
    // Reporting must never throw into the render/effect layer.
  }
}

export function usePlaybackSession({
  itemId,
  mediaSourceId,
  playMethod = "direct-play",
  engine,
  snapshot,
  repository = playbackRepository,
  throttleIntervalMs = 8000,
  isOffline = false,
  audioStreamIndex,
  subtitleStreamIndex,
  allowBackground = false
}: UsePlaybackSessionOptions): UsePlaybackSessionResult {
  const trackerRef = useRef<PlaybackSessionTracker | null>(null);
  if (!trackerRef.current) {
    trackerRef.current = new PlaybackSessionTracker();
  }
  const tracker = trackerRef.current;

  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  // Mutable options read from effects without forcing session restarts.
  const repositoryRef = useRef(repository);
  repositoryRef.current = repository;
  const isOfflineRef = useRef(isOffline);
  isOfflineRef.current = isOffline;
  const playMethodRef = useRef(playMethod);
  playMethodRef.current = playMethod;
  const allowBackgroundRef = useRef(allowBackground);
  allowBackgroundRef.current = allowBackground;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastObservedPositionRef = useRef(snapshot.currentTimeSeconds);
  const lastPausedRef = useRef<boolean | null>(null);

  const sessionKey = `${itemId}::${mediaSourceId || itemId}`;

  const emitStop = useCallback(
    (report: StopReport) => {
      const totalTicks = report.durationTicks;
      const isPlayed = totalTicks > 0 && report.positionTicks / totalTicks >= 0.9;

      if (!isOfflineRef.current) {
        safeReport(
          repositoryRef.current.reportPlaybackStopped({
            itemId: report.itemId,
            mediaSourceId: report.mediaSourceId,
            playSessionId: report.playSessionId,
            positionTicks: report.positionTicks
          })
        );
      }

      offlineStorageService
        .updateLocalPlaybackPosition(report.itemId, report.positionTicks, totalTicks)
        .catch(() => {});
      offlineStorageService
        .enqueueProgressSync(report.itemId, report.positionTicks, isPlayed)
        .catch(() => {});
      if (isPlayed) {
        offlineStorageService.markAsWatched(report.itemId).catch(() => {});
      }
    },
    []
  );

  const emitProgress = useCallback(
    (eventName: "TimeUpdate" | "Pause" | "Unpause", isPaused: boolean) => {
      const session = tracker.current;
      if (!session || session.phase !== "started") return;

      const posTicks = secondsToTicks(snapshotRef.current.currentTimeSeconds);
      const totalTicks = secondsToTicks(snapshotRef.current.durationSeconds);
      const isPlayed = totalTicks > 0 && posTicks / totalTicks >= 0.9;
      tracker.updateProgress(posTicks, totalTicks);
      lastPausedRef.current = isPaused;

      if (!isOfflineRef.current) {
        safeReport(
          repositoryRef.current.reportPlaybackProgress({
            itemId: session.itemId,
            mediaSourceId: session.mediaSourceId,
            playSessionId: session.playSessionId,
            positionTicks: posTicks,
            isPaused,
            eventName,
            audioStreamIndex: session.audioStreamIndex,
            subtitleStreamIndex: session.subtitleStreamIndex
          })
        );
      }

      offlineStorageService
        .updateLocalPlaybackPosition(session.itemId, posTicks, totalTicks)
        .catch(() => {});
      offlineStorageService
        .enqueueProgressSync(session.itemId, posTicks, isPlayed)
        .catch(() => {});
      if (isPlayed) {
        offlineStorageService.markAsWatched(session.itemId).catch(() => {});
      }
    },
    [tracker]
  );

  // ── Session identity: exactly one session per (itemId, mediaSourceId) ───────
  useEffect(() => {
    const { replaced } = tracker.begin({
      itemId,
      mediaSourceId,
      playMethod: playMethodRef.current,
      initialPositionTicks: secondsToTicks(snapshotRef.current.currentTimeSeconds),
      audioStreamIndex: audioStreamIndex ?? undefined,
      subtitleStreamIndex: subtitleStreamIndex ?? undefined
    });

    // A previous session that was not explicitly stopped (e.g. a direct route
    // replace) is finalized here, exactly once.
    if (replaced) emitStop(replaced);

    lastObservedPositionRef.current = snapshotRef.current.currentTimeSeconds;
    lastPausedRef.current = null;

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const payload = tracker.stop();
      if (payload) emitStop(payload);
    };
    // audio/subtitle indices and playMethod are intentionally NOT deps: changing a
    // track or falling back to transcode must not end the Jellyfin session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, itemId, mediaSourceId, tracker, emitStop]);

  // ── Start: at most once per session ─────────────────────────────────────────
  useEffect(() => {
    if (snapshot.state !== "playing") return;
    // Only the idle -> started transition does work; index updates are handled by
    // the dedicated track-change effect below.
    if (!tracker.markStarted()) return;
    tracker.updateStreamIndices(audioStreamIndex ?? undefined, subtitleStreamIndex ?? undefined);

    const session = tracker.current;
    if (!session) return;

    if (!isOfflineRef.current) {
      safeReport(
        repositoryRef.current.reportPlaybackStart({
          itemId: session.itemId,
          mediaSourceId: session.mediaSourceId,
          playSessionId: session.playSessionId,
          positionTicks: secondsToTicks(snapshotRef.current.currentTimeSeconds),
          playMethod: mapPlayMethod(session.playMethod),
          audioStreamIndex: session.audioStreamIndex,
          subtitleStreamIndex: session.subtitleStreamIndex
        })
      );
    }
  }, [snapshot.state, sessionKey, tracker, audioStreamIndex, subtitleStreamIndex]);

  // ── Progress: throttled interval + pause/unpause + end ──────────────────────
  useEffect(() => {
    if (!tracker.isStarted()) return;

    if (snapshot.state === "ended") {
      const totalTicks = secondsToTicks(snapshotRef.current.durationSeconds);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const payload = tracker.stop(totalTicks);
      if (payload) emitStop(payload);
      return;
    }

    const isPaused = snapshot.state === "paused";
    if (lastPausedRef.current === null) {
      lastPausedRef.current = isPaused;
    } else if (isPaused !== lastPausedRef.current) {
      emitProgress(isPaused ? "Pause" : "Unpause", isPaused);
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (snapshot.state === "playing") {
      timerRef.current = setInterval(() => emitProgress("TimeUpdate", false), throttleIntervalMs);
      if (typeof (timerRef.current as any)?.unref === "function") {
        (timerRef.current as any).unref();
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [snapshot.state, sessionKey, throttleIntervalMs, tracker, emitProgress, emitStop]);

  // ── Immediate (throttled) report after a seek ───────────────────────────────
  useEffect(() => {
    const position = snapshot.currentTimeSeconds;
    const previous = lastObservedPositionRef.current;
    lastObservedPositionRef.current = position;

    if (!tracker.isStarted()) return;
    if (Math.abs(position - previous) < SEEK_REPORT_THRESHOLD_SECONDS) return;

    emitProgress("TimeUpdate", snapshot.state === "paused");
  }, [snapshot.currentTimeSeconds, snapshot.state, tracker, emitProgress]);

  // ── Track changes: refresh stream indices and report them promptly ──────────
  useEffect(() => {
    const session = tracker.current;
    if (!session) return;

    const nextAudio = audioStreamIndex ?? undefined;
    const nextSubtitle = subtitleStreamIndex ?? undefined;
    if (session.audioStreamIndex === nextAudio && session.subtitleStreamIndex === nextSubtitle) {
      return;
    }

    tracker.updateStreamIndices(nextAudio, nextSubtitle);
    if (tracker.isStarted()) {
      emitProgress("TimeUpdate", snapshotRef.current.state === "paused");
    }
  }, [audioStreamIndex, subtitleStreamIndex, tracker, emitProgress]);

  // ── App lifecycle: pause on background unless background playback is allowed ─
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (!nextState.match(/inactive|background/)) return;
      const session = tracker.current;
      if (!session || session.phase !== "started") return;
      if (allowBackgroundRef.current) return;

      emitProgress("Pause", true);
      try {
        engine.pause();
      } catch {
        // The engine may already be detached; the pause report still went out.
      }
    });

    return () => {
      subscription.remove();
    };
  }, [tracker, engine, emitProgress]);

  const stopSession = useCallback(
    (customTicks?: number) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const payload = tracker.stop(customTicks);
      if (payload) emitStop(payload);
    },
    [tracker, emitStop]
  );

  return { stopSession };
}
