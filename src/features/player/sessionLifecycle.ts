import { PlaybackMode } from "./playbackPlanner";

/** Jellyfin ticks: 10,000,000 ticks per second. */
export const TICKS_PER_SECOND = 10_000_000;

export function secondsToTicks(seconds: number): number {
  if (!Number.isFinite(seconds)) return 0;
  return Math.round(seconds * TICKS_PER_SECOND);
}

export function ticksToSeconds(ticks: number): number {
  if (!Number.isFinite(ticks)) return 0;
  return ticks / TICKS_PER_SECOND;
}

export type PlaybackPhase = "idle" | "started" | "stopped";

/**
 * Explicit identity of a Jellyfin playback session.
 *
 * A session is keyed by (itemId, mediaSourceId) and owns a single stable
 * PlaySessionId. Changing the media source is treated as a new session; changing
 * an audio/subtitle track or the transport quality is NOT (the session keeps its
 * PlaySessionId and the stream is rebuilt underneath).
 */
export interface PlaybackSession {
  key: string;
  itemId: string;
  mediaSourceId: string;
  playSessionId: string;
  playMethod: PlaybackMode;
  phase: PlaybackPhase;
  lastPositionTicks: number;
  lastDurationTicks: number;
  audioStreamIndex?: number;
  subtitleStreamIndex?: number;
}

export interface BeginSessionInput {
  itemId: string;
  mediaSourceId?: string;
  playMethod: PlaybackMode;
  initialPositionTicks?: number;
  audioStreamIndex?: number;
  subtitleStreamIndex?: number;
}

export interface StopReport {
  itemId: string;
  mediaSourceId: string;
  playSessionId: string;
  positionTicks: number;
  durationTicks: number;
}

/** Stable Jellyfin session identity for a media session. */
export function buildPlaySessionId(itemId: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${itemId}-${Date.now().toString(36)}-${random}`;
}

export function buildSessionKey(itemId: string, mediaSourceId?: string): string {
  return `${itemId}::${mediaSourceId || itemId}`;
}

/**
 * Owns the lifecycle of one playback session at a time.
 *
 * `begin()` finalizes the previous session (returning its Stop report so the
 * caller can emit exactly one Stop) and starts a fresh one. `stop()` is
 * idempotent: it returns a Stop report at most once per session, which is what
 * makes the Start/Stop pair exactly-once even across rapid media switches.
 */
export class PlaybackSessionTracker {
  private session: PlaybackSession | null = null;

  public begin(input: BeginSessionInput): { session: PlaybackSession; replaced: StopReport | null } {
    const replaced = this.stop();
    const session: PlaybackSession = {
      key: buildSessionKey(input.itemId, input.mediaSourceId),
      itemId: input.itemId,
      mediaSourceId: input.mediaSourceId || input.itemId,
      playSessionId: buildPlaySessionId(input.itemId),
      playMethod: input.playMethod,
      phase: "idle",
      lastPositionTicks: Math.max(0, input.initialPositionTicks ?? 0),
      lastDurationTicks: 0,
      audioStreamIndex: input.audioStreamIndex,
      subtitleStreamIndex: input.subtitleStreamIndex
    };
    this.session = session;
    return { session, replaced };
  }

  public get current(): PlaybackSession | null {
    return this.session;
  }

  public isStarted(): boolean {
    return this.session?.phase === "started";
  }

  /** Transitions idle -> started at most once. Returns true only on the transition. */
  public markStarted(): boolean {
    if (!this.session || this.session.phase !== "idle") return false;
    this.session.phase = "started";
    return true;
  }

  public updateProgress(positionTicks: number, durationTicks: number): void {
    if (!this.session) return;
    this.session.lastPositionTicks = Math.max(0, positionTicks);
    if (durationTicks > 0) this.session.lastDurationTicks = durationTicks;
  }

  public updateStreamIndices(audioStreamIndex?: number, subtitleStreamIndex?: number): void {
    if (!this.session) return;
    this.session.audioStreamIndex = audioStreamIndex;
    this.session.subtitleStreamIndex = subtitleStreamIndex;
  }

  /** Builds a Stop report for the current session, or null when nothing is running. */
  public buildStopReport(customPositionTicks?: number): StopReport | null {
    const session = this.session;
    if (!session || session.phase !== "started") return null;
    return {
      itemId: session.itemId,
      mediaSourceId: session.mediaSourceId,
      playSessionId: session.playSessionId,
      positionTicks:
        typeof customPositionTicks === "number" ? customPositionTicks : session.lastPositionTicks,
      durationTicks: session.lastDurationTicks
    };
  }

  /** Marks the session stopped and returns its Stop report at most once. */
  public stop(customPositionTicks?: number): StopReport | null {
    const report = this.buildStopReport(customPositionTicks);
    if (this.session) this.session.phase = "stopped";
    return report;
  }

  public clear(): void {
    this.session = null;
  }
}
