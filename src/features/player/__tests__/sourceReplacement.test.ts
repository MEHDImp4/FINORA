import {
  decideSourceChange,
  isStaleGeneration,
  LatestSourceReplacementQueue
} from "../sourceReplacement";

async function waitUntil(predicate: () => boolean, attempts = 100): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  throw new Error("Condition was not reached before the microtask limit");
}

async function flushMicrotasks(turns = 3): Promise<void> {
  for (let turn = 0; turn < turns; turn += 1) {
    await Promise.resolve();
  }
}

describe("decideSourceChange (BLK-10)", () => {
  it("uses the resume position and auto-play on first application", () => {
    const decision = decideSourceChange({
      isFirstApplication: true,
      contentChanged: false,
      previousPositionSeconds: 0,
      isPlaying: false,
      initialPositionSeconds: 42,
      autoPlay: true
    });

    expect(decision).toEqual({ seekToSeconds: 42, shouldPlay: true, resetEngine: false });
  });

  it("preserves the current position and play state on a track/quality change", () => {
    const decision = decideSourceChange({
      isFirstApplication: false,
      contentChanged: false,
      previousPositionSeconds: 100,
      isPlaying: true,
      initialPositionSeconds: 0,
      autoPlay: true
    });

    expect(decision).toEqual({ seekToSeconds: 100, shouldPlay: true, resetEngine: false });
  });

  it("keeps playback paused when it was paused before a quality change", () => {
    const decision = decideSourceChange({
      isFirstApplication: false,
      contentChanged: false,
      previousPositionSeconds: 100,
      isPlaying: false,
      initialPositionSeconds: 0,
      autoPlay: true
    });

    expect(decision).toEqual({ seekToSeconds: 100, shouldPlay: false, resetEngine: false });
  });

  it("uses the NEW content resume position and resets the engine on an episode change", () => {
    const decision = decideSourceChange({
      isFirstApplication: false,
      contentChanged: true,
      previousPositionSeconds: 100,
      isPlaying: true,
      initialPositionSeconds: 30,
      autoPlay: true
    });

    expect(decision).toEqual({ seekToSeconds: 30, shouldPlay: true, resetEngine: true });
  });

  it("does not seek when new content has no resume position", () => {
    const decision = decideSourceChange({
      isFirstApplication: false,
      contentChanged: true,
      previousPositionSeconds: 100,
      isPlaying: true,
      initialPositionSeconds: 0,
      autoPlay: true
    });

    expect(decision).toEqual({ seekToSeconds: null, shouldPlay: true, resetEngine: true });
  });

  it("detects stale source generations", () => {
    expect(isStaleGeneration(1, 2)).toBe(true);
    expect(isStaleGeneration(2, 2)).toBe(false);
  });
});

describe("LatestSourceReplacementQueue", () => {
  it("serializes replacements and keeps only the latest waiting source", async () => {
    const started: string[] = [];
    const resolvers: Array<() => void> = [];
    const replace = jest.fn(
      (source: string) =>
        new Promise<void>((resolve) => {
          started.push(source);
          resolvers.push(resolve);
        })
    );
    const successfulGenerations: number[] = [];

    const queue = new LatestSourceReplacementQueue<string>(replace, {
      onSuccess: (generation) => successfulGenerations.push(generation)
    });

    queue.enqueue(1, "s2");
    queue.enqueue(2, "s3");
    queue.enqueue(3, "s4");

    expect(started).toEqual(["s2"]);
    expect(replace).toHaveBeenCalledTimes(1);

    resolvers.shift()?.();
    await waitUntil(() => replace.mock.calls.length === 2);

    expect(started).toEqual(["s2", "s4"]);
    expect(replace.mock.calls[1][0]).toBe("s4");
    expect(replace).not.toHaveBeenCalledWith("s3");

    resolvers.shift()?.();
    await waitUntil(() => successfulGenerations.length === 2);

    expect(successfulGenerations).toEqual([1, 3]);
  });

  it("drops waiting work and late success callbacks after dispose", async () => {
    let resolveFirst!: () => void;
    const replace = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFirst = resolve;
        })
    );
    const onSuccess = jest.fn();
    const queue = new LatestSourceReplacementQueue<string>(replace, { onSuccess });

    queue.enqueue(1, "s1");
    queue.enqueue(2, "s2");
    expect(replace).toHaveBeenCalledTimes(1);

    queue.dispose();
    resolveFirst();
    await flushMicrotasks();

    expect(replace).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
