import React from "react";
import renderer, { act } from "react-test-renderer";
import { SkipMarkerButton } from "../components/SkipMarkerButton";
import { ChapterMarker } from "../../../types/media";

describe("SkipMarkerButton", () => {
  const mockChapters: ChapterMarker[] = [
    {
      name: "Prologue",
      startPositionTicks: 0,
      markerType: "Chapter"
    },
    {
      name: "Intro",
      startPositionTicks: 300000000, // 30s
      markerType: "IntroStart"
    },
    {
      name: "Main Episode",
      startPositionTicks: 1200000000, // 120s (end of intro)
      markerType: "IntroEnd"
    },
    {
      name: "Credits",
      startPositionTicks: 12000000000, // 1200s
      markerType: "CreditsStart"
    }
  ];

  it("renders Skip Intro button when playback is within intro window", () => {
    const onSeek = jest.fn();
    let root: any;

    act(() => {
      root = renderer.create(
        <SkipMarkerButton
          chapters={mockChapters}
          currentTimeSeconds={45} // inside 30s - 120s
          durationSeconds={1300}
          onSeek={onSeek}
        />
      );
    });

    const skipIntroBtn = root.root.findByProps({ testID: "skip-intro-button" });
    expect(skipIntroBtn).toBeTruthy();

    act(() => {
      skipIntroBtn.props.onPress();
    });
    // Seeks to 120s
    expect(onSeek).toHaveBeenCalledWith(120);

    act(() => {
      root.unmount();
    });
  });

  it("returns null when playback is outside intro window", () => {
    let root: any;

    act(() => {
      root = renderer.create(
        <SkipMarkerButton
          chapters={mockChapters}
          currentTimeSeconds={15} // before intro
          durationSeconds={1300}
          onSeek={jest.fn()}
        />
      );
    });

    expect(root.toJSON()).toBeNull();

    act(() => {
      root.unmount();
    });
  });

  it("renders Skip Credits button when playback enters credits window", () => {
    const onSeek = jest.fn();
    let root: any;

    act(() => {
      root = renderer.create(
        <SkipMarkerButton
          chapters={mockChapters}
          currentTimeSeconds={1250} // after 1200s
          durationSeconds={1300}
          onSeek={onSeek}
        />
      );
    });

    const skipCreditsBtn = root.root.findByProps({ testID: "skip-credits-button" });
    expect(skipCreditsBtn).toBeTruthy();

    act(() => {
      skipCreditsBtn.props.onPress();
    });
    expect(onSeek).toHaveBeenCalledWith(1300);

    act(() => {
      root.unmount();
    });
  });

  it("detects French 'Générique' chapters and displays French label", () => {
    const frenchChapters: ChapterMarker[] = [
      { name: "Prologue", startPositionTicks: 0, markerType: "Chapter" },
      { name: "Générique d'ouverture", startPositionTicks: 200000000 }, // 20s
      { name: "Épisode", startPositionTicks: 900000000 } // 90s
    ];
    const onSeek = jest.fn();
    let root: any;

    act(() => {
      root = renderer.create(
        <SkipMarkerButton
          chapters={frenchChapters}
          currentTimeSeconds={30}
          durationSeconds={1200}
          onSeek={onSeek}
        />
      );
    });

    const skipIntroBtn = root.root.findByProps({ testID: "skip-intro-button" });
    expect(skipIntroBtn).toBeTruthy();

    act(() => {
      skipIntroBtn.props.onPress();
    });
    expect(onSeek).toHaveBeenCalledWith(90);

    act(() => {
      root.unmount();
    });
  });
});
