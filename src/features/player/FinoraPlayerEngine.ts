import { VideoPlayer } from "expo-video";
import {
  FinoraPlayerSnapshot,
  IFinoraPlayerEngine,
  PlayerPlaybackState
} from "./types";

export class FinoraPlayerEngine implements IFinoraPlayerEngine {
  private player: VideoPlayer | null = null;
  private listeners: Set<(snapshot: FinoraPlayerSnapshot) => void> = new Set();
  private eventSubscriptions: Array<{ remove: () => void }> = [];
  private isDestroyed: boolean = false;
  private snapshot: FinoraPlayerSnapshot;

  constructor(player?: VideoPlayer | null, initialPositionSeconds: number = 0) {
    this.snapshot = {
      state: "idle",
      currentTimeSeconds: initialPositionSeconds,
      durationSeconds: 0,
      bufferedPositionSeconds: 0,
      volume: 1.0,
      playbackRate: 1.0,
      isMuted: false
    };

    if (player) {
      this.attachPlayer(player, initialPositionSeconds);
    }
  }

  public attachPlayer(player: VideoPlayer, initialPositionSeconds: number = 0): void {
    if (this.isDestroyed) return;

    this.detachPlayer();
    this.player = player;

    if (initialPositionSeconds > 0) {
      this.player.currentTime = initialPositionSeconds;
    }

    this.updateSnapshotFromPlayer();

    // Subscribe to expo-video events
    const subStatus = this.player.addListener("statusChange", (payload) => {
      this.handleStatusChange(payload.status, payload.error?.message);
    });
    const subPlaying = this.player.addListener("playingChange", (payload) => {
      this.handlePlayingChange(payload.isPlaying);
    });
    const subTime = this.player.addListener("timeUpdate", (payload) => {
      this.handleTimeUpdate(payload.currentTime, payload.bufferedPosition);
    });
    const subRate = this.player.addListener("playbackRateChange", (payload) => {
      this.handlePlaybackRateChange(payload.playbackRate);
    });
    const subVolume = this.player.addListener("volumeChange", (payload) => {
      this.handleVolumeChange(payload.volume);
    });
    const subMuted = this.player.addListener("mutedChange", (payload) => {
      this.handleMutedChange(payload.muted);
    });
    const subPlayToEnd = this.player.addListener("playToEnd", () => {
      this.handlePlayToEnd();
    });

    this.eventSubscriptions.push(
      subStatus,
      subPlaying,
      subTime,
      subRate,
      subVolume,
      subMuted,
      subPlayToEnd
    );
  }

  public detachPlayer(): void {
    for (const sub of this.eventSubscriptions) {
      if (typeof sub?.remove === "function") {
        sub.remove();
      }
    }
    this.eventSubscriptions = [];
    this.player = null;
  }

  private updateSnapshotFromPlayer(): void {
    if (!this.player) return;

    let state: PlayerPlaybackState = "idle";
    const status = this.player.status;
    const isPlaying = this.player.playing;

    if (status === "loading") {
      state = "loading";
    } else if (status === "error") {
      state = "error";
    } else if (isPlaying) {
      state = "playing";
    } else if (status === "readyToPlay") {
      state = "paused";
    }

    this.updateSnapshot({
      state,
      currentTimeSeconds: this.player.currentTime || this.snapshot.currentTimeSeconds,
      durationSeconds: this.player.duration || 0,
      bufferedPositionSeconds: this.player.bufferedPosition || 0,
      volume: this.player.volume ?? 1.0,
      playbackRate: this.player.playbackRate ?? 1.0,
      isMuted: Boolean(this.player.muted)
    });
  }

  private handleStatusChange(status: string, errorMessage?: string): void {
    let state: PlayerPlaybackState = this.snapshot.state;
    if (status === "loading") {
      state = "loading";
    } else if (status === "error") {
      state = "error";
    } else if (status === "readyToPlay") {
      state = this.player?.playing ? "playing" : "paused";
    } else if (status === "idle") {
      state = "idle";
    }

    this.updateSnapshot({
      state,
      errorMessage: errorMessage || (status === "error" ? "Playback error occurred" : undefined),
      durationSeconds: this.player?.duration || this.snapshot.durationSeconds
    });
  }

  private handlePlayingChange(isPlaying: boolean): void {
    if (this.snapshot.state === "error" || this.snapshot.state === "ended") {
      return;
    }
    const state: PlayerPlaybackState = isPlaying ? "playing" : "paused";
    this.updateSnapshot({ state });
  }

  private handleTimeUpdate(currentTime: number, bufferedPosition?: number): void {
    this.updateSnapshot({
      currentTimeSeconds: currentTime,
      bufferedPositionSeconds:
        bufferedPosition !== undefined ? bufferedPosition : this.snapshot.bufferedPositionSeconds,
      durationSeconds: this.player?.duration || this.snapshot.durationSeconds
    });
  }

  private handlePlaybackRateChange(playbackRate: number): void {
    this.updateSnapshot({ playbackRate });
  }

  private handleVolumeChange(volume: number): void {
    this.updateSnapshot({ volume });
  }

  private handleMutedChange(isMuted: boolean): void {
    this.updateSnapshot({ isMuted });
  }

  private handlePlayToEnd(): void {
    this.updateSnapshot({
      state: "ended",
      currentTimeSeconds: this.snapshot.durationSeconds
    });
  }

  private updateSnapshot(partial: Partial<FinoraPlayerSnapshot>): void {
    this.snapshot = {
      ...this.snapshot,
      ...partial
    };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.snapshot);
      } catch (err) {
        console.error("Error in FinoraPlayerEngine listener:", err);
      }
    }
  }

  public play(): void {
    if (this.player && !this.isDestroyed) {
      if (this.snapshot.state === "ended") {
        this.player.replay();
      } else {
        this.player.play();
      }
    }
  }

  public pause(): void {
    if (this.player && !this.isDestroyed) {
      this.player.pause();
    }
  }

  public seekTo(positionSeconds: number): void {
    if (this.player && !this.isDestroyed) {
      const clamped = Math.max(0, positionSeconds);
      this.player.currentTime = clamped;
    } else {
      this.updateSnapshot({ currentTimeSeconds: Math.max(0, positionSeconds) });
    }
  }

  public seekBy(deltaSeconds: number): void {
    const target = (this.snapshot.currentTimeSeconds || 0) + deltaSeconds;
    this.seekTo(target);
  }

  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1.0, volume));
    if (this.player && !this.isDestroyed) {
      this.player.volume = clamped;
    } else {
      this.updateSnapshot({ volume: clamped });
    }
  }

  public setRate(rate: number): void {
    const clamped = Math.max(0.25, Math.min(4.0, rate));
    if (this.player && !this.isDestroyed) {
      this.player.playbackRate = clamped;
    } else {
      this.updateSnapshot({ playbackRate: clamped });
    }
  }

  public setMuted(muted: boolean): void {
    if (this.player && !this.isDestroyed) {
      this.player.muted = muted;
    } else {
      this.updateSnapshot({ isMuted: muted });
    }
  }

  public getSnapshot(): FinoraPlayerSnapshot {
    return this.snapshot;
  }

  public subscribe(listener: (snapshot: FinoraPlayerSnapshot) => void): () => void {
    this.listeners.add(listener);
    // Notify immediately with current snapshot
    listener(this.snapshot);

    return () => {
      this.listeners.delete(listener);
    };
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.detachPlayer();
    this.listeners.clear();
  }
}
