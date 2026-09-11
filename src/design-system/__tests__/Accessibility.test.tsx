import React from "react";
import ReactTestRenderer, { act } from "react-test-renderer";
import { MediaCard } from "../../features/home/components/MediaCard";
import { TimelineScrubber } from "../../features/player/components/TimelineScrubber";
import { MediaItem } from "../../types/media";
import { hapticService } from "../../core/feedback/hapticService";

describe("Accessibility & Feedback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(hapticService, "impactLight").mockImplementation(() => {});
    jest.spyOn(hapticService, "selection").mockImplementation(() => {});
  });

  it("renders MediaCard with comprehensive accessibility label and hint", async () => {
    const mockItem: MediaItem = {
      id: "media-1",
      name: "Dune: Part Two",
      type: "Movie",
      genres: ["Sci-Fi"],
      year: 2024,
      playbackPositionTicks: 450000000,
      totalTicks: 1000000000,
      playedPercentage: 45.2,
      isPlayed: false,
      isFavorite: false,
      primaryImageTag: "tag-1"
    };

    let tree: any;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <MediaCard
          item={mockItem}
          serverUrl="https://jellyfin.example.com"
          variant="poster"
        />
      );
    });

    const card = tree.root.findByProps({
      accessibilityRole: "button",
      accessibilityLabel: "Dune: Part Two, 2024, 45% watched",
      accessibilityHint: "Double tap to open media details"
    });
    expect(card).toBeTruthy();

    // Tap card
    act(() => {
      card.props.onPress();
    });
    expect(hapticService.impactLight).toHaveBeenCalled();
  });

  it("renders TimelineScrubber with adjustable accessibility values", async () => {
    const mockOnSeek = jest.fn();

    let tree: any;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <TimelineScrubber
          currentTimeSeconds={120}
          durationSeconds={600}
          onSeek={mockOnSeek}
        />
      );
    });

    const scrubber = tree.root.findByProps({
      accessibilityRole: "adjustable",
      accessibilityLabel: "Playback progress scrubber"
    });
    expect(scrubber).toBeTruthy();
    expect(scrubber.props.accessibilityValue).toEqual({
      min: 0,
      max: 600,
      now: 120,
      text: "120 of 600 seconds"
    });
  });
});
