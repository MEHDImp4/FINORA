import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { DownloadItem } from "../types";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";
import { getPosterUrl } from "../../../core/repositories/imageUrlBuilder";
import { useTranslation } from "../../../i18n";

import {
  formatBytes,
  formatSpeed,
  formatTimeRemaining
} from "../offlineFormatting";

export {
  formatBytes,
  formatSpeed,
  formatTimeRemaining
};

interface DownloadProgressCardProps {
  download: DownloadItem;
  serverUrl?: string;
  onRetry: (itemId: string) => void;
  onCancel: (itemId: string) => void;
  onPause?: (itemId: string) => void;
  onResume?: (itemId: string) => void;
}

export function DownloadProgressCard({
  download,
  serverUrl = "",
  onRetry,
  onCancel,
  onPause,
  onResume
}: DownloadProgressCardProps) {
  const { t } = useTranslation();
  const isFailed = download.status === "failed";
  const isQueued = download.status === "queued";
  const isPaused = download.status === "paused";
  const isFinalizing = download.status === "finalizing";
  const isDownloading = download.status === "downloading" || isFinalizing;
  const progressPercent = Math.round(download.progress * 100);

  // Jellyfin sends no Content-Length for transcoded downloads, so fall back to
  // the duration-based estimate to keep a meaningful percentage and size.
  const hasRealTotal = download.totalBytes > 0;
  const displayTotal = hasRealTotal
    ? download.totalBytes
    : download.expectedBytes ?? 0;
  const hasTotal = displayTotal > 0;
  const isEstimated = !hasRealTotal && (download.expectedBytes ?? 0) > 0;
  const percentLabel = isEstimated ? `~${progressPercent}%` : `${progressPercent}%`;

  // Poster resolution
  const posterTag = download.seriesPosterPath || download.posterPath;
  const posterTargetId = download.seriesId || download.itemId;
  const posterUri = download.posterLocalPath
    ? download.posterLocalPath
    : posterTag && serverUrl
    ? getPosterUrl(serverUrl, posterTargetId, posterTag, 160)
    : undefined;

  const isEpisode = download.type === "Episode";
  const mainTitle = isEpisode
    ? download.seriesName || download.title.split(" - ")[0]
    : download.title.replace(/\s*\([^)]*\)$/, ""); // strip quality suffix for cleaner display

  const subTitle = isEpisode
    ? typeof download.seasonIndex === "number" && typeof download.episodeIndex === "number"
      ? `S${download.seasonIndex}:E${download.episodeIndex}${
          download.title.includes(" - ")
            ? ` • ${download.title.split(" - ")[1].replace(/\s*\([^)]*\)$/, "")}`
            : ""
        }`
      : download.title
    : download.year
    ? `${t("common.movie")} • ${download.year}`
    : t("common.movie");

  return (
    <View style={styles.card} testID={`download-progress-card-${download.itemId}`}>
      {/* Poster Image */}
      <View style={styles.posterContainer}>
        {posterUri ? (
          <Image
            source={{ uri: posterUri }}
            style={styles.poster}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Ionicons
              name={isEpisode ? "tv-outline" : "film-outline"}
              size={22}
              color={colors.textSecondary}
            />
          </View>
        )}
      </View>

      {/* Info & Progress */}
      <View style={styles.infoContainer}>
        <View style={styles.titleRow}>
          <FinoraText variant="body" weight="700" style={styles.mainTitle} numberOfLines={1}>
            {mainTitle}
          </FinoraText>
          <View style={[styles.typeBadge, isEpisode ? styles.seriesBadge : styles.movieBadge]}>
            <FinoraText variant="caption" weight="700" style={styles.typeBadgeText}>
              {isEpisode ? t("common.series").toUpperCase() : t("common.movie").toUpperCase()}
            </FinoraText>
          </View>
        </View>

        <FinoraText variant="caption" style={styles.subTitle} numberOfLines={1}>
          {subTitle}
        </FinoraText>

        {isFailed ? (
          <View style={styles.errorNotice}>
            <Ionicons name="alert-circle" size={13} color="#E50914" style={{ marginRight: 4 }} />
            <FinoraText variant="caption" style={styles.errorText} numberOfLines={1}>
              {download.error || t("downloads.statusFailed")}
            </FinoraText>
          </View>
        ) : isQueued ? (
          <View style={styles.queuedNotice}>
            <Ionicons name="hourglass-outline" size={13} color="#4A90E2" style={{ marginRight: 4 }} />
            <FinoraText variant="caption" style={styles.queuedText}>
              {t("downloads.statusQueued")}
            </FinoraText>
          </View>
        ) : (
          <View style={styles.progressWrapper}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: hasTotal
                      ? `${Math.max(2, progressPercent)}%`
                      : "35%",
                    opacity: hasTotal ? 1 : 0.45
                  }
                ]}
              />
            </View>
            <View style={styles.progressStatusRow}>
              <FinoraText variant="caption" style={styles.progressMeta} numberOfLines={1}>
                {isFinalizing
                  ? t("downloads.statusFinalizing")
                  : hasRealTotal
                  ? `${formatBytes(download.bytesDownloaded)} / ${formatBytes(download.totalBytes)}`
                  : isEstimated
                  ? `${formatBytes(download.bytesDownloaded)} / ~${formatBytes(displayTotal)}`
                  : download.bytesDownloaded > 0
                  ? t("downloads.bytesReceived", { bytes: formatBytes(download.bytesDownloaded) })
                  : t("downloads.statusConnecting")}
                {download.speedBytesPerSecond ? ` • ${formatSpeed(download.speedBytesPerSecond)}` : ""}
                {download.estimatedSecondsRemaining
                  ? ` • ${formatTimeRemaining(download.estimatedSecondsRemaining)}`
                  : ""}
              </FinoraText>
              <FinoraText variant="caption" weight="700" style={styles.progressPercent}>
                {hasTotal ? percentLabel : "..."}
              </FinoraText>
            </View>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {isFailed && (
          <Pressable
            style={styles.retryButton}
            onPress={() => onRetry(download.itemId)}
            accessibilityRole="button"
            accessibilityLabel={t("downloads.retryTitle", { title: mainTitle })}
            hitSlop={6}
          >
            <Ionicons name="refresh" size={14} color="#FFFFFF" />
          </Pressable>
        )}
        {!isFinalizing && isDownloading && onPause && (
          <Pressable
            style={styles.pauseButton}
            onPress={() => onPause(download.itemId)}
            accessibilityRole="button"
            accessibilityLabel={t("downloads.pauseTitle", { title: mainTitle })}
            hitSlop={6}
          >
            <Ionicons name="pause" size={16} color="#FFFFFF" />
          </Pressable>
        )}
        {isPaused && onResume && (
          <Pressable
            style={styles.resumeButton}
            onPress={() => onResume(download.itemId)}
            accessibilityRole="button"
            accessibilityLabel={t("downloads.resumeTitle", { title: mainTitle })}
            hitSlop={6}
          >
            <Ionicons name="play" size={14} color="#FFFFFF" />
          </Pressable>
        )}
        <Pressable
          style={styles.cancelButton}
          onPress={() => onCancel(download.itemId)}
          accessibilityRole="button"
          accessibilityLabel={t("downloads.cancelTitle", { title: mainTitle })}
          hitSlop={6}
        >
          <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161622",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262638",
    padding: spacing.sm,
    marginBottom: spacing.sm
  },
  posterContainer: {
    width: 48,
    height: 72,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#0D0D14",
    marginRight: spacing.sm
  },
  poster: {
    width: "100%",
    height: "100%"
  },
  posterPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#20202E"
  },
  infoContainer: {
    flex: 1,
    marginRight: spacing.sm
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2
  },
  mainTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    flexShrink: 1
  },
  typeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4
  },
  seriesBadge: {
    backgroundColor: "rgba(139, 92, 246, 0.2)"
  },
  movieBadge: {
    backgroundColor: "rgba(74, 144, 226, 0.2)"
  },
  typeBadgeText: {
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 0.5
  },
  subTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 6
  },
  progressWrapper: {
    marginTop: 2
  },
  progressBar: {
    height: 5,
    backgroundColor: "#2B2B3D",
    borderRadius: 2.5,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary
  },
  progressStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 3
  },
  progressMeta: {
    color: colors.textSecondary,
    fontSize: 10,
    flex: 1,
    marginRight: 4
  },
  progressPercent: {
    color: colors.primary,
    fontSize: 11
  },
  errorNotice: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4
  },
  errorText: {
    color: "#E50914",
    fontSize: 11
  },
  queuedNotice: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4
  },
  queuedText: {
    color: "#4A90E2",
    fontSize: 11
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  retryButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  pauseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F5A623",
    alignItems: "center",
    justifyContent: "center"
  },
  resumeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#4A90E2",
    alignItems: "center",
    justifyContent: "center"
  },
  cancelButton: {
    padding: 2
  }
});
