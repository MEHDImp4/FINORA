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
      { type: "Video", codec: "hevc", width: 3840, height: 2160, bitRate: 24_000_000 },
      { type: "Audio", codec: "eac3", channels: 6 }
    ]
  };

  const mockPlan: PlaybackPlan = {
    mode: "direct-play",
    url: "https://demo.jellyfin.org/Videos/item-nerd-1/stream?static=true&api_key=secret-token-abc",
    videoCodec: "hevc",
    audioCodec: "eac3",
    container: "mkv",
    quality: "auto",
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
    expect(urlStat.props.children).not.toContain("secret-token-abc");
    expect(urlStat.props.children).toContain("api_key=[REDACTED]");

    act(() => {
      root.unmount();
    });
  });

  it("separates source video from requested transcode output", () => {
    const transcodePlan: PlaybackPlan = {
      mode: "transcode",
      url: "https://demo.jellyfin.org/Videos/item-nerd-1/master.m3u8?videoCodec=h264",
      videoCodec: "h264",
      audioCodec: "aac",
      container: "m3u8",
      quality: "480p",
      bitrate: 1_500_000,
      maxWidth: 854,
      maxHeight: 480,
      reason: "Compatibility fallback"
    };

    let root: any;
    act(() => {
      root = renderer.create(
        <StatsForNerdsModal
          visible={true}
          onClose={jest.fn()}
          item={mockItem}
          plan={transcodePlan}
          snapshot={mockSnapshot}
        />
      );
    });

    expect(root.root.findByProps({ testID: "stat-val-selected-quality" }).props.children).toBe("480P");
    expect(root.root.findByProps({ testID: "stat-val-source-video" }).props.children).toContain("3840x2160");
    const output = root.root.findByProps({ testID: "stat-val-requested-output" }).props.children;
    expect(output).toContain("854x480");
    expect(output).toContain("1.5 Mbps");

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
