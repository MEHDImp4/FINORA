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

  it("prioritizes episode primary still frame for episode thumbnail with centered framing", () => {
    const episodeWithThumbnail: MediaItem = {
      ...mockEpisode,
      id: "ep-101",
      primaryImageTag: "tag-ep-101-still",
      seriesId: "series-got",
      seriesPrimaryImageTag: "tag-series-poster"
    };

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <EpisodeCard
          episode={episodeWithThumbnail}
          serverUrl="https://jellyfin.example.com"
          onPlay={jest.fn()}
        />
      );
    });

    const instance = root!.root;
    const image = instance.findByProps({ contentFit: "cover" });
    expect(image.props.source.uri).toContain("/Items/ep-101/Images/Primary");
    expect(image.props.source.uri).toContain("tag=tag-ep-101-still");
    expect(image.props.contentPosition).toBe("center");
  });

  it("cycles to fallback when first candidate image onError is triggered", () => {
    const episodeWithFallback: MediaItem = {
      ...mockEpisode,
      primaryImageTag: "tag-ep-thumb",
      seriesId: "series-got",
      seriesPrimaryImageTag: "tag-series-poster",
      parentBackdropImageTag: "tag-series-backdrop"
    };

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <EpisodeCard
          episode={episodeWithFallback}
          serverUrl="https://jellyfin.example.com"
          onPlay={jest.fn()}
        />
      );
    });

    const instance = root!.root;
    let image = instance.findByProps({ contentFit: "cover" });
    expect(image.props.source.uri).toContain("tag-ep-thumb");

    // Trigger error on episode still
    act(() => {
      image.props.onError();
    });

    // Should now advance in candidates (to untagged primary still, backdrop, etc.)
    image = instance.findByProps({ contentFit: "cover" });
    expect(image.props.source.uri).toBeTruthy();
  });

  it("triggers onLongPress and onDownload for single episode download", () => {
    const onPlay = jest.fn();
    const onLongPress = jest.fn();
    const onDownload = jest.fn();

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <EpisodeCard
          episode={mockEpisode}
          serverUrl="https://jellyfin.example.com"
          onPlay={onPlay}
          onLongPress={onLongPress}
          onDownload={onDownload}
        />
      );
    });

    const card = root!.root.findByProps({
      accessibilityLabel: "Play episode Winter Is Coming"
    });

    // Test long press
    act(() => {
      card.props.onLongPress();
    });
    expect(onLongPress).toHaveBeenCalledWith(mockEpisode);

    // Test download button press
    const downloadBtn = root!.root.findByProps({
      testID: "download-button-ep-1"
    });
    expect(downloadBtn).toBeTruthy();

    act(() => {
      downloadBtn.props.onPress({ stopPropagation: jest.fn() });
    });
    expect(onDownload).toHaveBeenCalledWith(mockEpisode);

    // Test download button long press
    const onLongPressDownload = jest.fn();
    act(() => {
      root = renderer.create(
        <EpisodeCard
          episode={mockEpisode}
          serverUrl="https://jellyfin.example.com"
          onPlay={onPlay}
          onDownload={onDownload}
          onLongPressDownload={onLongPressDownload}
        />
      );
    });
    const downloadBtnWithLp = root!.root.findByProps({
      testID: "download-button-ep-1"
    });
    act(() => {
      downloadBtnWithLp.props.onLongPress({ stopPropagation: jest.fn() });
    });
    expect(onLongPressDownload).toHaveBeenCalledWith(mockEpisode);
  });

  it("shows live download progress and locks duplicate download presses", () => {
    const onDownload = jest.fn();
    let root: renderer.ReactTestRenderer;

    act(() => {
      root = renderer.create(
        <EpisodeCard
          episode={mockEpisode}
          serverUrl="https://jellyfin.example.com"
          onPlay={jest.fn()}
          onDownload={onDownload}
          downloadStatus="downloading"
          downloadProgress={0.42}
        />
      );
    });

    const button = root!.root.findByProps({ testID: "download-button-ep-1" });
    expect(button.props.disabled).toBe(true);
    expect(button.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 42 });
    expect(root!.root.findByProps({ testID: "download-progress-ep-1" })).toBeTruthy();
    expect(root!.root.findByProps({ testID: "download-progress-fill-ep-1" })).toBeTruthy();
  });

  it("renders a persistent full check state for an already downloaded episode", () => {
    const onDownload = jest.fn();
    let root: renderer.ReactTestRenderer;

    act(() => {
      root = renderer.create(
        <EpisodeCard
          episode={mockEpisode}
          serverUrl="https://jellyfin.example.com"
          onPlay={jest.fn()}
          onDownload={onDownload}
          isDownloaded
        />
      );
    });

    const button = root!.root.findByProps({ testID: "download-button-ep-1" });
    expect(button.props.disabled).toBe(true);
    expect(button.props.accessibilityLabel).toContain("Downloaded");
    expect(root!.root.findByProps({ testID: "download-complete-ep-1" })).toBeTruthy();
  });

  it("renders watched badge, 100% progress bar, and watched tag when episode is played", () => {
    const watchedEpisode: MediaItem = {
      ...mockEpisode,
      isPlayed: true,
      playedPercentage: 100
    };

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <EpisodeCard
          episode={watchedEpisode}
          serverUrl="https://jellyfin.example.com"
          onPlay={jest.fn()}
        />
      );
    });

    const instance = root!.root;
    // Check thumbnail badge
    const badge = instance.findByProps({ testID: "episode-watched-badge-ep-1" });
    expect(badge).toBeTruthy();

    // Check 100% progress bar
    const progressBar = instance.findByProps({ testID: "episode-progress-bar" });
    expect(progressBar).toBeTruthy();
    expect(progressBar.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: "100%" })])
    );

    // Check metadata watched tag
    const tag = instance.findByProps({ testID: "episode-watched-tag-ep-1" });
    expect(tag).toBeTruthy();

    // Check a11y label includes Watched prefix
    const card = instance.findByProps({ testID: "episode-card-ep-1" });
    expect(card.props.accessibilityLabel).toContain("Watched");
  });
});
