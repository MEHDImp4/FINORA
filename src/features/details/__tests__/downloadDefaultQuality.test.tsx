import React from "react";
import { create, act } from "react-test-renderer";
import { DownloadQualityModal } from "../components/DownloadQualityModal";
import { DownloadSeriesModal } from "../components/DownloadSeriesModal";
import { usePlaybackPreferencesStore } from "../../../stores/playbackPreferencesStore";
import { MediaItem } from "../../../types/media";

describe("Download Quality Defaults", () => {
  const mockMovie: MediaItem = {
    id: "movie-1",
    name: "Test Movie",
    type: "Movie",
    genres: [],
    playbackPositionTicks: 0,
    totalTicks: 72000000000,
    playedPercentage: 0,
    isPlayed: false,
    isFavorite: false
  };

  const mockSeries: MediaItem = {
    id: "series-1",
    name: "Test Series",
    type: "Series",
    genres: [],
    playbackPositionTicks: 0,
    totalTicks: 0,
    playedPercentage: 0,
    isPlayed: false,
    isFavorite: false
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await usePlaybackPreferencesStore.getState().setDefaultDownloadQuality("720p");
  });

  it("DownloadQualityModal initializes selected quality with defaultDownloadQuality preference", () => {
    let renderer: any;
    act(() => {
      renderer = create(
        <DownloadQualityModal
          visible={true}
          onClose={jest.fn()}
          item={mockMovie}
          onConfirmDownload={jest.fn()}
        />
      );
    });

    const root = renderer.root;
    // Look for radio options where accessibilityState.selected is true
    const selectedRadio = root.find(
      (el: any) =>
        el.props.accessibilityRole === "radio" &&
        el.props.accessibilityState?.selected === true &&
        el.props.children
    );

    expect(selectedRadio).toBeDefined();
    // Find text inside the selected radio
    const textNodes = selectedRadio.findAllByType("Text");
    const has720p = textNodes.some((t: any) => t.props.children?.includes?.("720p") || t.props.children === "720p HD");
    expect(has720p).toBe(true);
  });

  it("DownloadSeriesModal initializes selected quality chip with defaultDownloadQuality preference", () => {
    let renderer: any;
    act(() => {
      renderer = create(
        <DownloadSeriesModal
          visible={true}
          onClose={jest.fn()}
          series={mockSeries}
          seasons={[]}
          userId="user-1"
          onConfirmDownload={jest.fn()}
        />
      );
    });

    const root = renderer.root;
    const textNodes = root.findAllByType("Text");
    // Find "720p" mini chip text that is selected (white text)
    const selected720Chip = textNodes.find(
      (t: any) => t.props.children === "720p" && t.props.style?.some?.((s: any) => s?.color === "#FFFFFF")
    );
    expect(selected720Chip).toBeDefined();
  });
});
