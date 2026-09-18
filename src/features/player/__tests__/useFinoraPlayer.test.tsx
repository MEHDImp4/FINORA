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

describe("useFinoraPlayer single-player ownership (BLK-10)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("loads each source exactly once (no useVideoPlayer + replaceAsync double load)", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<Harness sourceUrl="https://s/1" contentId="A" />);
    });
    const player = getPlayer(root);
    expect(player._replaceCount).toBe(1);

    act(() => {
      root.update(<Harness sourceUrl="https://s/2" contentId="A" />);
    });
    expect(player._replaceCount).toBe(2);

    act(() => {
      root.update(<Harness sourceUrl="https://s/3" contentId="A" />);
    });
    expect(player._replaceCount).toBe(3);
    expect(player._source.uri).toBe("https://s/3");

    act(() => root.unmount());
  });

  it("preserves the playback position across an audio/quality source change", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<Harness sourceUrl="https://s/1" contentId="A" />);
    });

    const player = getPlayer(root);
    act(() => {
      player.currentTime = 100;
      player.play();
    });

    act(() => {
      root.update(<Harness sourceUrl="https://s/2" contentId="A" />);
    });

    expect(player.currentTime).toBe(100);
    expect(player.playing).toBe(true);

    act(() => root.unmount());
  });

  it("does not force playback after a source change when the user had paused", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<Harness sourceUrl="https://s/1" contentId="A" autoPlay={false} />);
    });

    const player = getPlayer(root);
    act(() => {
      player.currentTime = 50;
    });
    expect(player.playing).toBe(false);

    act(() => {
      root.update(<Harness sourceUrl="https://s/2" contentId="A" autoPlay={false} />);
    });

    expect(player.currentTime).toBe(50);
    expect(player.playing).toBe(false);

    act(() => root.unmount());
  });

  it("uses the NEW content resume position when the item changes (next episode)", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<Harness sourceUrl="https://s/ep1" contentId="ep1" />);
    });

    const player = getPlayer(root);
    act(() => {
      player.currentTime = 100;
      player.play();
    });

    act(() => {
      root.update(
        <Harness
          sourceUrl="https://s/ep2"
          contentId="ep2"
          initialPositionSeconds={30}
        />
      );
    });

    expect(player.currentTime).toBe(30);
    expect(player.playing).toBe(true);

    act(() => root.unmount());
  });
});
