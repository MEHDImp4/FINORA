import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { HeroBanner } from "../components/HeroBanner";
import { MediaItem } from "../../../types/media";
import { translate } from "../../../i18n";

describe("HeroBanner", () => {
  const serverUrl = "https://jellyfin.example.com";

  const sampleItem: MediaItem = {
    id: "item-hero-1",
    name: "Dune: Part Two",
    type: "Movie",
    year: 2024,
    runtimeMinutes: 166,
    communityRating: 8.6,
    genres: ["Sci-Fi", "Adventure"],
    backdropImageTag: "backdrop-tag-123",
    logoImageTag: "logo-tag-456",
    blurhash: "L5H21?%M00_400j[4nWB00_3?bof",
    playbackPositionTicks: 0,
    totalTicks: 99600000000,
    playedPercentage: 0,
    isPlayed: false,
    isFavorite: false
  };

  it("renders with logo image and metadata badges", () => {
    const tree = ReactTestRenderer.create(
      <HeroBanner item={sampleItem} serverUrl={serverUrl} />
    ).toJSON();
    expect(tree).toBeDefined();
  });

  it("renders typographic fallback title when logoImageTag is absent", () => {
    const itemNoLogo: MediaItem = { ...sampleItem, logoImageTag: undefined };
    const component = ReactTestRenderer.create(
      <HeroBanner item={itemNoLogo} serverUrl={serverUrl} />
    );
    expect(component.root.findByProps({ children: "Dune: Part Two" })).toBeDefined();
  });

  it("cycles to next candidate URL when image error occurs", () => {
    const itemWithFallbacks: MediaItem = {
      ...sampleItem,
      primaryImageTag: "primary-poster-tag",
      backdropImageTag: "primary-backdrop-tag"
    };
    const component = ReactTestRenderer.create(
      <HeroBanner item={itemWithFallbacks} serverUrl={serverUrl} />
    );
    const images = component.root.findAllByType("Image" as any);
    expect(images.length).toBeGreaterThan(0);
    const backdropImg = images[0];
    const initialSource = backdropImg.props.source.uri;
    expect(initialSource).toContain("tag=primary-poster-tag");
    expect(backdropImg.props.contentPosition).toBe("center");
    ReactTestRenderer.act(() => {
      backdropImg.props.onError();
    });
    const updatedBackdrop = component.root.findAllByType("Image" as any)[0];
    expect(updatedBackdrop.props.source.uri).not.toBe(initialSource);
  });

  it("handles empty/null media gracefully", () => {
    const component = ReactTestRenderer.create(
      <HeroBanner item={null} serverUrl={serverUrl} />
    );
    expect(component.root.findByProps({ children: translate("home.noHeroMedia", undefined, "en") })).toBeDefined();
  });
});
