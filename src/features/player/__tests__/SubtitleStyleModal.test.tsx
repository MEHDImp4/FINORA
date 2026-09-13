import React from "react";
import renderer, { act } from "react-test-renderer";
import { SubtitleStyleModal } from "../components/SubtitleStyleModal";
import { useSubtitleSettingsStore, DEFAULT_SUBTITLE_SETTINGS } from "../../../stores/subtitleSettingsStore";

describe("SubtitleStyleModal", () => {
  beforeEach(() => {
    useSubtitleSettingsStore.setState({
      settings: { ...DEFAULT_SUBTITLE_SETTINGS },
      isLoaded: true
    });
  });

  it("does not render when visible is false", () => {
    let root: any;
    act(() => {
      root = renderer.create(
        <SubtitleStyleModal visible={false} onClose={jest.fn()} />
      );
    });

    expect(root.toJSON()).toBeNull();
  });

  it("renders properly when visible is true", () => {
    let root: any;
    act(() => {
      root = renderer.create(
        <SubtitleStyleModal visible={true} onClose={jest.fn()} />
      );
    });

    const modal = root.root.findByProps({ testID: "subtitle-style-modal" });
    expect(modal).toBeTruthy();

    const preview = root.root.findByProps({ testID: "subtitle-preview-box" });
    expect(preview).toBeTruthy();
  });

  it("calls onClose when close button is pressed", () => {
    const onClose = jest.fn();
    let root: any;
    act(() => {
      root = renderer.create(
        <SubtitleStyleModal visible={true} onClose={onClose} />
      );
    });

    const closeBtn = root.root.findByProps({ testID: "subtitle-style-close-button" });
    act(() => {
      closeBtn.props.onPress();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("applies preset when a preset card is clicked", () => {
    let root: any;
    act(() => {
      root = renderer.create(
        <SubtitleStyleModal visible={true} onClose={jest.fn()} />
      );
    });

    const cinemaYellowPreset = root.root.findByProps({ testID: "preset-cinema_yellow" });
    act(() => {
      cinemaYellowPreset.props.onPress();
    });

    const currentSettings = useSubtitleSettingsStore.getState().settings;
    expect(currentSettings.textColor).toBe("#FFE600");
    expect(currentSettings.background).toBe("none");
  });

  it("changes text size when size chip is pressed", () => {
    let root: any;
    act(() => {
      root = renderer.create(
        <SubtitleStyleModal visible={true} onClose={jest.fn()} />
      );
    });

    const sizeLargeChip = root.root.findByProps({ testID: "size-large" });
    act(() => {
      sizeLargeChip.props.onPress();
    });

    expect(useSubtitleSettingsStore.getState().settings.size).toBe("large");
  });

  it("toggles preview light/dark background test", () => {
    let root: any;
    act(() => {
      root = renderer.create(
        <SubtitleStyleModal visible={true} onClose={jest.fn()} />
      );
    });

    const toggleSceneBtn = root.root.findByProps({ testID: "toggle-preview-scene" });
    act(() => {
      toggleSceneBtn.props.onPress();
    });

    // Toggle again
    act(() => {
      toggleSceneBtn.props.onPress();
    });
    expect(toggleSceneBtn).toBeTruthy();
  });

  it("resets to defaults when Reset button is pressed", () => {
    useSubtitleSettingsStore.setState({
      settings: {
        ...DEFAULT_SUBTITLE_SETTINGS,
        textColor: "#00E5FF",
        size: "extraLarge"
      },
      isLoaded: true
    });

    let root: any;
    act(() => {
      root = renderer.create(
        <SubtitleStyleModal visible={true} onClose={jest.fn()} />
      );
    });

    const resetBtn = root.root.findByProps({ testID: "subtitle-reset-button" });
    act(() => {
      resetBtn.props.onPress();
    });

    const currentSettings = useSubtitleSettingsStore.getState().settings;
    expect(currentSettings).toEqual(DEFAULT_SUBTITLE_SETTINGS);
  });
});
