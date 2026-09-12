import React from "react";
import renderer, { act } from "react-test-renderer";
import { DownloadQualityModal } from "../components/DownloadQualityModal";
import { MediaItem } from "../../../types/media";

describe("DownloadQualityModal", () => {
  const mockMovie: MediaItem = {
    id: "movie-1",
    name: "Inception",
    type: "Movie",
    year: 2010,
    overview: "A thief who steals corporate secrets...",
    genres: ["Action", "Sci-Fi"],
    totalTicks: 0,
    playbackPositionTicks: 0,
    playedPercentage: 0,
    isFavorite: false,
    isPlayed: false,
    mediaStreams: []
  };

  it("renders quality options and confirms download with chosen quality", async () => {
    const onConfirmMock = jest.fn();
    const onCloseMock = jest.fn();

    let root: any;
    await act(async () => {
      root = renderer.create(
        <DownloadQualityModal
          visible={true}
          onClose={onCloseMock}
          item={mockMovie}
          onConfirmDownload={onConfirmMock}
        />
      );
    });

    const modal = root.root.findByProps({ testID: "download-quality-modal" });
    expect(modal).toBeTruthy();

    const confirmBtn = root.root.findByProps({
      testID: "confirm-quality-download-button"
    });
    expect(confirmBtn).toBeTruthy();

    await act(async () => {
      confirmBtn.props.onPress();
    });

    expect(onConfirmMock).toHaveBeenCalledWith("original");
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
