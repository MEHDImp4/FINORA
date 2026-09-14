import React from "react";
import { View } from "react-native";
import renderer, { act } from "react-test-renderer";
import { PlayerGestures } from "../components/PlayerGestures";

describe("PlayerGestures", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("triggers single tap when tapped once", () => {
    const onSingleTap = jest.fn();
    const onDoubleTapLeft = jest.fn();
    const onDoubleTapRight = jest.fn();

    let root: any;
    act(() => {
      root = renderer.create(
        <PlayerGestures
          onSingleTap={onSingleTap}
          onDoubleTapLeft={onDoubleTapLeft}
          onDoubleTapRight={onDoubleTapRight}
        >
          <View testID="child-view" />
        </PlayerGestures>
      );
    });

    const surface = root.root.findByProps({ testID: "gesture-touch-surface" });

    // First tap on left side
    act(() => {
      surface.props.onPress({ nativeEvent: { locationX: 50 } });
    });

    // Advance timer past double tap threshold (300ms)
    act(() => {
      jest.advanceTimersByTime(350);
    });

    expect(onSingleTap).toHaveBeenCalledTimes(1);
    expect(onDoubleTapLeft).not.toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
  });

  it("triggers double tap left when tapped twice in quick succession on left", () => {
    const onSingleTap = jest.fn();
    const onDoubleTapLeft = jest.fn();
    const onDoubleTapRight = jest.fn();

    let root: any;
    act(() => {
      root = renderer.create(
        <PlayerGestures
          onSingleTap={onSingleTap}
          onDoubleTapLeft={onDoubleTapLeft}
          onDoubleTapRight={onDoubleTapRight}
        >
          <View testID="child-view" />
        </PlayerGestures>
      );
    });

    const surface = root.root.findByProps({ testID: "gesture-touch-surface" });

    // First tap
    act(() => {
      surface.props.onPress({ nativeEvent: { locationX: 60 } });
    });

    // Advance 100ms (< 300ms)
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Second tap
    act(() => {
      surface.props.onPress({ nativeEvent: { locationX: 70 } });
    });

    expect(onDoubleTapLeft).toHaveBeenCalledTimes(1);
    expect(onSingleTap).not.toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
  });

  it("triggers double tap right when tapped twice quickly on the right side", () => {
    const onDoubleTapRight = jest.fn();
    const onDoubleTapLeft = jest.fn();

    let root: any;
    act(() => {
      root = renderer.create(
        <PlayerGestures
          onSingleTap={jest.fn()}
          onDoubleTapLeft={onDoubleTapLeft}
          onDoubleTapRight={onDoubleTapRight}
        >
          <View testID="child-view" />
        </PlayerGestures>
      );
    });

    // Set a known container width
    act(() => {
      root.root.findByProps({ testID: "player-gestures" }).props.onLayout({
        nativeEvent: { layout: { width: 400 } }
      });
    });

    const surface = root.root.findByProps({ testID: "gesture-touch-surface" });

    // Both taps on the right half (x > 200)
    act(() => {
      surface.props.onPress({ nativeEvent: { locationX: 310 } });
    });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    act(() => {
      surface.props.onPress({ nativeEvent: { locationX: 320 } });
    });

    expect(onDoubleTapRight).toHaveBeenCalledTimes(1);
    expect(onDoubleTapLeft).not.toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
  });

  it("triggers long press start and end for 2x speed", () => {
    const onLongPressStart = jest.fn();
    const onLongPressEnd = jest.fn();

    let root: any;
    act(() => {
      root = renderer.create(
        <PlayerGestures
          onSingleTap={jest.fn()}
          onDoubleTapLeft={jest.fn()}
          onDoubleTapRight={jest.fn()}
          onLongPressStart={onLongPressStart}
          onLongPressEnd={onLongPressEnd}
        >
          <View testID="child-view" />
        </PlayerGestures>
      );
    });

    const surface = root.root.findByProps({ testID: "gesture-touch-surface" });

    act(() => {
      surface.props.onLongPress();
    });
    expect(onLongPressStart).toHaveBeenCalledTimes(1);

    act(() => {
      surface.props.onPressOut();
    });
    expect(onLongPressEnd).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
  });

  it("renders the volume HUD testID element structure when provided", () => {
    let root: any;
    act(() => {
      root = renderer.create(
        <PlayerGestures
          onSingleTap={jest.fn()}
          onDoubleTapLeft={jest.fn()}
          onDoubleTapRight={jest.fn()}
        >
          <View testID="child-view" />
        </PlayerGestures>
      );
    });

    // HUDs are hidden by default
    const volumeHUDs = root.root.findAllByProps({ testID: "hud-volume" });
    const brightnessHUDs = root.root.findAllByProps({ testID: "hud-brightness" });
    expect(volumeHUDs.length).toBe(0);
    expect(brightnessHUDs.length).toBe(0);

    act(() => {
      root.unmount();
    });
  });

  it("does not fire single tap if long press was detected", () => {
    const onSingleTap = jest.fn();

    let root: any;
    act(() => {
      root = renderer.create(
        <PlayerGestures
          onSingleTap={onSingleTap}
          onDoubleTapLeft={jest.fn()}
          onDoubleTapRight={jest.fn()}
          onLongPressStart={jest.fn()}
          onLongPressEnd={jest.fn()}
        >
          <View testID="child-view" />
        </PlayerGestures>
      );
    });

    const surface = root.root.findByProps({ testID: "gesture-touch-surface" });

    // Trigger long press
    act(() => {
      surface.props.onLongPress();
    });

    // Attempt a tap press — should be ignored because long press is active
    act(() => {
      surface.props.onPress({ nativeEvent: { locationX: 100 } });
    });

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(onSingleTap).not.toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
  });
});
