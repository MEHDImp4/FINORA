export type PlayerPlaybackState =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "buffering"
  | "error"
  | "ended";

export interface FinoraPlayerSnapshot {
  state: PlayerPlaybackState;
  currentTimeSeconds: number;
  durationSeconds: number;
  bufferedPositionSeconds: number;
  volume: number;
  playbackRate: number;
  isMuted: boolean;
  errorMessage?: string;
}

export interface FinoraPlayerControls {
  play: () => void;
  pause: () => void;
  seekTo: (positionSeconds: number) => void;
  seekBy: (deltaSeconds: number) => void;
  setVolume: (volume: number) => void;
  setRate: (rate: number) => void;
  setMuted: (muted: boolean) => void;
}

export interface IFinoraPlayerEngine {
  play(): void;
  pause(): void;
  seekTo(positionSeconds: number): void;
  seekBy(deltaSeconds: number): void;
  setVolume(volume: number): void;
  setRate(rate: number): void;
  setMuted(muted: boolean): void;
  /** Resets engine state for a newly loaded content item (BLK-10). */
  reset?(positionSeconds?: number, durationSeconds?: number): void;
  destroy(): void;
  getSnapshot(): FinoraPlayerSnapshot;
  subscribe(listener: (snapshot: FinoraPlayerSnapshot) => void): () => void;
}
