import React from "react";
import renderer, { act } from "react-test-renderer";
import { SeriesDetailsView } from "../components/SeriesDetailsView";
import { MediaItem } from "../../../types/media";
import { useSeasons, useEpisodes, useSimilarItems } from "../../../hooks/useMediaQueries";

jest.mock("../../../hooks/useMediaQueries");

const mockSeries: MediaItem = {
  id: "ser-1",
  name: "Breaking Bad",
  type: "Series",
  overview: "A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing methamphetamine.",
  year: 2008,
  communityRating: 9.5,
  officialRating: "TV-MA",
  backdropImageTag: "tag-bb-backdrop",
  logoImageTag: "tag-bb-logo",
  playbackPositionTicks: 0,
  totalTicks: 0,
  playedPercentage: 0,
  isPlayed: false,
  isFavorite: false,
  genres: ["Crime", "Drama", "Thriller"]
};

const mockSeasons: MediaItem[] = [
  {
    id: "sea-1",
    name: "Season 1",
    type: "Season",
    seasonIndex: 1,
    playbackPositionTicks: 0,
    totalTicks: 0,
    playedPercentage: 0,
    isPlayed: false,
    isFavorite: false,
    genres: []
  },
  {
    id: "sea-2",
    name: "Season 2",
    type: "Season",
    seasonIndex: 2,
    playbackPositionTicks: 0,
    totalTicks: 0,
    playedPercentage: 0,
    isPlayed: false,
    isFavorite: false,
    genres: []
  }
];

const mockEpisodes: MediaItem[] = [
  {
    id: "ep-101",
    name: "Pilot",
    type: "Episode",
    episodeIndex: 1,
    seasonIndex: 1,
    runtimeMinutes: 58,
    overview: "Walter White is a mild-mannered high school chemistry teacher.",
    playbackPositionTicks: 0,
    totalTicks: 34800000000,
    playedPercentage: 0,
    isPlayed: false,
    isFavorite: false,
    genres: []
  },
  {
    id: "ep-102",
    name: "Cat's in the Bag...",
    type: "Episode",
    episodeIndex: 2,
    seasonIndex: 1,
    runtimeMinutes: 48,
    overview: "Walt and Jesse attempt to dispose of two bodies.",
    playbackPositionTicks: 0,
    totalTicks: 28800000000,
    playedPercentage: 0,
    isPlayed: false,
    isFavorite: false,
    genres: []
  }
];

describe("SeriesDetailsView", () => {
  beforeEach(() => {
    (useSeasons as jest.Mock).mockReturnValue({
      data: mockSeasons,
      isLoading: false
    });

    (useEpisodes as jest.Mock).mockReturnValue({
      data: mockEpisodes,
      isLoading: false
    });

    (useSimilarItems as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false
    });
  });

  it("renders series header, seasons count, community rating, and season pills", () => {
    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <SeriesDetailsView
          series={mockSeries}
          serverUrl="https://jellyfin.example.com"
          userId="user-123"
          onPlayEpisode={jest.fn()}
          onBack={jest.fn()}
        />
      );
    });

    const instance = root!.root;
    expect(instance.findByProps({ children: 2008 })).toBeTruthy();
    expect(instance.findByProps({ children: "2 Seasons" })).toBeTruthy();
    expect(instance.findByProps({ children: 9.5 })).toBeTruthy();
    expect(instance.findByProps({ children: "Season 1" })).toBeTruthy();
    expect(instance.findByProps({ children: "Season 2" })).toBeTruthy();
    expect(instance.findByProps({ children: "E1 · Pilot" })).toBeTruthy();
  });

  it("triggers onPlayEpisode with the first unplayed episode when Play button is pressed", () => {
    const onPlayEpisode = jest.fn();

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <SeriesDetailsView
          series={mockSeries}
          serverUrl="https://jellyfin.example.com"
          userId="user-123"
          onPlayEpisode={onPlayEpisode}
          onBack={jest.fn()}
        />
      );
    });

    const playButton = root!.root.findByProps({ label: "Play S1:E1" });
    act(() => {
      playButton.props.onPress();
    });

    expect(onPlayEpisode).toHaveBeenCalledWith(mockEpisodes[0]);
  });

  it("handles back button press", () => {
    const onBack = jest.fn();

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <SeriesDetailsView
          series={mockSeries}
          serverUrl="https://jellyfin.example.com"
          userId="user-123"
          onPlayEpisode={jest.fn()}
          onBack={onBack}
        />
      );
    });

    const backButton = root!.root.findByProps({ accessibilityLabel: "Go back" });
    act(() => {
      backButton.props.onPress();
    });

    expect(onBack).toHaveBeenCalled();
  });
});
