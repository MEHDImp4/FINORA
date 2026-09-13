import React from "react";
import renderer, { act } from "react-test-renderer";
import { TrackSelectionModal } from "../components/TrackSelectionModal";
import { MediaStreamInfo } from "../../../types/media";

describe("TrackSelectionModal", () => {
  const mockStreams: MediaStreamInfo[] = [
    {
      type: "Audio",
      index: 1,
      codec: "aac",
      language: "eng",
      channels: 6,
      displayTitle: "English (5.1 Surround)"
    },
    {
      type: "Audio",
      index: 2,
      codec: "ac3",
      language: "fra",
      channels: 2,
      displayTitle: "French (Stereo)"
    },
    {
      type: "Subtitle",
      index: 3,
      codec: "subrip",
      language: "eng",
      displayTitle: "English [CC]"
    },
    {
      type: "Subtitle",
      index: 4,
      codec: "subrip",
      language: "spa",
      displayTitle: "Spanish"
    }
  ];

  it("renders audio streams on initial audio tab", () => {
    const onSelectAudio = jest.fn();
    let root: any;

    act(() => {
      root = renderer.create(
        <TrackSelectionModal
          visible={true}
          onClose={jest.fn()}
          streams={mockStreams}
          selectedAudioIndex={1}
          onSelectAudio={onSelectAudio}
          onSelectSubtitle={jest.fn()}
          onSelectQuality={jest.fn()}
        />
      );
    });

    const audioList = root.root.findByProps({ testID: "audio-list" });
    expect(audioList).toBeTruthy();

    const audioOption1 = root.root.findByProps({ testID: "audio-option-1" });
    expect(audioOption1).toBeTruthy();

    act(() => {
      audioOption1.props.onPress();
    });
    expect(onSelectAudio).toHaveBeenCalledWith(1);

    act(() => {
      root.unmount();
    });
  });

  it("switches to subtitles tab and selects Off option", () => {
    const onSelectSubtitle = jest.fn();
    let root: any;

    act(() => {
      root = renderer.create(
        <TrackSelectionModal
          visible={true}
          onClose={jest.fn()}
          streams={mockStreams}
          selectedSubtitleIndex={3}
          onSelectAudio={jest.fn()}
          onSelectSubtitle={onSelectSubtitle}
          onSelectQuality={jest.fn()}
        />
      );
    });

    const subtitlesTab = root.root.findByProps({ testID: "tab-subtitles" });
    act(() => {
      subtitlesTab.props.onPress();
    });

    const offOption = root.root.findByProps({ testID: "subtitle-option-off" });
    expect(offOption).toBeTruthy();

    act(() => {
      offOption.props.onPress();
    });
    expect(onSelectSubtitle).toHaveBeenCalledWith(null);

    act(() => {
      root.unmount();
    });
  });

  it("switches to quality tab and selects 1080p", () => {
    const onSelectQuality = jest.fn();
    let root: any;

    act(() => {
      root = renderer.create(
        <TrackSelectionModal
          visible={true}
          onClose={jest.fn()}
          streams={mockStreams}
          selectedQuality="auto"
          onSelectAudio={jest.fn()}
          onSelectSubtitle={jest.fn()}
          onSelectQuality={onSelectQuality}
        />
      );
    });

    const qualityTab = root.root.findByProps({ testID: "tab-quality" });
    act(() => {
      qualityTab.props.onPress();
    });

    const qualityOption = root.root.findByProps({ testID: "quality-option-1080p" });
    expect(root.root.findByProps({ testID: "quality-option-original" })).toBeTruthy();
    expect(root.root.findByProps({ testID: "quality-option-4k" })).toBeTruthy();
    act(() => {
      qualityOption.props.onPress();
    });
    expect(onSelectQuality).toHaveBeenCalledWith("1080p");

    act(() => {
      root.unmount();
    });
  });
});
