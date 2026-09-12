import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { MediaItem } from "../../../types/media";
import { getBackdropUrl } from "../../../core/repositories/imageUrlBuilder";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";

export interface EpisodeCardProps {
  episode: MediaItem;
  serverUrl: string;
  onPlay: (episode: MediaItem) => void;
}

const THUMBNAIL_WIDTH = 130;
const THUMBNAIL_HEIGHT = 73;

export const EpisodeCard: React.FC<EpisodeCardProps> = React.memo(
  ({ episode, serverUrl, onPlay }) => {
    const thumbUri = episode.primaryImageTag
      ? getBackdropUrl(serverUrl, episode.id, episode.primaryImageTag, 300)
      : episode.backdropImageTag
      ? getBackdropUrl(serverUrl, episode.id, episode.backdropImageTag, 300)
      : null;

    const hasProgress = episode.playedPercentage > 0 && !episode.isPlayed;
    const episodePrefix =
      typeof episode.episodeIndex === "number" ? `E${episode.episodeIndex} · ` : "";

    return (
      <Pressable
        testID={`episode-card-${episode.id}`}
        onPress={() => onPlay(episode)}
        accessibilityRole="button"
        accessibilityLabel={`Play episode ${episode.name}`}
        style={({ pressed }) => [
          styles.container,
          pressed && styles.pressedContainer
        ]}
      >
        {/* Thumbnail with Progress Bar & Play Overlay */}
        <View style={styles.thumbnailContainer}>
          {thumbUri ? (
            <Image
              source={{ uri: thumbUri }}
              style={styles.thumbnail}
              contentFit="cover"
              transition={200}
              placeholder={episode.blurhash}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailFallback]}>
              <FinoraText variant="caption" color={colors.textMuted}>
                FINORA
              </FinoraText>
            </View>
          )}

          {/* Center Play Icon Overlay */}
          <View style={styles.playOverlay}>
            <View style={styles.playCircle}>
              <FinoraText variant="caption" color="#FFFFFF" style={styles.playIcon}>
                ▶
              </FinoraText>
            </View>
          </View>

          {/* Progress Bar */}
          {hasProgress ? (
            <View style={styles.progressTrack} testID="episode-progress-track">
              <View
                testID="episode-progress-bar"
                style={[
                  styles.progressBar,
                  { width: `${episode.playedPercentage}%` }
                ]}
              />
            </View>
          ) : null}
        </View>

        {/* Episode Info */}
        <View style={styles.infoContainer}>
          <FinoraText variant="body" numberOfLines={1} style={styles.titleText}>
            {`${episodePrefix}${episode.name}`}
          </FinoraText>

          {episode.runtimeMinutes ? (
            <FinoraText variant="caption" color={colors.textSecondary} style={styles.runtimeText}>
              {`${episode.runtimeMinutes}m`}
            </FinoraText>
          ) : null}

          {episode.overview ? (
            <FinoraText
              variant="caption"
              color={colors.textSecondary}
              numberOfLines={2}
              style={styles.overviewText}
            >
              {episode.overview}
            </FinoraText>
          ) : null}
        </View>
      </Pressable>
    );
  },
  (prev, next) =>
    prev.episode.id === next.episode.id &&
    prev.episode.playedPercentage === next.episode.playedPercentage &&
    prev.episode.isPlayed === next.episode.isPlayed &&
    prev.serverUrl === next.serverUrl
);

EpisodeCard.displayName = "EpisodeCard";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    alignItems: "center"
  },
  pressedContainer: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }]
  },
  thumbnailContainer: {
    width: THUMBNAIL_WIDTH,
    height: THUMBNAIL_HEIGHT,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: colors.surface,
    position: "relative"
  },
  thumbnail: {
    width: "100%",
    height: "100%"
  },
  thumbnailFallback: {
    justifyContent: "center",
    alignItems: "center"
  },
  playOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.25)"
  },
  playCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(10, 10, 12, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)"
  },
  playIcon: {
    fontSize: 10,
    marginLeft: 2
  },
  progressTrack: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.2)"
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.primary
  },
  infoContainer: {
    flex: 1,
    justifyContent: "center"
  },
  titleText: {
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 2
  },
  runtimeText: {
    fontSize: 12,
    marginBottom: 4
  },
  overviewText: {
    fontSize: 12,
    lineHeight: 16
  }
});
