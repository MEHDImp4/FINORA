import { FinoraPlayerEngine } from "../FinoraPlayerEngine";
import { VideoPlayer } from "expo-video";

// Helper to create mock expo-video player
function createMockPlayer(): VideoPlayer {
  const listeners: Record<string, Set<Function>> = {};

  const mock: any = {
    playing: false,
    currentTime: 0,
    duration: 120,
    bufferedPosition: 30,
    volume: 1.0,
    playbackRate: 1.0,
    muted: false,
    status: "idle",
    play: jest.fn(function () {
      mock.playing = true;
      mock.status = "readyToPlay";
      emit("playingChange", { isPlaying: true });
    }),
    pause: jest.fn(function () {
      mock.playing = false;
      emit("playingChange", { isPlaying: false });
    }),
    replay: jest.fn(function () {
      mock.currentTime = 0;
      mock.play();
    }),
    addListener: jest.fn((event: string, handler: Function) => {
      if (!listeners[event]) listeners[event] = new Set();
      listeners[event].add(handler);
      return {
        remove: () => listeners[event]?.delete(handler)
      };
    })
  };

  function emit(event: string, payload: any) {
    listeners[event]?.forEach((fn) => fn(payload));
  }

  mock._emit = emit;
  return mock as unknown as VideoPlayer;
}

describe("FinoraPlayerEngine", () => {
  it("initializes with idle snapshot and initial position", () => {
    const engine = new FinoraPlayerEngine(null, 45);
    const snapshot = engine.getSnapshot();

    expect(snapshot.state).toBe("idle");
    expect(snapshot.currentTimeSeconds).toBe(45);
    expect(snapshot.volume).toBe(1.0);
    expect(snapshot.playbackRate).toBe(1.0);
  });

  it("attaches player and notifies subscribers on state transitions", () => {
    const mockPlayer = createMockPlayer();
    const engine = new FinoraPlayerEngine();

    const snapshots: any[] = [];
    const unsubscribe = engine.subscribe((snap) => {
      snapshots.push(snap);
    });

    engine.attachPlayer(mockPlayer, 10);

    // Initial attach should update
    expect(engine.getSnapshot().currentTimeSeconds).toBe(10);

    // Play action
    engine.play();
    expect((mockPlayer as any).play).toHaveBeenCalled();
    expect(engine.getSnapshot().state).toBe("playing");

    // Pause action
    engine.pause();
    expect((mockPlayer as any).pause).toHaveBeenCalled();
    expect(engine.getSnapshot().state).toBe("paused");

    // Seek action
    engine.seekTo(75);
    expect(mockPlayer.currentTime).toBe(75);

    unsubscribe();
  });

  it("handles playToEnd event by setting state to ended", () => {
    const mockPlayer = createMockPlayer();
    const engine = new FinoraPlayerEngine(mockPlayer);

    (mockPlayer as any)._emit("playToEnd", {});
    expect(engine.getSnapshot().state).toBe("ended");

    // Replay on play() when ended
    engine.play();
    expect((mockPlayer as any).replay).toHaveBeenCalled();
  });

  it("handles statusChange errors gracefully", () => {
    const mockPlayer = createMockPlayer();
    const engine = new FinoraPlayerEngine(mockPlayer);

    (mockPlayer as any)._emit("statusChange", {
      status: "error",
      error: { message: "Failed to decode video stream" }
    });

    const snapshot = engine.getSnapshot();
    expect(snapshot.state).toBe("error");
    expect(snapshot.errorMessage).toBe("Failed to decode video stream");
  });

  it("handles volume, rate, and mute updates properly", () => {
    const mockPlayer = createMockPlayer();
    const engine = new FinoraPlayerEngine(mockPlayer);

    engine.setVolume(0.5);
    expect(mockPlayer.volume).toBe(0.5);

    engine.setRate(1.5);
    expect(mockPlayer.playbackRate).toBe(1.5);

    engine.setMuted(true);
    expect(mockPlayer.muted).toBe(true);
  });

  it("mutes through the muted flag instead of assigning volume 0", () => {
    const mockPlayer = createMockPlayer();
    const engine = new FinoraPlayerEngine(mockPlayer);

    engine.setVolume(0.4);
    expect(mockPlayer.volume).toBe(0.4);
    expect(mockPlayer.muted).toBe(false);

    // Android treats `volume = 0` as full volume (expo/expo#39209), so muting must
    // not write volume 0 — it flips `muted` and leaves the last level untouched.
    engine.setVolume(0);
    expect(mockPlayer.volume).toBe(0.4);
    expect(mockPlayer.muted).toBe(true);
    expect(engine.getSnapshot().volume).toBe(0);
    expect(engine.getSnapshot().isMuted).toBe(true);

    // Raising the volume again unmutes and applies the level.
    engine.setVolume(0.6);
    expect(mockPlayer.muted).toBe(false);
    expect(mockPlayer.volume).toBe(0.6);
    expect(engine.getSnapshot().isMuted).toBe(false);
  });

  it("cleans up subscriptions on destroy", () => {
    const mockPlayer = createMockPlayer();
    const engine = new FinoraPlayerEngine(mockPlayer);

    const listener = jest.fn();
    engine.subscribe(listener);

    engine.destroy();
    engine.play();

    // Player.play should not be called after destroy
    expect((mockPlayer as any).play).not.toHaveBeenCalled();
  });
});
