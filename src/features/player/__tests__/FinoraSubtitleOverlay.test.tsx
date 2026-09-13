import React from "react";
import renderer, { act } from "react-test-renderer";
import { FinoraSubtitleOverlay } from "../components/FinoraSubtitleOverlay";
import { useSubtitleSettingsStore, DEFAULT_SUBTITLE_SETTINGS } from "../../../stores/subtitleSettingsStore";

describe("FinoraSubtitleOverlay", () => {
  beforeEach(() => {
    useSubtitleSettingsStore.setState({
      settings: { ...DEFAULT_SUBTITLE_SETTINGS },
      isLoaded: true
    });
  });

  const sampleCues = [
    { id: "1", start: 1.0, end: 4.0, text: "Welcome to FINORA" },
    { id: "2", start: 5.0, end: 8.0, text: "High fidelity subtitles" }
  ];

  it("renders active subtitle text when within timestamp bounds", () => {
    let root: any;
    act(() => {
      root = renderer.create(
        <FinoraSubtitleOverlay cues={sampleCues} currentTimeSeconds={2.5} />
      );
    });

    const textNode = root.root.findByProps({ testID: "finora-subtitle-overlay-text" });
    expect(textNode).toBeTruthy();
    expect(textNode.props.children).toBe("Welcome to FINORA");
  });

  it("renders nothing when current time is in between cues", () => {
    let root: any;
    act(() => {
      root = renderer.create(
        <FinoraSubtitleOverlay cues={sampleCues} currentTimeSeconds={4.5} />
      );
    });

    expect(root.toJSON()).toBeNull();
  });

  it("renders nothing when cue list is empty", () => {
    let root: any;
    act(() => {
      root = renderer.create(
        <FinoraSubtitleOverlay cues={[]} currentTimeSeconds={2.0} />
      );
    });

    expect(root.toJSON()).toBeNull();
  });

  it("applies customized styles from store (yellow color, large text, solid black box)", () => {
    useSubtitleSettingsStore.setState({
      settings: {
        ...DEFAULT_SUBTITLE_SETTINGS,
        size: "large",
        textColor: "#FFE600",
        background: "solid_black"
      },
      isLoaded: true
    });

    let root: any;
    act(() => {
      root = renderer.create(
        <FinoraSubtitleOverlay cues={sampleCues} currentTimeSeconds={2.0} />
      );
    });

    const textNode = root.root.findByProps({ testID: "finora-subtitle-overlay-text" });
    const flattenedTextStyle = Array.isArray(textNode.props.style)
      ? Object.assign({}, ...textNode.props.style)
      : textNode.props.style;

    expect(flattenedTextStyle.color).toBe("#FFE600");
    expect(flattenedTextStyle.fontSize).toBe(26); // Large is 26
  });

  it("respects extraBottomOffset when controls are visible", () => {
    let root: any;
    act(() => {
      root = renderer.create(
        <FinoraSubtitleOverlay
          cues={sampleCues}
          currentTimeSeconds={2.0}
          extraBottomOffset={40}
        />
      );
    });

    const overlay = root.root.findByProps({ testID: "finora-subtitle-overlay" });
    const flattenedContainerStyle = Array.isArray(overlay.props.style)
      ? Object.assign({}, ...overlay.props.style)
      : overlay.props.style;

    // Standard base offset (42) + extra (40) = 82
    expect(flattenedContainerStyle.bottom).toBe(82);
  });
});
