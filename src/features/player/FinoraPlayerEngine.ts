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
  private playheadTimer: any = null;
  private lastNativeTimeUpdateAt: number = 0;

  constructor(
    player?: VideoPlayer | null,
    initialPositionSeconds: number = 0,
    initialDurationSeconds: number = 0
  ) {
    this.snapshot = {
      state: "idle",
      currentTimeSeconds: initialPositionSeconds,
      durationSeconds: initialDurationSeconds > 0 ? initialDurationSeconds : 0,
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

    try {
      // Configure expo-video to emit timeUpdate every 250ms for smooth subtitle synchronization
      this.player.timeUpdateEventInterval = 0.25;
    } catch {
      // Ignored if unsupported on specific platform
    }

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
      this.lastNativeTimeUpdateAt = Date.now();
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
    this.stopPlayheadTimer();
    this.lastNativeTimeUpdateAt = 0;
    for (const sub of this.eventSubscriptions) {
      if (typeof sub?.remove === "function") {
        sub.remove();
      }
    }
    this.eventSubscriptions = [];
    this.player = null;
  }

  private startPlayheadTimer(): void {
    this.stopPlayheadTimer();
    // Fallback heartbeat: expo-video native timeUpdate events are the primary source of progression.
    // The JS timer acts only as a fallback if native timeUpdate has not fired for over 1000ms.
    this.playheadTimer = setInterval(() => {
      if (!this.player || this.snapshot.state !== "playing") return;

      const timeSinceLastNativeUpdate = Date.now() - this.lastNativeTimeUpdateAt;
      if (timeSinceLastNativeUpdate < 1000) {
        return;
      }

      const cur = this.player.currentTime;
      if (typeof cur === "number" && !isNaN(cur)) {
        this.handleTimeUpdate(cur, this.player.bufferedPosition);
      }
    }, 500);

    if (typeof (this.playheadTimer as any)?.unref === "function") {
      (this.playheadTimer as any).unref();
    }
  }

  private stopPlayheadTimer(): void {
    if (this.playheadTimer) {
      clearInterval(this.playheadTimer);
      this.playheadTimer = null;
    }
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

    if (state === "playing") {
      this.startPlayheadTimer();
    } else {
      this.stopPlayheadTimer();
    }

    const effectiveDuration =
      this.player.duration && this.player.duration > 0
        ? this.player.duration
        : this.snapshot.durationSeconds;

    this.updateSnapshot({
      state,
      currentTimeSeconds: this.player.currentTime || this.snapshot.currentTimeSeconds,
      durationSeconds: effectiveDuration,
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
      this.stopPlayheadTimer();
    } else if (status === "error") {
      state = "error";
      this.stopPlayheadTimer();
    } else if (status === "readyToPlay") {
      state = this.player?.playing ? "playing" : "paused";
      if (state === "playing") {
        this.startPlayheadTimer();
      } else {
        this.stopPlayheadTimer();
      }
    } else if (status === "idle") {
      state = "idle";
      this.stopPlayheadTimer();
    }

    const effectiveDuration =
      this.player?.duration && this.player.duration > 0
        ? this.player.duration
        : this.snapshot.durationSeconds;

    this.updateSnapshot({
      state,
      errorMessage: errorMessage || (status === "error" ? "Playback error occurred" : undefined),
      durationSeconds: effectiveDuration
    });
  }

  private handlePlayingChange(isPlaying: boolean): void {
    if (this.snapshot.state === "error" || this.snapshot.state === "ended") {
      this.stopPlayheadTimer();
      return;
    }
    const state: PlayerPlaybackState = isPlaying ? "playing" : "paused";
    if (isPlaying) {
      this.startPlayheadTimer();
    } else {
      this.stopPlayheadTimer();
    }
    this.updateSnapshot({ state });
  }

  private handleTimeUpdate(currentTime: number, bufferedPosition?: number): void {
    const effectiveDuration =
      this.player?.duration && this.player.duration > 0
        ? this.player.duration
        : this.snapshot.durationSeconds;

    this.updateSnapshot({
      currentTimeSeconds: currentTime,
      bufferedPositionSeconds:
        bufferedPosition !== undefined ? bufferedPosition : this.snapshot.bufferedPositionSeconds,
      durationSeconds: effectiveDuration
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
    const dur = this.snapshot.durationSeconds;
    const clamped = Math.max(0, dur > 0 ? Math.min(positionSeconds, dur) : positionSeconds);

    // Immediate optimistic update of currentTimeSeconds so that repeated seekBy (+10s) and timeline slider update without delay
    this.updateSnapshot({ currentTimeSeconds: clamped });

    if (this.player && !this.isDestroyed) {
      try {
        this.player.currentTime = clamped;
      } catch {
        // Ignored
      }
    }
  }

  public seekBy(deltaSeconds: number): void {
    const current = this.snapshot.currentTimeSeconds || 0;
    this.seekTo(current + deltaSeconds);
  }

  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1.0, volume));
    const shouldMute = clamped <= 0;

    // Reflect the requested value immediately instead of waiting for the native echo.
    this.updateSnapshot({ volume: clamped, isMuted: shouldMute });

    if (this.player && !this.isDestroyed) {
      try {
        // Android treats `volume = 0` as full volume (expo/expo#39209), so never
        // assign 0 directly. Silence is achieved through `muted`, which is reliable
        // on both platforms. Setting the volume does not unmute, so clear it first.
        this.player.muted = shouldMute;
        if (!shouldMute) {
          this.player.volume = clamped;
        }
      } catch {
        // The native player can be released mid-transition; the snapshot is already updated.
      }
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
