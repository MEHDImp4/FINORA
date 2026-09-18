import React from "react";
import renderer, { act } from "react-test-renderer";
import { DownloadSeriesModal } from "../components/DownloadSeriesModal";
import { MediaItem } from "../../../types/media";
import { mediaRepository } from "../../../core/repositories/mediaRepository";
import { translate } from "../../../i18n";

jest.mock("../../../core/repositories/mediaRepository");

describe("DownloadSeriesModal", () => {
  const mockSeries: MediaItem = {
    id: "series-1",
    name: "Breaking Bad",
    type: "Series",
    year: 2008,
    overview: "A chemistry teacher turned crystal meth producer...",
    genres: ["Drama", "Crime"],
    totalTicks: 0,
    playbackPositionTicks: 0,
    playedPercentage: 0,
    isFavorite: false,
    isPlayed: false,
    mediaStreams: []
  };

  const mockSeasons: MediaItem[] = [
    {
      id: "season-1",
      name: "Season 1",
      type: "Season",
      totalTicks: 0,
      playbackPositionTicks: 0,
      playedPercentage: 0,
      isFavorite: false,
      isPlayed: false,
      genres: [],
      mediaStreams: []
    },
    {
      id: "season-2",
      name: "Season 2",
      type: "Season",
      totalTicks: 0,
      playbackPositionTicks: 0,
      playedPercentage: 0,
      isFavorite: false,
      isPlayed: false,
      genres: [],
      mediaStreams: []
    }
  ];

  const mockEpisodes: MediaItem[] = [
    // Season 1: 1 played, 2 unplayed
    {
      id: "ep-1-1",
      name: "Pilot",
      type: "Episode",
      seasonId: "season-1",
      seasonIndex: 1,
      episodeIndex: 1,
      isPlayed: true,
      playedPercentage: 100,
      totalTicks: 30000000000,
      playbackPositionTicks: 30000000000,
      genres: [],
      isFavorite: false,
      mediaStreams: []
    },
    {
      id: "ep-1-2",
      name: "Cat's in the Bag...",
      type: "Episode",
      seasonId: "season-1",
      seasonIndex: 1,
      episodeIndex: 2,
      isPlayed: false,
      playedPercentage: 0,
      totalTicks: 30000000000,
      playbackPositionTicks: 0,
      genres: [],
      isFavorite: false,
      mediaStreams: []
    },
    {
      id: "ep-1-3",
      name: "...And the Bag's in the River",
      type: "Episode",
      seasonId: "season-1",
      seasonIndex: 1,
      episodeIndex: 3,
      isPlayed: false,
      playedPercentage: 0,
      totalTicks: 30000000000,
      playbackPositionTicks: 0,
      genres: [],
      isFavorite: false,
      mediaStreams: []
    },
    // Season 2: 1 unplayed
    {
      id: "ep-2-1",
      name: "Seven Thirty-Seven",
      type: "Episode",
      seasonId: "season-2",
      seasonIndex: 2,
      episodeIndex: 1,
      isPlayed: false,
      playedPercentage: 0,
      totalTicks: 30000000000,
      playbackPositionTicks: 0,
      genres: [],
      isFavorite: false,
      mediaStreams: []
    }
  ];

  beforeEach(() => {
    (mediaRepository.getEpisodes as jest.Mock).mockResolvedValue(mockEpisodes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("filters out watched episodes and selects strictly unplayed episodes", async () => {
    const onConfirmMock = jest.fn();
    const onCloseMock = jest.fn();

    let root: any;
    await act(async () => {
      root = renderer.create(
        <DownloadSeriesModal
          visible={true}
          onClose={onCloseMock}
          series={mockSeries}
          seasons={mockSeasons}
          userId="user-1"
          onConfirmDownload={onConfirmMock}
        />
      );
    });

    // Find the modal container
    const modal = root.root.findByProps({ testID: "download-series-modal" });
    expect(modal).toBeTruthy();

    // Confirm button should be active and trigger download of 3 unplayed episodes
    const downloadBtn = root.root.findByProps({ testID: "confirm-download-button" });
    expect(downloadBtn).toBeTruthy();
    expect(downloadBtn.props.label).toBe(translate("details.downloadWithCount", { count: 3 }));

    await act(async () => {
      downloadBtn.props.onPress();
    });

    expect(onConfirmMock).toHaveBeenCalledTimes(1);
    const downloadedEpisodes: MediaItem[] = onConfirmMock.mock.calls[0][0];
    const chosenQuality: string = onConfirmMock.mock.calls[0][1];
    expect(downloadedEpisodes).toHaveLength(3);
    expect(downloadedEpisodes.every((ep) => !ep.isPlayed)).toBe(true);
    expect(downloadedEpisodes.map((ep) => ep.id)).toEqual(["ep-1-2", "ep-1-3", "ep-2-1"]);
    expect(chosenQuality).toBe("1080p");
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
