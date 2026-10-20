import React from "react";
import renderer, { act } from "react-test-renderer";
import { StatsForNerdsModal } from "../components/StatsForNerdsModal";
import { MediaItem } from "../../../types/media";
import { PlaybackPlan } from "../playbackPlanner";
import { FinoraPlayerSnapshot } from "../types";

const item: MediaItem = {
  id: "stats-output-item",
  name: "Stats Output",
  type: "Movie",
  genres: [],
  playbackPositionTicks: 0,
  totalTicks: 10_000_000,
  playedPercentage: 0,
  isPlayed: false,
  isFavorite: false,
  mediaStreams: [
    { type: "Video", codec: "hevc", width: 3840, height: 2160, bitRate: 24_000_000 },
    { type: "Audio", codec: "eac3", channels: 6 }
  ]
};

const snapshot: FinoraPlayerSnapshot = {
  state: "playing",
  currentTimeSeconds: 10,
  durationSeconds: 100,
  bufferedPositionSeconds: 30,
  volume: 1,
  playbackRate: 1,
  isMuted: false
};

describe("StatsForNerds requested output diagnostics", () => {
  it("separates source video from the requested transcode output", () => {
    const plan: PlaybackPlan = {
      mode: "transcode",
      url: "https://demo.jellyfin.org/Videos/stats-output-item/master.m3u8?videoCodec=h264",
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
          item={item}
          plan={plan}
          snapshot={snapshot}
        />
      );
    });

    expect(root.root.findByProps({ testID: "stat-val-selected-quality" }).props.children).toBe("480P");
    expect(root.root.findByProps({ testID: "stat-val-source-video" }).props.children).toContain("3840x2160");

    const output = root.root.findByProps({ testID: "stat-val-requested-output" }).props.children;
    expect(output).toContain("h264");
    expect(output).toContain("854x480");
    expect(output).toContain("1.5 Mbps");

    act(() => {
      root.unmount();
    });
  });
});
