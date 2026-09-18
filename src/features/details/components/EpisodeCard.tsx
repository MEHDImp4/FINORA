import React, { useState, useEffect, useMemo } from "react";
import { View, StyleSheet, Pressable, DimensionValue } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { MediaItem } from "../../../types/media";
import { getMediaThumbnailUrls } from "../../../core/repositories/imageUrlBuilder";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";

import { hapticService } from "../../../core/feedback/hapticService";
import { useTranslation } from "../../../i18n";

export interface EpisodeCardProps {
  episode: MediaItem;
  serverUrl: string;
  onPlay: (episode: MediaItem) => void;
  onLongPress?: (episode: MediaItem) => void;
  onDownload?: (episode: MediaItem) => void;
  onLongPressDownload?: (episode: MediaItem) => void;
}

const THUMBNAIL_WIDTH = 130;
const THUMBNAIL_HEIGHT = 73;

export const EpisodeCard: React.FC<EpisodeCardProps> = React.memo(
  ({ episode, serverUrl, onPlay, onLongPress, onDownload, onLongPressDownload }) => {
    const { t } = useTranslation();
    const candidateUrls = useMemo(
      () => getMediaThumbnailUrls(serverUrl, episode, 300),
      [serverUrl, episode]
    );

    const [candidateIndex, setCandidateIndex] = useState(0);
    const candidateKey = candidateUrls.join("|");

    useEffect(() => {
      setCandidateIndex(0);
    }, [candidateKey]);

    const currentUrl = candidateUrls[candidateIndex];

    const handleImageError = () => {
      if (candidateIndex < candidateUrls.length - 1) {
        setCandidateIndex((prev) => prev + 1);
      } else {
        setCandidateIndex(candidateUrls.length);
      }
    };

    const isPlayed = Boolean(episode.isPlayed);
    const hasProgress = episode.playedPercentage > 0 && !isPlayed;
    const showProgressBar = isPlayed || hasProgress;
    const progressWidth: DimensionValue = isPlayed ? "100%" : `${episode.playedPercentage}%`;
    const episodePrefix =
      typeof episode.episodeIndex === "number" ? `E${episode.episodeIndex} · ` : "";

    const handleLongPress = () => {
      if (onLongPress) {
        hapticService.impactMedium();
        onLongPress(episode);
      }
    };

    const a11yPrefix = isPlayed ? `${t("details.watchedEpisodeA11y")} - ` : "";

    return (
      <Pressable
        testID={`episode-card-${episode.id}`}
        onPress={() => onPlay(episode)}
        onLongPress={handleLongPress}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={`${a11yPrefix}${t("details.playEpisodeA11y", { name: episode.name })}`}
        style={({ pressed }) => [
          styles.container,
          pressed && styles.pressedContainer
        ]}
      >
        {/* Thumbnail with Progress Bar & Play Overlay */}
        <View style={styles.thumbnailContainer}>
          {currentUrl && candidateIndex < candidateUrls.length ? (
            <Image
              key={currentUrl}
              source={{ uri: currentUrl }}
              style={styles.thumbnail}
              contentFit="cover"
              contentPosition="center"
              transition={200}
              placeholder={episode.blurhash ? { blurhash: episode.blurhash } : undefined}
              cachePolicy="memory-disk"
              onError={handleImageError}
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
              <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
            </View>
          </View>

          {/* Watched Badge in Top-Right Corner */}
          {isPlayed ? (
            <View style={styles.watchedBadge} testID={`episode-watched-badge-${episode.id}`}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            </View>
          ) : null}

          {/* Progress Bar */}
          {showProgressBar ? (
            <View style={styles.progressTrack} testID="episode-progress-track">
              <View
                testID="episode-progress-bar"
                style={[
                  styles.progressBar,
                  { width: progressWidth }
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

          <View style={styles.metaRow}>
            {episode.runtimeMinutes ? (
              <FinoraText variant="caption" color={colors.textSecondary} style={styles.runtimeText}>
                {`${episode.runtimeMinutes}m`}
              </FinoraText>
            ) : null}

            {isPlayed ? (
              <View style={styles.watchedTag} testID={`episode-watched-tag-${episode.id}`}>
                <Ionicons name="checkmark-circle" size={13} color={colors.primary} style={styles.watchedTagIcon} />
                <FinoraText variant="caption" color={colors.textSecondary} style={styles.watchedTagText}>
                  {t("details.watched")}
                </FinoraText>
              </View>
            ) : null}
          </View>

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

        {/* Download Action Button */}
        {onDownload ? (
          <Pressable
            testID={`download-button-${episode.id}`}
            style={styles.downloadButton}
            onPress={(e) => {
              e.stopPropagation();
              hapticService.impactMedium();
              onDownload(episode);
            }}
            onLongPress={(e) => {
              e.stopPropagation();
              if (onLongPressDownload) {
                hapticService.impactHeavy();
                onLongPressDownload(episode);
              }
            }}
            delayLongPress={350}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("details.downloadEpisodeA11y", { name: episode.name })}
          >
            <Ionicons name="arrow-down-circle-outline" size={24} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </Pressable>
    );
  },
  (prev, next) =>
    prev.episode.id === next.episode.id &&
    prev.episode.playedPercentage === next.episode.playedPercentage &&
    prev.episode.isPlayed === next.episode.isPlayed &&
    prev.episode.primaryImageTag === next.episode.primaryImageTag &&
    prev.episode.thumbImageTag === next.episode.thumbImageTag &&
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
  watchedBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(10, 10, 12, 0.85)",
    borderRadius: 10,
    padding: 1,
    justifyContent: "center",
    alignItems: "center"
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
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 4
  },
  runtimeText: {
    fontSize: 12
  },
  watchedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(229, 9, 20, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4
  },
  watchedTagIcon: {
    marginRight: 1
  },
  watchedTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary
  },
  overviewText: {
    fontSize: 12,
    lineHeight: 16
  },
  downloadButton: {
    padding: spacing.xs,
    justifyContent: "center",
    alignItems: "center"
  }
});
