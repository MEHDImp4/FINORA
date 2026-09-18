import React from "react";
import { act, create } from "react-test-renderer";
import { VerticalSlider } from "../components/VerticalSlider";

describe("VerticalSlider", () => {
  it("renders correctly with initial value, label, and accessibility props", () => {
    const onValueChange = jest.fn();
    const tree = create(
      <VerticalSlider
        value={0.7}
        onValueChange={onValueChange}
        iconName="sunny"
        label="Luminosité"
        accessibilityLabel="Luminosité de l'écran"
        testID="brightness-slider"
      />
    );

    const container = tree.root.findByProps({
      accessibilityRole: "adjustable",
      accessibilityLabel: "Luminosité de l'écran"
    });
    expect(container).toBeTruthy();
    expect(container.props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 70,
      text: "70%"
    });

    const valueLabel = tree.root.findByProps({ testID: "brightness-slider-value" });
    const renderedText = Array.isArray(valueLabel.props.children)
      ? valueLabel.props.children.join("")
      : String(valueLabel.props.children);
    expect(renderedText).toBe("70%");
  });

  it("calculates direct touch value on tap (grant) accurately", () => {
    const onValueChange = jest.fn();
    const onSlidingChange = jest.fn();

    const tree = create(
      <VerticalSlider
        value={0.2}
        onValueChange={onValueChange}
        onSlidingChange={onSlidingChange}
        iconName="sunny"
        label="Luminosité"
        accessibilityLabel="Luminosité de l'écran"
        testID="brightness-slider"
      />
    );

    const track = tree.root.findByProps({ testID: "brightness-slider-track" });

    // Tap at the middle of the 180px track (locationY = 90 -> 50%)
    act(() => {
      track.props.onResponderGrant({
        nativeEvent: { locationY: 90 }
      });
    });

    expect(onSlidingChange).toHaveBeenCalledWith(true);
    expect(onValueChange).toHaveBeenCalledWith(0.5);

    // Release should notify end of sliding
    act(() => {
      track.props.onResponderRelease(
        { nativeEvent: { locationY: 90 } },
        { dy: 0 }
      );
    });

    expect(onSlidingChange).toHaveBeenCalledWith(false);
  });

  it("accurately clamps to 100% at the top and 0% at the bottom", () => {
    const onValueChange = jest.fn();

    const tree = create(
      <VerticalSlider
        value={0.5}
        onValueChange={onValueChange}
        iconName="sunny"
        label="Luminosité"
        accessibilityLabel="Luminosité"
        testID="slider"
      />
    );

    const track = tree.root.findByProps({ testID: "slider-track" });

    // Touch at top edge (locationY = 0)
    act(() => {
      track.props.onResponderGrant({
        nativeEvent: { locationY: 0 }
      });
    });
    expect(onValueChange).toHaveBeenLastCalledWith(1);

    // Touch at bottom edge (locationY = 180)
    act(() => {
      track.props.onResponderGrant({
        nativeEvent: { locationY: 180 }
      });
    });
    expect(onValueChange).toHaveBeenLastCalledWith(0);
  });

  it("tracks continuous vertical drag accurately relative to touch start", () => {
    const onValueChange = jest.fn();

    const tree = create(
      <VerticalSlider
        value={0.5}
        onValueChange={onValueChange}
        iconName="sunny"
        label="Luminosité"
        accessibilityLabel="Luminosité"
        testID="slider"
      />
    );

    const track = tree.root.findByProps({ testID: "slider-track" });

    // User touches at Y = 90 (50%)
    act(() => {
      track.props.onResponderGrant({
        nativeEvent: { locationY: 90 }
      });
    });
    expect(onValueChange).toHaveBeenCalledWith(0.5);

    // User drags up by 36px (currentY = 90 - 36 = 54 -> (180 - 54)/180 = 70%)
    act(() => {
      track.props.onResponderMove(
        { nativeEvent: { locationY: 54 } },
        { dy: -36 }
      );
    });
    expect(onValueChange).toHaveBeenLastCalledWith(0.7);

    // User drags far past top (dy = -200 -> clamps to 100%)
    act(() => {
      track.props.onResponderMove(
        { nativeEvent: { locationY: -110 } },
        { dy: -200 }
      );
    });
    expect(onValueChange).toHaveBeenLastCalledWith(1);

    // User drags far past bottom (dy = +300 -> clamps to 0%)
    act(() => {
      track.props.onResponderMove(
        { nativeEvent: { locationY: 390 } },
        { dy: 300 }
      );
    });
    expect(onValueChange).toHaveBeenLastCalledWith(0);
  });

  it("updates display when controlled value prop changes", () => {
    const onValueChange = jest.fn();
    const tree = create(
      <VerticalSlider
        value={0.3}
        onValueChange={onValueChange}
        iconName="sunny"
        label="Luminosité"
        accessibilityLabel="Luminosité"
        testID="slider"
      />
    );

    let valueLabel = tree.root.findByProps({ testID: "slider-value" });
    expect(valueLabel.props.children.join("")).toBe("30%");

    act(() => {
      tree.update(
        <VerticalSlider
          value={0.85}
          onValueChange={onValueChange}
          iconName="sunny"
          label="Luminosité"
          accessibilityLabel="Luminosité"
          testID="slider"
        />
      );
    });

    valueLabel = tree.root.findByProps({ testID: "slider-value" });
    expect(valueLabel.props.children.join("")).toBe("85%");
  });
});
