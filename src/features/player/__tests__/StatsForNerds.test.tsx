import React from "react";
import renderer, { act } from "react-test-renderer";
import { StatsForNerdsModal } from "../components/StatsForNerdsModal";
import { MediaItem } from "../../../types/media";
import { PlaybackPlan } from "../playbackPlanner";
import { FinoraPlayerSnapshot } from "../types";

describe("StatsForNerdsModal", () => {
  const mockItem: MediaItem = {
    id: "item-nerd-1",
    name: "Cyberpunk Edgerunners",
    type: "Series",
    genres: ["Anime", "Sci-Fi"],
    playbackPositionTicks: 0,
    totalTicks: 1500000000,
    playedPercentage: 0,
    isPlayed: false,
    isFavorite: false,
    mediaStreams: [
      { type: "Video", codec: "hevc", width: 3840, height: 2160 },
      { type: "Audio", codec: "eac3", channels: 6 }
    ]
  };

  const mockPlan: PlaybackPlan = {
    mode: "direct-play",
    url: "https://demo.jellyfin.org/Videos/item-nerd-1/stream?static=true&api_key=secret-token-abc",
    videoCodec: "hevc",
    audioCodec: "eac3",
    container: "mkv",
    reason: "Direct Play supported natively."
  };

  const mockSnapshot: FinoraPlayerSnapshot = {
    state: "playing",
    currentTimeSeconds: 150.5,
    durationSeconds: 1500,
    bufferedPositionSeconds: 400.2,
    volume: 1.0,
    playbackRate: 1.0,
    isMuted: false
  };

  it("renders stats and redacts secrets from URL", () => {
    let root: any;

    act(() => {
      root = renderer.create(
        <StatsForNerdsModal
          visible={true}
          onClose={jest.fn()}
          item={mockItem}
          plan={mockPlan}
          snapshot={mockSnapshot}
        />
      );
    });

    const card = root.root.findByProps({ testID: "stats-card" });
    expect(card).toBeTruthy();

    const modeStat = root.root.findByProps({ testID: "stat-val-playback-mode" });
    expect(modeStat.props.children).toBe("DIRECT-PLAY");

    const urlStat = root.root.findByProps({ testID: "stat-val-stream-url" });
    // Verify token is redacted
    expect(urlStat.props.children).not.toContain("secret-token-abc");
    expect(urlStat.props.children).toContain("api_key=[REDACTED]");

    act(() => {
      root.unmount();
    });
  });

  it("renders null when visible is false", () => {
    let root: any;

    act(() => {
      root = renderer.create(
        <StatsForNerdsModal
          visible={false}
          onClose={jest.fn()}
          item={mockItem}
          plan={mockPlan}
          snapshot={mockSnapshot}
        />
      );
    });

    expect(root.toJSON()).toBeNull();

    act(() => {
      root.unmount();
    });
  });
});
