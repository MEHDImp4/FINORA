import React, { useState, useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, Pressable, DimensionValue, Animated } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { MediaItem } from "../../../types/media";
import { getMediaThumbnailUrls } from "../../../core/repositories/imageUrlBuilder";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";
import { DownloadStatus } from "../../offline/types";

import { hapticService } from "../../../core/feedback/hapticService";
import { useTranslation } from "../../../i18n";

export interface EpisodeCardProps {
  episode: MediaItem;
  serverUrl: string;
  onPlay: (episode: MediaItem) => void;
  onLongPress?: (episode: MediaItem) => void;
  onDownload?: (episode: MediaItem) => void;
  onLongPressDownload?: (episode: MediaItem) => void;
  downloadStatus?: DownloadStatus;
  downloadProgress?: number;
  isDownloaded?: boolean;
}

const THUMBNAIL_WIDTH = 130;
const THUMBNAIL_HEIGHT = 73;
const DOWNLOAD_INDICATOR_SIZE = 28;

export const EpisodeCard: React.FC<EpisodeCardProps> = React.memo(
  ({
    episode,
    serverUrl,
    onPlay,
    onLongPress,
    onDownload,
    onLongPressDownload,
    downloadStatus,
    downloadProgress = 0,
    isDownloaded = false
  }) => {
    const { t } = useTranslation();

    const isDownloadComplete = isDownloaded || downloadStatus === "completed";
    const isDownloadActive =
      downloadStatus === "downloading" ||
      downloadStatus === "finalizing" ||
      downloadStatus === "queued";
    const isDownloadPaused = downloadStatus === "paused";
    const isDownloadFailed = downloadStatus === "failed";
    const normalizedDownloadProgress = isDownloadComplete
      ? 1
      : downloadStatus === "finalizing"
        ? Math.max(0.96, Math.min(0.99, downloadProgress))
        : Math.max(0, Math.min(0.99, downloadProgress));
    const downloadPercent = Math.round(normalizedDownloadProgress * 100);
    const downloadFillProgress = useRef(
      new Animated.Value(normalizedDownloadProgress)
    ).current;
    const completionScale = useRef(new Animated.Value(1)).current;
    const downloadTapScale = useRef(new Animated.Value(1)).current;
    const wasDownloadCompleteRef = useRef(isDownloadComplete);
    const [isDownloadStarting, setIsDownloadStarting] = useState(false);
    const downloadStartingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      // Keep the liquid fill visually close to the latest native progress tick.
      // A long animation here makes fast downloads look frozen or far behind.
      Animated.timing(downloadFillProgress, {
        toValue: normalizedDownloadProgress,
        duration: 120,
        useNativeDriver: true
      }).start();

      if (isDownloadComplete && !wasDownloadCompleteRef.current) {
        completionScale.setValue(0.82);
        Animated.spring(completionScale, {
          toValue: 1,
          friction: 5,
          tension: 150,
          useNativeDriver: true
        }).start();
      }
      wasDownloadCompleteRef.current = isDownloadComplete;
    }, [
      completionScale,
      downloadFillProgress,
      isDownloadComplete,
      normalizedDownloadProgress
    ]);

    useEffect(() => {
      // The optimistic acknowledgement only bridges the short gap before the
      // DownloadManager publishes its authoritative queued/downloading state.
      if (downloadStatus || isDownloaded) {
        setIsDownloadStarting(false);
        if (downloadStartingTimerRef.current) {
          clearTimeout(downloadStartingTimerRef.current);
          downloadStartingTimerRef.current = null;
        }
      }
    }, [downloadStatus, isDownloaded]);

    useEffect(
      () => () => {
        if (downloadStartingTimerRef.current) {
          clearTimeout(downloadStartingTimerRef.current);
        }
      },
      []
    );

    const downloadFillTranslateY = downloadFillProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [DOWNLOAD_INDICATOR_SIZE, 0],
      extrapolate: "clamp"
    });

    const showDownloadProgress = isDownloadActive || isDownloadPaused || isDownloadFailed || isDownloadStarting;

    const downloadA11yLabel = isDownloadComplete
      ? `${episode.name} · ${t("details.downloaded")}`
      : isDownloadActive || isDownloadStarting
        ? `${t("details.downloading")} ${episode.name} · ${downloadPercent}%`
        : t("details.downloadEpisodeA11y", { name: episode.name });

    const isDownloadButtonLocked = isDownloadComplete || isDownloadActive || isDownloadStarting;
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

        {/* Netflix-style Download State Button */}
        {onDownload ? (
          <Pressable
            testID={`download-button-${episode.id}`}
            style={styles.downloadButton}
            disabled={isDownloadButtonLocked}
            onPress={(e) => {
              e.stopPropagation();
              if (isDownloadButtonLocked) return;

              // Confirm the tap immediately instead of waiting for async network,
              // Wi-Fi and disk-space preflight inside DownloadManager.
              setIsDownloadStarting(true);
              downloadTapScale.setValue(0.8);
              Animated.spring(downloadTapScale, {
                toValue: 1,
                friction: 5,
                tension: 220,
                useNativeDriver: true
              }).start();

              if (downloadStartingTimerRef.current) {
                clearTimeout(downloadStartingTimerRef.current);
              }
              downloadStartingTimerRef.current = setTimeout(() => {
                downloadStartingTimerRef.current = null;
                setIsDownloadStarting(false);
              }, 5000);

              hapticService.impactMedium();
              onDownload(episode);
            }}
            onLongPress={(e) => {
              e.stopPropagation();
              if (!isDownloadButtonLocked && onLongPressDownload) {
                hapticService.impactHeavy();
                onLongPressDownload(episode);
              }
            }}
            delayLongPress={350}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={downloadA11yLabel}
            accessibilityState={{ disabled: isDownloadButtonLocked }}
            accessibilityValue={
              isDownloadActive || isDownloadPaused
                ? { min: 0, max: 100, now: downloadPercent }
                : undefined
            }
          >
            <Animated.View
              testID={`download-feedback-${episode.id}`}
              style={{ transform: [{ scale: downloadTapScale }] }}
            >
              {isDownloadComplete ? (
                <Animated.View
                  testID={`download-complete-${episode.id}`}
                  style={[
                    styles.downloadCompleteCircle,
                    { transform: [{ scale: completionScale }] }
                  ]}
                >
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                </Animated.View>
              ) : showDownloadProgress ? (
                <View
                  testID={isDownloadStarting ? `download-starting-${episode.id}` : `download-progress-${episode.id}`}
                  style={[
                    styles.downloadProgressCircle,
                    isDownloadStarting && styles.downloadStartingCircle
                  ]}
                >
                  <Animated.View
                    testID={`download-progress-fill-${episode.id}`}
                    style={[
                      styles.downloadProgressFill,
                      { transform: [{ translateY: downloadFillTranslateY }] }
                    ]}
                  />
                  <View style={styles.downloadProgressIcon}>
                    <Ionicons
                      name={
                        isDownloadFailed
                          ? "refresh"
                          : isDownloadPaused
                            ? "play"
                            : downloadStatus === "queued" || isDownloadStarting
                              ? "time"
                              : "arrow-down"
                      }
                      size={15}
                      color="#FFFFFF"
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.downloadIdleCircle}>
                  <Ionicons name="arrow-down" size={17} color={colors.textSecondary} />
                </View>
              )}
            </Animated.View>
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
    prev.serverUrl === next.serverUrl &&
    prev.downloadStatus === next.downloadStatus &&
    prev.downloadProgress === next.downloadProgress &&
    prev.isDownloaded === next.isDownloaded
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
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center"
  },
  downloadIdleCircle: {
    width: DOWNLOAD_INDICATOR_SIZE,
    height: DOWNLOAD_INDICATOR_SIZE,
    borderRadius: DOWNLOAD_INDICATOR_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    justifyContent: "center",
    alignItems: "center"
  },
  downloadProgressCircle: {
    width: DOWNLOAD_INDICATOR_SIZE,
    height: DOWNLOAD_INDICATOR_SIZE,
    borderRadius: DOWNLOAD_INDICATOR_SIZE / 2,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.55)",
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    position: "relative"
  },
  downloadProgressFill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.primary
  },
  downloadStartingCircle: {
    borderColor: colors.primary,
    backgroundColor: "rgba(229, 9, 20, 0.12)"
  },
  downloadProgressIcon: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center"
  },
  downloadCompleteCircle: {
    width: DOWNLOAD_INDICATOR_SIZE,
    height: DOWNLOAD_INDICATOR_SIZE,
    borderRadius: DOWNLOAD_INDICATOR_SIZE / 2,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center"
  }
});
