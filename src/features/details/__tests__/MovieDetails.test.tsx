import React from "react";
import renderer, { act } from "react-test-renderer";
import { MovieDetailsView } from "../components/MovieDetailsView";
import { MediaItem } from "../../../types/media";

const mockMovie: MediaItem = {
  id: "mov-1",
  name: "Interstellar",
  type: "Movie",
  overview: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
  tagline: "Mankind was born on Earth. It was never meant to die here.",
  year: 2014,
  runtimeMinutes: 169,
  communityRating: 8.7,
  officialRating: "PG-13",
  genres: ["Adventure", "Drama", "Sci-Fi"],
  backdropImageTag: "tag-backdrop",
  logoImageTag: "tag-logo",
  playbackPositionTicks: 0,
  totalTicks: 101400000000,
  playedPercentage: 0,
  isPlayed: false,
  isFavorite: false,
  people: [
    {
      id: "p-1",
      name: "Matthew McConaughey",
      role: "Cooper",
      type: "Actor",
      primaryImageTag: "tag-matthew"
    },
    {
      id: "p-2",
      name: "Anne Hathaway",
      role: "Brand",
      type: "Actor"
    }
  ],
  mediaStreams: [
    {
      type: "Video",
      codec: "hevc",
      width: 3840,
      height: 2160,
      isDefault: true
    },
    {
      type: "Audio",
      codec: "dts",
      channels: 6,
      isDefault: true
    }
  ]
};

describe("MovieDetailsView", () => {
  it("renders movie metadata, specs, tagline, and cast list accurately", () => {
    const onPlay = jest.fn();
    const onBack = jest.fn();

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <MovieDetailsView
          item={mockMovie}
          serverUrl="https://jellyfin.example.com"
          onPlay={onPlay}
          onBack={onBack}
        />
      );
    });

    const instance = root!.root;

    // Check year and runtime
    expect(instance.findByProps({ children: 2014 })).toBeTruthy();
    expect(instance.findByProps({ children: "2h 49m" })).toBeTruthy();

    // Check community rating and official rating
    expect(instance.findByProps({ children: "★ 8.7" })).toBeTruthy();
    expect(instance.findByProps({ children: "PG-13" })).toBeTruthy();

    // Check 4K and 5.1 specs
    expect(instance.findByProps({ children: "4K" })).toBeTruthy();
    expect(instance.findByProps({ children: "5.1" })).toBeTruthy();

    // Check tagline
    expect(instance.findByProps({ children: `"Mankind was born on Earth. It was never meant to die here."` })).toBeTruthy();

    // Check cast member
    expect(instance.findByProps({ children: "Matthew McConaughey" })).toBeTruthy();
    expect(instance.findByProps({ children: "Cooper" })).toBeTruthy();
  });

  it("triggers onPlay when Play button is pressed", () => {
    const onPlay = jest.fn();
    const onBack = jest.fn();

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <MovieDetailsView
          item={mockMovie}
          serverUrl="https://jellyfin.example.com"
          onPlay={onPlay}
          onBack={onBack}
        />
      );
    });

    const playButton = root!.root.findByProps({ label: "Play" });
    act(() => {
      playButton.props.onPress();
    });

    expect(onPlay).toHaveBeenCalledWith(mockMovie);
  });

  it("renders Resume label when movie has partial playback progress", () => {
    const inProgressMovie: MediaItem = {
      ...mockMovie,
      playedPercentage: 42,
      playbackPositionTicks: 42000000000
    };

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <MovieDetailsView
          item={inProgressMovie}
          serverUrl="https://jellyfin.example.com"
          onPlay={jest.fn()}
          onBack={jest.fn()}
        />
      );
    });

    expect(root!.root.findByProps({ label: "Resume (42%)" })).toBeTruthy();
  });

  it("handles back button and favorite toggle", () => {
    const onBack = jest.fn();
    const onToggleFavorite = jest.fn();

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <MovieDetailsView
          item={mockMovie}
          serverUrl="https://jellyfin.example.com"
          onPlay={jest.fn()}
          onBack={onBack}
          onToggleFavorite={onToggleFavorite}
        />
      );
    });

    const backButton = root!.root.findByProps({ accessibilityLabel: "Go back" });
    act(() => {
      backButton.props.onPress();
    });
    expect(onBack).toHaveBeenCalled();

    const watchlistButton = root!.root.findByProps({ accessibilityLabel: "Add to watchlist" });
    act(() => {
      watchlistButton.props.onPress();
    });
    expect(onToggleFavorite).toHaveBeenCalledWith(mockMovie);
  });
});
