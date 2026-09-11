import React, { useMemo, useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Platform
} from "react-native";
import { VideoView } from "expo-video";
import { MediaItem } from "../../../types/media";
import { useFinoraPlayer } from "../useFinoraPlayer";
import { usePlaybackSession } from "../usePlaybackSession";
import { createPlaybackPlan } from "../playbackPlanner";
import { FinoraIconButton } from "../../../design-system/components/FinoraIconButton";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";

export interface PlayerScreenProps {
  item: MediaItem;
  serverUrl: string;
  token?: string;
  onBack: () => void;
  playbackRepository?: any;
}

export function PlayerScreen({
  item,
  serverUrl,
  token = "",
  onBack,
  playbackRepository: customPlaybackRepo
}: PlayerScreenProps) {
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

  const isBufferingOrLoading = snapshot.state === "loading" || snapshot.state === "buffering";

  return (
    <View style={styles.container} testID="player-screen">
      <StatusBar hidden />

      {/* Native Video Surface */}
      <VideoView
        player={player}
        style={styles.videoSurface}
        allowsFullscreen
        allowsPictureInPicture
        nativeControls={false}
      />

      {/* Buffering Indicator */}
      {isBufferingOrLoading && (
        <View style={styles.loaderOverlay} pointerEvents="none" testID="player-loading">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {/* Minimal Top Header with Back Action */}
      <View style={styles.headerRow} testID="player-header">
        <FinoraIconButton
          accessibilityLabel="Go back"
          onPress={handleBack}
          size={40}
          backgroundColor="rgba(20, 20, 26, 0.6)"
          testID="player-back-button"
        >
          <FinoraText variant="title" style={styles.backIcon}>
            ‹
          </FinoraText>
        </FinoraIconButton>
        <View style={styles.titleContainer}>
          <FinoraText variant="caption" style={styles.seriesName} numberOfLines={1}>
            {item.seriesName ? `${item.seriesName} · S${item.seasonIndex || 1} E${item.episodeIndex || 1}` : ""}
          </FinoraText>
          <FinoraText variant="body" style={styles.title} numberOfLines={1}>
            {item.name}
          </FinoraText>
        </View>
      </View>

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
  headerRow: {
    position: "absolute",
    top: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10
  },
  backIcon: {
    fontSize: 28,
    lineHeight: 32,
    color: colors.textPrimary,
    textAlign: "center"
  },
  titleContainer: {
    marginLeft: spacing.sm,
    flex: 1
  },
  seriesName: {
    color: colors.textMuted,
    fontSize: 12
  },
  title: {
    color: colors.textPrimary,
    fontWeight: "600"
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
