import React from "react";
import renderer, { act } from "react-test-renderer";
import { useFinoraPlayer } from "../useFinoraPlayer";

interface HarnessProps {
  sourceUrl: string;
  contentId: string;
  initialPositionSeconds?: number;
  autoPlay?: boolean;
}

function Harness({ sourceUrl, contentId, initialPositionSeconds = 0, autoPlay = true }: HarnessProps) {
  const { player } = useFinoraPlayer({ sourceUrl, contentId, initialPositionSeconds, autoPlay });
  return React.createElement("View", { testID: "player-harness", player });
}

function getPlayer(root: renderer.ReactTestRenderer): any {
  return root.root.findByProps({ testID: "player-harness" }).props.player;
}

async function waitUntil(predicate: () => boolean, attempts = 100): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  throw new Error("Condition was not reached before the microtask limit");
}

async function waitForReplaceCount(player: any, expected: number): Promise<void> {
  await act(async () => {
    await waitUntil(() => player._replaceCount === expected);
    // replaceAsync can report ready before its promise settles. Give the queue its
    // settlement turn so matching seek/play state is applied before assertions.
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useFinoraPlayer single-player ownership (BLK-10)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("loads each source exactly once (no useVideoPlayer + replaceAsync double load)", async () => {
    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<Harness sourceUrl="https://s/1" contentId="A" />);
    });
    const player = getPlayer(root);
    await waitForReplaceCount(player, 1);

    await act(async () => {
      root.update(<Harness sourceUrl="https://s/2" contentId="A" />);
    });
    await waitForReplaceCount(player, 2);

    await act(async () => {
      root.update(<Harness sourceUrl="https://s/3" contentId="A" />);
    });
    await waitForReplaceCount(player, 3);

    expect(player._source.uri).toBe("https://s/3");
    act(() => root.unmount());
  });

  it("preserves the playback position across an audio/quality source change", async () => {
    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<Harness sourceUrl="https://s/1" contentId="A" />);
    });

    const player = getPlayer(root);
    await waitForReplaceCount(player, 1);
    act(() => {
      player.currentTime = 100;
      player.play();
    });

    await act(async () => {
      root.update(<Harness sourceUrl="https://s/2" contentId="A" />);
    });
    await waitForReplaceCount(player, 2);

    expect(player.currentTime).toBe(100);
    expect(player.playing).toBe(true);

    act(() => root.unmount());
  });

  it("does not force playback after a source change when the user had paused", async () => {
    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<Harness sourceUrl="https://s/1" contentId="A" autoPlay={false} />);
    });

    const player = getPlayer(root);
    await waitForReplaceCount(player, 1);
    act(() => {
      player.currentTime = 50;
    });
    expect(player.playing).toBe(false);

    await act(async () => {
      root.update(<Harness sourceUrl="https://s/2" contentId="A" autoPlay={false} />);
    });
    await waitForReplaceCount(player, 2);

    expect(player.currentTime).toBe(50);
    expect(player.playing).toBe(false);

    act(() => root.unmount());
  });

  it("uses the NEW content resume position when the item changes (next episode)", async () => {
    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<Harness sourceUrl="https://s/ep1" contentId="ep1" />);
    });

    const player = getPlayer(root);
    await waitForReplaceCount(player, 1);
    act(() => {
      player.currentTime = 100;
      player.play();
    });

    await act(async () => {
      root.update(
        <Harness
          sourceUrl="https://s/ep2"
          contentId="ep2"
          initialPositionSeconds={30}
        />
      );
    });
    await waitForReplaceCount(player, 2);

    expect(player.currentTime).toBe(30);
    expect(player.playing).toBe(true);

    act(() => root.unmount());
  });
});