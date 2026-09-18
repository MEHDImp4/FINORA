import React, { useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { OfflineMediaRecord } from "../types";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";
import { getPosterUrl } from "../../../core/repositories/imageUrlBuilder";
import { hapticService } from "../../../core/feedback/hapticService";
import { formatBytes, getRetentionLabel } from "../offlineFormatting";
import { useTranslation } from "../../../i18n";

interface DownloadedSeriesViewProps {
  seriesName: string;
  seriesId?: string;
  seriesPosterPath?: string;
  posterLocalPath?: string;
  episodes: (OfflineMediaRecord & { fileExists?: boolean; actualBytes?: number })[];
  serverUrl?: string;
  onBack: () => void;
  onPlayEpisode: (record: OfflineMediaRecord) => void;
  onDeleteEpisode: (record: OfflineMediaRecord) => void;
  onDeleteSeries: (seriesIdOrName: string) => void;
}

export function DownloadedSeriesView({
  seriesName,
  seriesId,
  seriesPosterPath,
  posterLocalPath,
  episodes,
  serverUrl = "",
  onBack,
  onPlayEpisode,
  onDeleteEpisode,
  onDeleteSeries
}: DownloadedSeriesViewProps) {
  const { t } = useTranslation();

  // Sort episodes by season then episode number
  const sortedEpisodes = useMemo(() => {
    return [...episodes].sort((a, b) => {
      const sA = a.seasonIndex ?? 0;
      const sB = b.seasonIndex ?? 0;
      if (sA !== sB) return sA - sB;
      const eA = a.episodeIndex ?? 0;
      const eB = b.episodeIndex ?? 0;
      return eA - eB;
    });
  }, [episodes]);

  const totalBytes = useMemo(() => {
    return episodes.reduce((acc, ep) => acc + (ep.actualBytes ?? ep.fileSizeBytes ?? 0), 0);
  }, [episodes]);

  // Poster resolution
  const posterTag = seriesPosterPath || episodes.find((e) => e.seriesPosterPath)?.seriesPosterPath || episodes[0]?.posterPath;
  const posterTargetId = seriesId || episodes[0]?.seriesId || episodes[0]?.itemId;
  const posterUri = posterLocalPath
    ? posterLocalPath
    : posterTag && serverUrl
    ? getPosterUrl(serverUrl, posterTargetId, posterTag, 300)
    : undefined;

  // Next episode to play (first unwatched, or first episode)
  const nextToPlay = useMemo(() => {
    return sortedEpisodes.find((ep) => !ep.isPlayed) || sortedEpisodes[0];
  }, [sortedEpisodes]);

  const handleConfirmDeleteSeries = () => {
    hapticService.impactHeavy();
    Alert.alert(
      t("downloads.deleteSeriesTitle"),
      t("downloads.deleteSeriesDesc", { title: seriesName, size: formatBytes(totalBytes) }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            onDeleteSeries(seriesId || seriesName);
            onBack();
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container} testID="downloaded-series-view">
      {/* Top Bar with Back Button */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.backButton}
          onPress={() => {
            hapticService.impactLight();
            onBack();
          }}
          accessibilityRole="button"
          accessibilityLabel={t("downloads.backToDownloads")}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          <FinoraText variant="body" weight="600" style={styles.backText}>
            {t("downloads.backToDownloads")}
          </FinoraText>
        </Pressable>

        <Pressable
          style={styles.deleteSeriesButton}
          onPress={handleConfirmDeleteSeries}
          accessibilityRole="button"
          accessibilityLabel={t("downloads.deleteAllEpisodesOf", { name: seriesName })}
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={20} color="#E50914" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Series Header Card */}
        <View style={styles.seriesHeader}>
          <View style={styles.posterWrapper}>
            {posterUri ? (
              <Image source={{ uri: posterUri }} style={styles.poster} contentFit="cover" transition={200} />
            ) : (
              <View style={styles.posterFallback}>
                <Ionicons name="tv-outline" size={36} color={colors.textSecondary} />
              </View>
            )}
          </View>

          <View style={styles.seriesInfo}>
            <FinoraText variant="title" weight="700" style={styles.seriesTitle} numberOfLines={2}>
              {seriesName}
            </FinoraText>

            <FinoraText variant="caption" style={styles.seriesMeta}>
              {`${episodes.length} ${episodes.length <= 1 ? t("downloads.episodeSingle") : t("downloads.episodeMultiple")} • ${formatBytes(totalBytes)}`}
            </FinoraText>

            {nextToPlay && (
              <Pressable
                style={styles.playAllButton}
                onPress={() => {
                  hapticService.impactMedium();
                  onPlayEpisode(nextToPlay);
                }}
                accessibilityRole="button"
                accessibilityLabel={t("downloads.playTitle", { title: nextToPlay.title })}
              >
                <Ionicons name="play" size={16} color="#FFFFFF" />
                <FinoraText variant="caption" weight="700" style={styles.playAllText}>
                  {nextToPlay.playbackPositionTicks > 0 ? t("common.resume") : t("common.play")}
                </FinoraText>
              </Pressable>
            )}
          </View>
        </View>

        {/* Episodes Section Title */}
        <View style={styles.sectionHeader}>
          <FinoraText variant="caption" weight="700" style={styles.sectionTitle}>
            {t("downloads.downloadedEpisodesCount", { count: sortedEpisodes.length })}
          </FinoraText>
        </View>

        {/* Episode Items List */}
        {sortedEpisodes.map((ep) => {
          const isMissing = ep.fileExists === false;
          const retentionLabel = getRetentionLabel(ep, t);

          // Episode title cleanup: remove series prefix if present
          let epTitle = ep.title;
          if (epTitle.includes(" - ")) {
            epTitle = epTitle.split(" - ").slice(1).join(" - ");
          }
          epTitle = epTitle.replace(/\s*\([^)]*\)$/, ""); // strip quality tag

          const hasProgress =
            ep.playbackPositionTicks > 0 &&
            ep.totalTicks > 0 &&
            !ep.isPlayed;
          const progressPercent = hasProgress
            ? Math.round((ep.playbackPositionTicks / ep.totalTicks) * 100)
            : 0;

          return (
            <View key={ep.itemId} style={styles.episodeCard} testID={`series-episode-item-${ep.itemId}`}>
              <View style={styles.episodeMainRow}>
                {/* Episode Info */}
                <View style={styles.episodeInfo}>
                  <FinoraText variant="body" weight="600" style={styles.episodeTitle} numberOfLines={1}>
                    {typeof ep.seasonIndex === "number" && typeof ep.episodeIndex === "number"
                      ? `S${ep.seasonIndex}:E${ep.episodeIndex} • ${epTitle}`
                      : epTitle}
                  </FinoraText>

                  <View style={styles.episodeMetaRow}>
                    <FinoraText variant="caption" style={styles.episodeSize}>
                      {formatBytes(ep.actualBytes ?? ep.fileSizeBytes)}
                    </FinoraText>

                    {hasProgress && (
                      <FinoraText variant="caption" style={styles.watchProgressText}>
                        {t("downloads.percentWatched", { percent: progressPercent })}
                      </FinoraText>
                    )}

                    {isMissing && (
                      <View style={styles.missingBadge}>
                        <Ionicons name="alert-circle" size={11} color="#E50914" style={{ marginRight: 2 }} />
                        <FinoraText variant="caption" style={styles.missingText}>
                          {t("downloads.missingFile")}
                        </FinoraText>
                      </View>
                    )}

                    {retentionLabel && (
                      <View style={styles.retentionBadge}>
                        <Ionicons name="time-outline" size={11} color="#F5A623" style={{ marginRight: 2 }} />
                        <FinoraText variant="caption" style={styles.retentionText}>
                          {retentionLabel}
                        </FinoraText>
                      </View>
                    )}
                  </View>

                  {/* Watch Progress Bar */}
                  {hasProgress && (
                    <View style={styles.watchProgressBar}>
                      <View style={[styles.watchProgressFill, { width: `${progressPercent}%` }]} />
                    </View>
                  )}
                </View>

                {/* Actions */}
                <View style={styles.episodeActions}>
                  {!isMissing && (
                    <Pressable
                      style={styles.episodePlayButton}
                      onPress={() => {
                        hapticService.impactMedium();
                        onPlayEpisode(ep);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={t("downloads.playOfflineTitle", { title: ep.title })}
                    >
                      <Ionicons name="play" size={14} color="#FFFFFF" />
                    </Pressable>
                  )}

                  <Pressable
                    style={styles.episodeDeleteButton}
                    onPress={() => {
                      hapticService.impactLight();
                      onDeleteEpisode(ep);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t("downloads.deleteEpisodeTitle", { title: ep.title })}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0C"
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#181824"
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  backText: {
    color: colors.textPrimary,
    fontSize: 15
  },
  deleteSeriesButton: {
    padding: 6
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  seriesHeader: {
    flexDirection: "row",
    backgroundColor: "#14141E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222234",
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md
  },
  posterWrapper: {
    width: 80,
    height: 120,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#0C0C12"
  },
  poster: {
    width: "100%",
    height: "100%"
  },
  posterFallback: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1E1E2C"
  },
  seriesInfo: {
    flex: 1,
    justifyContent: "center"
  },
  seriesTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    marginBottom: 4
  },
  seriesMeta: {
    color: colors.textSecondary,
    marginBottom: spacing.sm
  },
  playAllButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6
  },
  playAllText: {
    color: "#FFFFFF",
    fontSize: 12
  },
  sectionHeader: {
    marginBottom: spacing.sm
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: 11,
    letterSpacing: 0.8
  },
  episodeCard: {
    backgroundColor: "#14141E",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#202030",
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  episodeMainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  episodeInfo: {
    flex: 1,
    marginRight: spacing.md
  },
  episodeTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: 4
  },
  episodeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2
  },
  episodeSize: {
    color: colors.textSecondary,
    fontSize: 12
  },
  watchProgressText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "600"
  },
  watchProgressBar: {
    height: 3,
    backgroundColor: "#2B2B3D",
    borderRadius: 1.5,
    overflow: "hidden",
    marginTop: 6,
    maxWidth: 160
  },
  watchProgressFill: {
    height: "100%",
    backgroundColor: colors.primary
  },
  missingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(229, 9, 20, 0.15)",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4
  },
  missingText: {
    color: "#E50914",
    fontSize: 10,
    fontWeight: "600"
  },
  retentionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 166, 35, 0.15)",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4
  },
  retentionText: {
    color: "#F5A623",
    fontSize: 10,
    fontWeight: "600"
  },
  episodeActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  episodePlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  episodeDeleteButton: {
    padding: 6
  }
});
