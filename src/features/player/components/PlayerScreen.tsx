import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  StatusBar
} from "react-native";
import { VideoView } from "expo-video";
import { MediaItem } from "../../../types/media";
import { useFinoraPlayer } from "../useFinoraPlayer";
import { usePlaybackSession } from "../usePlaybackSession";
import { createPlaybackPlan } from "../playbackPlanner";
import { CinematicOverlay } from "./CinematicOverlay";
import { PlayerGestures } from "./PlayerGestures";
import { TrackSelectionModal } from "./TrackSelectionModal";
import { TrickplayPreview } from "./TrickplayPreview";
import { SkipMarkerButton } from "./SkipMarkerButton";
import { StatsForNerdsModal } from "./StatsForNerdsModal";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";

export interface PlayerScreenProps {
  item: MediaItem;
  serverUrl: string;
  token?: string;
  onBack: () => void;
  playbackRepository?: any;
  overlayAutoHideMs?: number;
}

export function PlayerScreen({
  item,
  serverUrl,
  token = "",
  onBack,
  playbackRepository: customPlaybackRepo,
  overlayAutoHideMs = 4000
}: PlayerScreenProps) {
  // Modal & Overlay states
  const [controlsVisible, setControlsVisible] = useState(true);
  const [tracksModalVisible, setTracksModalVisible] = useState(false);
  const [statsModalVisible, setStatsModalVisible] = useState(false);

  // Selected tracks
  const [selectedAudioIndex, setSelectedAudioIndex] = useState<number | undefined>(undefined);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string>("auto");

  // Scrubbing & Trickplay state
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPositionSeconds, setScrubPositionSeconds] = useState(0);
  const [scrubPositionPercent, setScrubPositionPercent] = useState(0);

  // Generate stream plan (direct-play > direct-stream > transcode)
  const plan = useMemo(() => {
    return createPlaybackPlan({
      item,
      serverUrl,
      token
    });
  }, [item, serverUrl, token]);

  // Initial resume position in seconds
  const initialPositionSeconds = useMemo(() => {
    if (item.playbackPositionTicks > 0 && item.playedPercentage < 90) {
      return item.playbackPositionTicks / 10000000;
    }
    return 0;
  }, [item.playbackPositionTicks, item.playedPercentage]);

  // Player Engine Hook
  const { engine, player, snapshot, controls } = useFinoraPlayer({
    sourceUrl: plan.url,
    initialPositionSeconds,
    autoPlay: true
  });

  // Jellyfin Playback Session Reporting Hook
  usePlaybackSession({
    itemId: item.id,
    mediaSourceId: plan.mediaSourceId,
    playMethod: plan.mode,
    engine,
    snapshot,
    repository: customPlaybackRepo
  });

  const handleBack = () => {
    controls.pause();
    onBack();
  };

  const handleToggleControls = () => {
    setControlsVisible((prev) => !prev);
  };

  const isBufferingOrLoading = snapshot.state === "loading" || snapshot.state === "buffering";

  return (
    <View style={styles.container} testID="player-screen">
      <StatusBar hidden />

      {/* Video Gestures Wrapper */}
      <PlayerGestures
        onDoubleTapLeft={() => controls.seekBy(-10)}
        onDoubleTapRight={() => controls.seekBy(10)}
        onSingleTap={handleToggleControls}
        onLongPressStart={() => controls.setRate(2.0)}
        onLongPressEnd={() => controls.setRate(1.0)}
      >
        {/* Native Video Surface */}
        <VideoView
          player={player}
          style={styles.videoSurface}
          allowsFullscreen
          allowsPictureInPicture
          nativeControls={false}
        />
      </PlayerGestures>

      {/* Buffering Indicator */}
      {isBufferingOrLoading && (
        <View style={styles.loaderOverlay} pointerEvents="none" testID="player-loading">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {/* Trickplay Thumbnail Preview during timeline scrubbing */}
      <TrickplayPreview
        serverUrl={serverUrl}
        itemId={item.id}
        previewSeconds={scrubPositionSeconds}
        scrubPositionPercent={scrubPositionPercent}
        visible={isScrubbing}
      />

      {/* Skip Intro & Skip Credits dynamic markers */}
      <SkipMarkerButton
        chapters={item.chapters}
        currentTimeSeconds={snapshot.currentTimeSeconds}
        durationSeconds={snapshot.durationSeconds}
        onSeek={(seconds) => controls.seekTo(seconds)}
      />

      {/* Cinematic Auto-Fading Overlay Controls */}
      <CinematicOverlay
        visible={controlsVisible}
        onToggleVisible={handleToggleControls}
        title={item.name}
        seriesTitle={item.seriesName ? `${item.seriesName} · S${item.seasonIndex || 1} E${item.episodeIndex || 1}` : undefined}
        isPlaying={snapshot.state === "playing"}
        currentTimeSeconds={snapshot.currentTimeSeconds}
        durationSeconds={snapshot.durationSeconds}
        bufferedSeconds={snapshot.bufferedPositionSeconds}
        onPlayPause={() => {
          if (snapshot.state === "playing") {
            controls.pause();
          } else {
            controls.play();
          }
        }}
        onSeekBy={(delta) => controls.seekBy(delta)}
        onSeekTo={(pos) => controls.seekTo(pos)}
        onBack={handleBack}
        onOpenTracks={() => setTracksModalVisible(true)}
        onOpenStats={() => setStatsModalVisible(true)}
        autoHideMs={overlayAutoHideMs}
      />

      {/* Audio / Subtitle / Quality Track Selection Bottom Sheet */}
      <TrackSelectionModal
        visible={tracksModalVisible}
        onClose={() => setTracksModalVisible(false)}
        streams={item.mediaStreams}
        selectedAudioIndex={selectedAudioIndex}
        selectedSubtitleIndex={selectedSubtitleIndex}
        selectedQuality={selectedQuality}
        onSelectAudio={(idx) => {
          setSelectedAudioIndex(idx);
          setTracksModalVisible(false);
        }}
        onSelectSubtitle={(idx) => {
          setSelectedSubtitleIndex(idx);
          setTracksModalVisible(false);
        }}
        onSelectQuality={(q) => {
          setSelectedQuality(q);
          setTracksModalVisible(false);
        }}
      />

      {/* Stats for Nerds Technical Diagnostic Modal */}
      <StatsForNerdsModal
        visible={statsModalVisible}
        onClose={() => setStatsModalVisible(false)}
        item={item}
        plan={plan}
        snapshot={snapshot}
      />

      {/* Error Banner if error occurs */}
      {snapshot.state === "error" && (
        <View style={styles.errorOverlay} testID="player-error">
          <FinoraText variant="title" style={styles.errorText}>
            Playback Error
          </FinoraText>
          <FinoraText variant="caption" style={styles.errorSubtext}>
            {snapshot.errorMessage || "Unable to play stream."}
          </FinoraText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000"
  },
  videoSurface: {
    ...StyleSheet.absoluteFillObject
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center"
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl
  },
  errorText: {
    color: colors.primary,
    marginBottom: spacing.xs
  },
  errorSubtext: {
    color: colors.textMuted,
    textAlign: "center"
  }
});
