import { decideSourceChange, isStaleGeneration } from "../sourceReplacement";

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
