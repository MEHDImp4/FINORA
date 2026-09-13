import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { MediaCard } from "../components/MediaCard";
import { MediaItem } from "../../../types/media";

describe("MediaCard", () => {
  const serverUrl = "https://jellyfin.example.com";

  const sampleItem: MediaItem = {
    id: "item-card-1",
    name: "Blade Runner 2049",
    type: "Movie",
    year: 2017,
    communityRating: 8.0,
    genres: ["Sci-Fi"],
    primaryImageTag: "poster-tag-123",
    backdropImageTag: "backdrop-tag-456",
    blurhash: "L6H21?%M00_4",
    playbackPositionTicks: 36000000000,
    totalTicks: 72000000000,
    playedPercentage: 50,
    isPlayed: false,
    isFavorite: false
  };

  it("renders poster variant by default with correct title", () => {
    const component = ReactTestRenderer.create(
      <MediaCard item={sampleItem} serverUrl={serverUrl} />
    );

    const root = component.root;
    expect(root.findByProps({ children: "Blade Runner 2049" })).toBeDefined();
  });

  it("renders thumbnail variant when specified", () => {
    const component = ReactTestRenderer.create(
      <MediaCard item={sampleItem} serverUrl={serverUrl} variant="thumbnail" />
    );

    const root = component.root;
    expect(root.findByProps({ children: "Blade Runner 2049" })).toBeDefined();
  });

  it("renders progress bar fill when item is in progress", () => {
    const component = ReactTestRenderer.create(
      <MediaCard item={sampleItem} serverUrl={serverUrl} />
    );

    const testInstance = component.root;
    // Find view with testID or by checking style property width '50%'
    const views = testInstance.findAllByType("View" as any);
    const progressFill = views.find((v) => {
      const style = v.props.style;
      if (Array.isArray(style)) {
        return style.some((s: any) => s && s.width === "50%");
      }
      return style && style.width === "50%";
    });

    expect(progressFill).toBeDefined();
  });

  it("calls onPress when pressed", () => {
    const onPressMock = jest.fn();
    const component = ReactTestRenderer.create(
      <MediaCard item={sampleItem} serverUrl={serverUrl} onPress={onPressMock} />
    );

    const pressable = component.root.findByType("Pressable" as any);
    pressable.props.onPress();
    expect(onPressMock).toHaveBeenCalledWith(sampleItem);
  });

  it("renders series name and episode subtitle when item is an Episode", () => {
    const episodeItem: MediaItem = {
      ...sampleItem,
      id: "ep-1",
      name: "Pilot",
      type: "Episode",
      seriesName: "Breaking Bad",
      seasonIndex: 1,
      episodeIndex: 1
    };

    const component = ReactTestRenderer.create(
      <MediaCard item={episodeItem} serverUrl={serverUrl} variant="thumbnail" />
    );

    const root = component.root;
    expect(root.findByProps({ children: "Breaking Bad" })).toBeDefined();
    expect(root.findByProps({ children: "S1:E1 · Pilot" })).toBeDefined();
  });

  it("cycles to next candidate URL when image onError is triggered", () => {
    const episodeItem: MediaItem = {
      ...sampleItem,
      id: "ep-10",
      name: "Pilot",
      type: "Episode",
      seriesId: "series-10",
      seriesPrimaryImageTag: "series-poster-tag",
      parentBackdropImageTag: "backdrop-tag-series",
      primaryImageTag: "ep-still-tag"
    };

    let component: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(
        <MediaCard item={episodeItem} serverUrl={serverUrl} variant="thumbnail" />
      );
    });

    const root = component!.root;
    let image = root.findByProps({ contentFit: "cover" });
    expect(image.props.source.uri).toContain("series-poster-tag");
    expect(image.props.contentPosition).toBe("center");

    // Trigger onError
    ReactTestRenderer.act(() => {
      image.props.onError();
    });

    // Should now switch to next candidate
    image = root.findByProps({ contentFit: "cover" });
    expect(image.props.source.uri).toBeTruthy();
  });
});
