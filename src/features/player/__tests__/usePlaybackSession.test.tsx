import React from "react";
import renderer, { act } from "react-test-renderer";
import { AppState } from "react-native";
import { usePlaybackSession, UsePlaybackSessionOptions } from "../usePlaybackSession";
import { FinoraPlayerSnapshot, IFinoraPlayerEngine } from "../types";

const baseSnapshot: FinoraPlayerSnapshot = {
  state: "paused",
  currentTimeSeconds: 0,
  durationSeconds: 100,
  bufferedPositionSeconds: 0,
  volume: 1,
  playbackRate: 1,
  isMuted: false
};

const playingSnapshot: FinoraPlayerSnapshot = {
  ...baseSnapshot,
  state: "playing",
  currentTimeSeconds: 10
};

function makeRepository() {
  return {
    reportPlaybackStart: jest.fn().mockResolvedValue(undefined),
    reportPlaybackProgress: jest.fn().mockResolvedValue(undefined),
    reportPlaybackStopped: jest.fn().mockResolvedValue(undefined)
  };
}

function makeEngine(): IFinoraPlayerEngine {
  return {
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(),
    seekBy: jest.fn(),
    setVolume: jest.fn(),
    setRate: jest.fn(),
    setMuted: jest.fn(),
    reset: jest.fn(),
    destroy: jest.fn(),
    getSnapshot: () => baseSnapshot,
    subscribe: () => () => {}
  };
}

function Harness(props: UsePlaybackSessionOptions) {
  usePlaybackSession(props);
  return null;
}

function renderSession(
  overrides: Partial<UsePlaybackSessionOptions> = {}
): { root: renderer.ReactTestRenderer; repo: ReturnType<typeof makeRepository> } {
  const repo = makeRepository();
  const engine = makeEngine();
  const props: UsePlaybackSessionOptions = {
    itemId: "A",
    mediaSourceId: "src-A",
    engine,
    snapshot: playingSnapshot,
    repository: repo as any,
    isOffline: false,
    ...overrides
  };
  let root!: renderer.ReactTestRenderer;
  act(() => {
    root = renderer.create(<Harness {...props} />);
  });
  return { root, repo, engine } as any;
}

