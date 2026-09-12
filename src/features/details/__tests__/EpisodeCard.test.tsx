import React from "react";
import renderer, { act } from "react-test-renderer";
import { EpisodeCard } from "../components/EpisodeCard";
import { MediaItem } from "../../../types/media";

const mockEpisode: MediaItem = {
  id: "ep-1",
  name: "Winter Is Coming",
  type: "Episode",
  overview: "Eddard Stark is torn between his family and an old friend.",
  episodeIndex: 1,
  seasonIndex: 1,
  runtimeMinutes: 62,
  primaryImageTag: "tag-ep-thumb",
  playbackPositionTicks: 0,
  totalTicks: 37200000000,
  playedPercentage: 0,
  isPlayed: false,
  isFavorite: false,
  genres: []
};

describe("EpisodeCard", () => {
  it("renders episode index, title, runtime, and overview", () => {
    const onPlay = jest.fn();

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <EpisodeCard
          episode={mockEpisode}
          serverUrl="https://jellyfin.example.com"
          onPlay={onPlay}
        />
      );
    });

    const instance = root!.root;
    expect(instance.findByProps({ children: "E1 · Winter Is Coming" })).toBeTruthy();
    expect(instance.findByProps({ children: "62m" })).toBeTruthy();
    expect(
      instance.findByProps({
        children: "Eddard Stark is torn between his family and an old friend."
      })
    ).toBeTruthy();
  });

  it("triggers onPlay when episode card is pressed", () => {
    const onPlay = jest.fn();

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <EpisodeCard
          episode={mockEpisode}
          serverUrl="https://jellyfin.example.com"
          onPlay={onPlay}
        />
      );
    });

    const button = root!.root.findByProps({
      accessibilityLabel: "Play episode Winter Is Coming"
    });
    act(() => {
      button.props.onPress();
    });

    expect(onPlay).toHaveBeenCalledWith(mockEpisode);
  });

  it("renders progress bar for in-progress episode", () => {
    const inProgressEpisode: MediaItem = {
      ...mockEpisode,
      playedPercentage: 55,
      playbackPositionTicks: 20000000000
    };

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <EpisodeCard
          episode={inProgressEpisode}
          serverUrl="https://jellyfin.example.com"
          onPlay={jest.fn()}
        />
      );
    });

    const instance = root!.root;
    const progressBar = instance.findByProps({ testID: "episode-progress-bar" });
    expect(progressBar).toBeTruthy();
    expect(progressBar.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: "55%" })])
    );
  });

  it("uses 16:9 Primary image for episode thumbnail", () => {
    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <EpisodeCard
          episode={mockEpisode}
          serverUrl="https://jellyfin.example.com"
          onPlay={jest.fn()}
        />
      );
    });

    const instance = root!.root;
    const image = instance.findByProps({ contentFit: "cover" });
    expect(image.props.source.uri).toContain("/Items/ep-1/Images/Primary");
    expect(image.props.source.uri).toContain("tag=tag-ep-thumb");
    expect(image.props.source.uri).not.toContain("Backdrop");
  });
});
