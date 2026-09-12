import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  StatusBar
} from "react-native";
import * as ScreenOrientation from "expo-screen-orientation";
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
  localPath?: string;
  onBack: () => void;
  playbackRepository?: any;
  overlayAutoHideMs?: number;
}

export function PlayerScreen({
  item,
  serverUrl,
  token = "",
  localPath,
  onBack,
  playbackRepository: customPlaybackRepo,
  overlayAutoHideMs = 4000
}: PlayerScreenProps) {
  // Modal & Overlay states
  const [controlsVisible, setControlsVisible] = useState(true);
  const [tracksModalVisible, setTracksModalVisible] = useState(false);
  const [statsModalVisible, setStatsModalVisible] = useState(false);

  // Compute default audio stream index
  const defaultAudioIndex = useMemo(() => {
    const audioStreams = item.mediaStreams?.filter((s) => s.type === "Audio") || [];
    const defaultStream = audioStreams.find((s) => s.isDefault);
    if (defaultStream?.index !== undefined) return defaultStream.index;
    if (audioStreams[0]?.index !== undefined) return audioStreams[0].index;
    return undefined;
  }, [item.mediaStreams]);

  const [selectedAudioIndex, setSelectedAudioIndex] = useState<number | undefined>(defaultAudioIndex);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string>("auto");
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    if (selectedAudioIndex === undefined && defaultAudioIndex !== undefined) {
      setSelectedAudioIndex(defaultAudioIndex);
    }
  }, [defaultAudioIndex]);

  // Auto/Manual screen orientation handling
  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(() => {});

    ScreenOrientation.getOrientationAsync()
      .then((orientation) => {
        const isLand =
          orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
          orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
        setIsLandscape(isLand);
      })
      .catch(() => {});

    const subscription = ScreenOrientation.addOrientationChangeListener((event) => {
      const isLand =
        event.orientationInfo.orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
        event.orientationInfo.orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
      setIsLandscape(isLand);
    });

    return () => {
      subscription.remove();
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  const handleToggleOrientation = async () => {
    try {
      if (isLandscape) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        setIsLandscape(false);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        setIsLandscape(true);
      }
    } catch {
      // Ignored
    }
  };

  // Scrubbing & Trickplay state
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPositionSeconds, setScrubPositionSeconds] = useState(0);
  const [scrubPositionPercent, setScrubPositionPercent] = useState(0);

  // Generate stream plan (direct-play > direct-stream > transcode)
  const plan = useMemo(() => {
    return createPlaybackPlan({
      item,
      serverUrl,
      token,
      localPath,
      audioStreamIndex: selectedAudioIndex,
      subtitleStreamIndex: selectedSubtitleIndex
    });
  }, [item, serverUrl, token, localPath, selectedAudioIndex, selectedSubtitleIndex]);

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
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
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
        onToggleOrientation={handleToggleOrientation}
        isLandscape={isLandscape}
        onScrubbingChange={setIsScrubbing}
        onScrubMove={(seconds, percent) => {
          setScrubPositionSeconds(seconds);
          setScrubPositionPercent(percent);
        }}
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

          // Native player track switch (for offline or local container tracks)
          try {
            const selectedStream = item.mediaStreams?.find((s) => s.index === idx && s.type === "Audio");
            if (selectedStream && player.availableAudioTracks && player.availableAudioTracks.length > 1) {
              const nativeTrack = player.availableAudioTracks.find((t) => {
                if (!selectedStream.language) return false;
                const lang = selectedStream.language.toLowerCase();
                return (
                  t.language.toLowerCase() === lang ||
                  t.label.toLowerCase().includes(lang) ||
                  (selectedStream.displayTitle && t.label.toLowerCase().includes(selectedStream.displayTitle.toLowerCase()))
                );
              });
              if (nativeTrack) {
                player.audioTrack = nativeTrack;
              }
            }
          } catch {
            // Ignored
          }
        }}
        onSelectSubtitle={(idx) => {
          setSelectedSubtitleIndex(idx);
          setTracksModalVisible(false);

          try {
            if (idx === null) {
              player.subtitleTrack = null;
            } else if (player.availableSubtitleTracks && player.availableSubtitleTracks.length > 0) {
              const selectedStream = item.mediaStreams?.find((s) => s.index === idx && s.type === "Subtitle");
              if (selectedStream) {
                const nativeTrack = player.availableSubtitleTracks.find((t) => {
                  if (!selectedStream.language) return false;
                  const lang = selectedStream.language.toLowerCase();
                  return (
                    t.language.toLowerCase() === lang ||
                    t.label.toLowerCase().includes(lang) ||
                    (selectedStream.displayTitle && t.label.toLowerCase().includes(selectedStream.displayTitle.toLowerCase()))
                  );
                });
                if (nativeTrack) {
                  player.subtitleTrack = nativeTrack;
                }
              }
            }
          } catch {
            // Ignored
          }
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
    ...StyleSheet.absoluteFill
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center"
  },
  errorOverlay: {
    ...StyleSheet.absoluteFill,
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
