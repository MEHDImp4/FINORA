import React from "react";
import renderer, { act } from "react-test-renderer";
import { NextEpisodeOverlay } from "../components/NextEpisodeOverlay";

describe("NextEpisodeOverlay", () => {
  it("never auto-plays on its own and only advances when pressed", () => {
    jest.useFakeTimers();
    const onPlayNext = jest.fn();

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <NextEpisodeOverlay
          visible
          nextEpisodeName="Episode Two"
          nextEpisodeLabel="S1 E2"
          remainingSeconds={9}
          onPlayNext={onPlayNext}
        />
      );
    });

    act(() => {
      jest.advanceTimersByTime(20_000);
    });
    expect(onPlayNext).not.toHaveBeenCalled();

    act(() => {
      root!.root.findByProps({ testID: "next-episode-play-button" }).props.onPress();
    });
    expect(onPlayNext).toHaveBeenCalledTimes(1);

    act(() => {
      root!.unmount();
    });
    jest.useRealTimers();
  });

  it("shows the real remaining time", () => {
    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <NextEpisodeOverlay
          visible
          nextEpisodeName="Episode Two"
          nextEpisodeLabel="S1 E2"
          remainingSeconds={10}
          onPlayNext={jest.fn()}
        />
      );
    });

    expect(root!.root.findByProps({ testID: "next-episode-remaining" }).props.children).toBe("0:10");

    act(() => {
      root!.unmount();
    });
  });
});
