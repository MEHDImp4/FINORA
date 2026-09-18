import { PlaybackSessionTracker, buildPlaySessionId, buildSessionKey } from "../sessionLifecycle";

describe("PlaybackSessionTracker (BLK-09)", () => {
  it("starts and stops a session exactly once", () => {
    const tracker = new PlaybackSessionTracker();

    const { session } = tracker.begin({
      itemId: "A",
      mediaSourceId: "src-A",
      playMethod: "direct-play"
    });
    expect(session.phase).toBe("idle");
    expect(tracker.markStarted()).toBe(true);
    expect(tracker.markStarted()).toBe(false);

    tracker.updateProgress(10_000_000, 100_000_000);
    const stop = tracker.stop();
    expect(stop).toEqual({
      itemId: "A",
      mediaSourceId: "src-A",
      playSessionId: session.playSessionId,
      positionTicks: 10_000_000,
      durationTicks: 100_000_000
    });

    // A second stop for the same session must not emit anything.
    expect(tracker.stop()).toBeNull();
    expect(tracker.isStarted()).toBe(false);
  });

  it("finalizes the previous session and issues a brand-new one on an item change", () => {
    const tracker = new PlaybackSessionTracker();

    const first = tracker.begin({ itemId: "A", mediaSourceId: "src-A", playMethod: "direct-play" });
    tracker.markStarted();
    tracker.updateProgress(5_000_000, 50_000_000);

    const second = tracker.begin({ itemId: "B", mediaSourceId: "src-B", playMethod: "direct-play" });
    expect(second.replaced?.itemId).toBe("A");
    expect(second.replaced?.positionTicks).toBe(5_000_000);
    expect(second.session.itemId).toBe("B");
    expect(second.session.playSessionId).not.toBe(first.session.playSessionId);

    expect(tracker.markStarted()).toBe(true);
    const stopB = tracker.stop();
    expect(stopB?.itemId).toBe("B");
  });

  it("never lets a stale session emit a second stop during rapid A -> B -> C switching", () => {
    const tracker = new PlaybackSessionTracker();
    const stops: string[] = [];

    tracker.begin({ itemId: "A", mediaSourceId: "sA", playMethod: "direct-play" });
    tracker.markStarted();

    const b = tracker.begin({ itemId: "B", mediaSourceId: "sB", playMethod: "direct-play" });
    if (b.replaced) stops.push(b.replaced.itemId);
    tracker.markStarted();

    const c = tracker.begin({ itemId: "C", mediaSourceId: "sC", playMethod: "direct-play" });
    if (c.replaced) stops.push(c.replaced.itemId);
    tracker.markStarted();

    const finalStop = tracker.stop();
    if (finalStop) stops.push(finalStop.itemId);

    expect(stops).toEqual(["A", "B", "C"]);
    expect(tracker.stop()).toBeNull();
  });

  it("treats a media source change as a new session", () => {
    const tracker = new PlaybackSessionTracker();

    const first = tracker.begin({ itemId: "X", mediaSourceId: "m1", playMethod: "direct-play" });
    tracker.markStarted();

    const second = tracker.begin({ itemId: "X", mediaSourceId: "m2", playMethod: "transcode" });
    expect(second.replaced?.mediaSourceId).toBe("m1");
    expect(second.session.mediaSourceId).toBe("m2");
    expect(second.session.key).not.toBe(first.session.key);
  });

  it("keeps a stable PlaySessionId for a session and rotates it between sessions", () => {
    const tracker = new PlaybackSessionTracker();
    const a = tracker.begin({ itemId: "A", mediaSourceId: "s", playMethod: "direct-play" });
    const id1 = a.session.playSessionId;
    expect(tracker.current?.playSessionId).toBe(id1);

    const b = tracker.begin({ itemId: "B", mediaSourceId: "s", playMethod: "direct-play" });
    expect(b.session.playSessionId).not.toBe(id1);

    // The generator itself never collides for the same item id.
    expect(buildPlaySessionId("A")).not.toBe(buildPlaySessionId("A"));
    expect(buildSessionKey("A")).toBe("A::A");
    expect(buildSessionKey("A", "s")).toBe("A::s");
  });
});