describe("usePlaybackSession (BLK-09 / PLR-03)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("emits Start/Stop exactly once per episode across a route reuse", () => {
    const repo = makeRepository();
    const engine = makeEngine();

    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <Harness itemId="A" mediaSourceId="src-A" engine={engine} snapshot={playingSnapshot} repository={repo as any} />
      );
    });

    expect(repo.reportPlaybackStart).toHaveBeenCalledTimes(1);
    const startA = repo.reportPlaybackStart.mock.calls[0][0];
    expect(startA.itemId).toBe("A");
    expect(startA.playSessionId).toBeTruthy();

    // Same component instance reused for the next episode.
    act(() => {
      root.update(
        <Harness itemId="B" mediaSourceId="src-B" engine={engine} snapshot={playingSnapshot} repository={repo as any} />
      );
    });

    expect(repo.reportPlaybackStopped).toHaveBeenCalledTimes(1);
    expect(repo.reportPlaybackStopped.mock.calls[0][0].itemId).toBe("A");
    expect(repo.reportPlaybackStart).toHaveBeenCalledTimes(2);
    const startB = repo.reportPlaybackStart.mock.calls[1][0];
    expect(startB.itemId).toBe("B");
    expect(startB.playSessionId).not.toBe(startA.playSessionId);

    act(() => {
      root.unmount();
    });
    expect(repo.reportPlaybackStopped).toHaveBeenCalledTimes(2);
    expect(repo.reportPlaybackStopped.mock.calls[1][0].itemId).toBe("B");
  });

  it("never duplicates Start when the same session re-renders", () => {
    const repo = makeRepository();
    const engine = makeEngine();

    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <Harness itemId="A" mediaSourceId="src-A" engine={engine} snapshot={playingSnapshot} repository={repo as any} />
      );
    });
    act(() => {
      root.update(
        <Harness
          itemId="A"
          mediaSourceId="src-A"
          engine={engine}
          snapshot={{ ...playingSnapshot, currentTimeSeconds: 11 }}
          repository={repo as any}
        />
      );
    });
    act(() => {
      root.update(
        <Harness
          itemId="A"
          mediaSourceId="src-A"
          engine={engine}
          snapshot={{ ...playingSnapshot, currentTimeSeconds: 12 }}
          repository={repo as any}
        />
      );
    });

    expect(repo.reportPlaybackStart).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
    expect(repo.reportPlaybackStopped).toHaveBeenCalledTimes(1);
  });

  it("never lets an old item's progress pollute the newest item during rapid A -> B -> C", () => {
    const repo = makeRepository();
    const engine = makeEngine();

    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <Harness itemId="A" mediaSourceId="sA" engine={engine} snapshot={playingSnapshot} repository={repo as any} />
      );
    });
    act(() => {
      root.update(
        <Harness itemId="B" mediaSourceId="sB" engine={engine} snapshot={{ ...playingSnapshot, currentTimeSeconds: 20 }} repository={repo as any} />
      );
    });
    act(() => {
      root.update(
        <Harness itemId="C" mediaSourceId="sC" engine={engine} snapshot={{ ...playingSnapshot, currentTimeSeconds: 30 }} repository={repo as any} />
      );
    });
    act(() => root.unmount());

    expect(repo.reportPlaybackStopped.mock.calls.map((c: any[]) => c[0].itemId)).toEqual([
      "A",
      "B",
      "C"
    ]);
    expect(repo.reportPlaybackStart.mock.calls.map((c: any[]) => c[0].itemId)).toEqual([
      "A",
      "B",
      "C"
    ]);
  });

  it("reports a throttled progress update immediately after a seek", () => {
    const repo = makeRepository();
    const engine = makeEngine();

    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <Harness itemId="A" mediaSourceId="src-A" engine={engine} snapshot={playingSnapshot} repository={repo as any} />
      );
    });
    repo.reportPlaybackProgress.mockClear();

    act(() => {
      root.update(
        <Harness itemId="A" mediaSourceId="src-A" engine={engine} snapshot={{ ...playingSnapshot, currentTimeSeconds: 50 }} repository={repo as any} />
      );
    });

    expect(repo.reportPlaybackProgress).toHaveBeenCalled();
    const last = repo.reportPlaybackProgress.mock.calls.at(-1)![0];
    expect(last.itemId).toBe("A");
    expect(last.positionTicks).toBe(500_000_000);
    expect(last.playSessionId).toBeTruthy();

    act(() => root.unmount());
  });

  it("reports updated stream indices after a track change", () => {
    const repo = makeRepository();
    const engine = makeEngine();

    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <Harness itemId="A" mediaSourceId="src-A" engine={engine} snapshot={playingSnapshot} repository={repo as any} audioStreamIndex={1} />
      );
    });
    repo.reportPlaybackProgress.mockClear();

    act(() => {
      root.update(
        <Harness itemId="A" mediaSourceId="src-A" engine={engine} snapshot={playingSnapshot} repository={repo as any} audioStreamIndex={2} subtitleStreamIndex={5} />
      );
    });

    expect(repo.reportPlaybackProgress).toHaveBeenCalled();
    const last = repo.reportPlaybackProgress.mock.calls.at(-1)![0];
    expect(last.audioStreamIndex).toBe(2);
    expect(last.subtitleStreamIndex).toBe(5);

    act(() => root.unmount());
  });

  it("pauses and reports Pause on background when background playback is not allowed", () => {
    const handlers: Array<(state: string) => void> = [];
    jest.spyOn(AppState, "addEventListener").mockImplementation(((_event: string, cb: any) => {
      handlers.push(cb);
      return { remove: jest.fn() };
    }) as any);

    const repo = makeRepository();
    const engine = makeEngine();

    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <Harness itemId="A" mediaSourceId="src-A" engine={engine} snapshot={playingSnapshot} repository={repo as any} allowBackground={false} />
      );
    });
    repo.reportPlaybackProgress.mockClear();

    act(() => {
      handlers[handlers.length - 1]("background");
    });

    expect(engine.pause).toHaveBeenCalledTimes(1);
    expect(repo.reportPlaybackStopped).not.toHaveBeenCalled();
    const pauseCall = repo.reportPlaybackProgress.mock.calls.find(
      (c: any[]) => c[0].eventName === "Pause"
    );
    expect(pauseCall?.[0].isPaused).toBe(true);

    act(() => root.unmount());
  });

  it("keeps playing on background when background playback is allowed (PiP)", () => {
    const handlers: Array<(state: string) => void> = [];
    jest.spyOn(AppState, "addEventListener").mockImplementation(((_event: string, cb: any) => {
      handlers.push(cb);
      return { remove: jest.fn() };
    }) as any);

    const repo = makeRepository();
    const engine = makeEngine();

    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <Harness itemId="A" mediaSourceId="src-A" engine={engine} snapshot={playingSnapshot} repository={repo as any} allowBackground={true} />
      );
    });
    repo.reportPlaybackProgress.mockClear();

    act(() => {
      handlers[handlers.length - 1]("background");
    });

    expect(engine.pause).not.toHaveBeenCalled();
    expect(
      repo.reportPlaybackProgress.mock.calls.some((c: any[]) => c[0].eventName === "Pause")
    ).toBe(false);

    act(() => root.unmount());
  });
});
