import React, { useEffect, useState, useCallback, useMemo } from "react";
import { View, FlatList, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { offlineStorageService } from "../offlineStorage";
import { downloadManager } from "../downloadManager";
import { OfflineMediaRecord, DownloadItem } from "../types";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";
import { hapticService } from "../../../core/feedback/hapticService";
import { useAuthStore } from "../../../stores/authStore";
import { getPosterUrl } from "../../../core/repositories/imageUrlBuilder";
import { DownloadProgressCard } from "./DownloadProgressCard";
import { DownloadedSeriesView } from "./DownloadedSeriesView";

import {
  formatBytes,
  formatSpeed,
  formatTimeRemaining,
  getRetentionLabel
} from "../offlineFormatting";

export {
  formatBytes,
  formatSpeed,
  formatTimeRemaining,
  getRetentionLabel
};

export interface DownloadedSeriesGroup {
  type: "series";
  seriesId: string;
  seriesName: string;
  seriesPosterPath?: string;
  posterLocalPath?: string;
  episodes: (OfflineMediaRecord & { fileExists?: boolean; actualBytes?: number })[];
  totalBytes: number;
}

export interface DownloadedMovieGroup {
  type: "movie";
  movie: OfflineMediaRecord & { fileExists?: boolean; actualBytes?: number };
}

export type DownloadedCatalogItem = DownloadedSeriesGroup | DownloadedMovieGroup;

interface DownloadsScreenProps {
  onPlayItem?: (record: OfflineMediaRecord) => void;
}

export function DownloadsScreen({ onPlayItem }: DownloadsScreenProps) {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const serverUrl = session?.serverUrl || "";

  const [offlineItems, setOfflineItems] = useState<
    (OfflineMediaRecord & { fileExists?: boolean; actualBytes?: number })[]
  >([]);
  const [totalPhysicalStorage, setTotalPhysicalStorage] = useState<number>(0);
  const [hasOrphans, setHasOrphans] = useState<boolean>(false);
  const [activeDownloads, setActiveDownloads] = useState<DownloadItem[]>([]);
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    await offlineStorageService.cleanupExpiredWatchedMedia(48);
    const verified = await offlineStorageService.getVerifiedOfflineMedia();
    setOfflineItems(verified.items);
    setTotalPhysicalStorage(verified.totalPhysicalBytes);
    setHasOrphans(verified.hasOrphans);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    loadData();
    const unsub = downloadManager.subscribe((downloads) => {
      setActiveDownloads(downloads);
      const hasCompleted = downloads.some((d) => d.status === "completed");
      if (hasCompleted) {
        loadData();
      }
    });
    return unsub;
  }, [loadData]);

  const handlePlay = useCallback(
    (record: OfflineMediaRecord) => {
      hapticService.impactMedium();
      const { fileExists, actualBytes, ...cleanRecord } = record as any;
      if (onPlayItem) {
        onPlayItem(cleanRecord);
      } else {
        router.push(`/player/${record.itemId}`);
      }
    },
    [onPlayItem, router]
  );

  const handleDelete = useCallback(
    async (record: OfflineMediaRecord) => {
      hapticService.impactLight();
      await offlineStorageService.deleteOfflineMedia(record.itemId);
      await loadData();
    },
    [loadData]
  );

  const handleDeleteSeries = useCallback(
    async (seriesIdOrName: string) => {
      hapticService.impactMedium();
      await offlineStorageService.deleteSeriesOfflineMedia(seriesIdOrName);
      setSelectedSeriesKey(null);
      await loadData();
    },
    [loadData]
  );

  const handleCleanOrphans = useCallback(async () => {
    hapticService.notificationSuccess();
    await offlineStorageService.cleanupOrphanMedia();
    await loadData();
  }, [loadData]);

  const handleRetry = useCallback(async (itemId: string) => {
    hapticService.impactMedium();
    await downloadManager.retryDownload(itemId);
  }, []);

  const handleCancelDownload = useCallback(async (itemId: string) => {
    hapticService.impactLight();
    await downloadManager.cancelDownload(itemId);
  }, []);

  // Group offline items: series grouped together, movies separate
  const catalogItems = useMemo<DownloadedCatalogItem[]>(() => {
    const seriesMap = new Map<string, DownloadedSeriesGroup>();
    const movieItems: DownloadedMovieGroup[] = [];

    for (const item of offlineItems) {
      if (item.type === "Episode") {
        const seriesKey =
          item.seriesId ||
          item.seriesName ||
          (item.title.includes(" - ") ? item.title.split(" - ")[0] : item.title);
        const seriesName =
          item.seriesName ||
          (item.title.includes(" - ") ? item.title.split(" - ")[0] : item.title);

        const itemBytes = item.actualBytes ?? item.fileSizeBytes ?? 0;
        const poster = item.seriesPosterPath || item.posterPath;
        const localPoster = item.posterLocalPath;

        const existing = seriesMap.get(seriesKey);
        if (existing) {
          existing.episodes.push(item);
          existing.totalBytes += itemBytes;
          if (!existing.seriesPosterPath && poster) {
            existing.seriesPosterPath = poster;
          }
          if (!existing.posterLocalPath && localPoster) {
            existing.posterLocalPath = localPoster;
          }
        } else {
          seriesMap.set(seriesKey, {
            type: "series",
            seriesId: item.seriesId || seriesKey,
            seriesName,
            seriesPosterPath: poster,
            posterLocalPath: localPoster,
            episodes: [item],
            totalBytes: itemBytes
          });
        }
      } else {
        movieItems.push({
          type: "movie",
          movie: item
        });
      }
    }

    return [...Array.from(seriesMap.values()), ...movieItems];
  }, [offlineItems]);

  // Selected series for detail inspection
  const activeSeries = useMemo(() => {
    if (!selectedSeriesKey) return null;
    const found = catalogItems.find(
      (it) => it.type === "series" && (it.seriesId === selectedSeriesKey || it.seriesName === selectedSeriesKey)
    );
    return found && found.type === "series" ? found : null;
  }, [selectedSeriesKey, catalogItems]);

  const pendingOrFailedDownloads = useMemo(() => {
    return activeDownloads.filter(
      (d) =>
        d.status === "downloading" ||
        d.status === "queued" ||
        d.status === "failed" ||
        d.status === "paused"
    );
  }, [activeDownloads]);

  const activeCount = useMemo(
    () => activeDownloads.filter((d) => d.status === "downloading").length,
    [activeDownloads]
  );
  const queuedCount = useMemo(
    () => activeDownloads.filter((d) => d.status === "queued").length,
    [activeDownloads]
  );

  // If a series is selected, render the dedicated series detail view
  if (activeSeries) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <DownloadedSeriesView
          seriesName={activeSeries.seriesName}
          seriesId={activeSeries.seriesId}
          seriesPosterPath={activeSeries.seriesPosterPath}
          posterLocalPath={activeSeries.posterLocalPath}
          episodes={activeSeries.episodes}
          serverUrl={serverUrl}
          onBack={() => setSelectedSeriesKey(null)}
          onPlayEpisode={handlePlay}
          onDeleteEpisode={handleDelete}
          onDeleteSeries={handleDeleteSeries}
        />
      </SafeAreaView>
    );
  }

  const renderCatalogItem = ({ item }: { item: DownloadedCatalogItem }) => {
    if (item.type === "series") {
      const posterUri = item.posterLocalPath
        ? item.posterLocalPath
        : item.seriesPosterPath && serverUrl
        ? getPosterUrl(serverUrl, item.seriesId, item.seriesPosterPath, 200)
        : undefined;

      return (
        <Pressable
          style={styles.catalogCard}
          onPress={() => {
            hapticService.impactLight();
            setSelectedSeriesKey(item.seriesId || item.seriesName);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Browse series ${item.seriesName}, ${item.episodes.length} episodes`}
          testID={`downloaded-series-card-${item.seriesId}`}
        >
          {/* Poster with Episode Count Badge */}
          <View style={styles.cardPosterContainer}>
            {posterUri ? (
              <Image source={{ uri: posterUri }} style={styles.cardPoster} contentFit="cover" transition={200} />
            ) : (
              <View style={styles.cardPosterFallback}>
                <Ionicons name="tv-outline" size={28} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.episodeCountBadge}>
              <FinoraText variant="caption" weight="700" style={styles.episodeCountText}>
                {`${item.episodes.length} EP`}
              </FinoraText>
            </View>
          </View>

          {/* Series Info */}
          <View style={styles.cardInfo}>
            <FinoraText variant="body" weight="700" style={styles.cardTitle} numberOfLines={1}>
              {item.seriesName}
            </FinoraText>
            <FinoraText variant="caption" style={styles.cardSubtitle} numberOfLines={1}>
              {`Série • ${item.episodes.length} ${item.episodes.length <= 1 ? "épisode" : "épisodes"} téléchargés`}
            </FinoraText>
            <FinoraText variant="caption" style={styles.cardSize}>
              {formatBytes(item.totalBytes)}
            </FinoraText>
          </View>

          {/* Chevron */}
          <View style={styles.cardChevron}>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </View>
        </Pressable>
      );
    }

    // Movie card
    const movie = item.movie;
    const isMissing = movie.fileExists === false;
    const retentionLabel = getRetentionLabel(movie);
    const posterUri = movie.posterLocalPath
      ? movie.posterLocalPath
      : movie.posterPath && serverUrl
      ? getPosterUrl(serverUrl, movie.itemId, movie.posterPath, 200)
      : undefined;

    return (
      <View style={styles.catalogCard} testID={`offline-item-${movie.itemId}`}>
        {/* Poster */}
        <Pressable
          style={styles.cardPosterContainer}
          onPress={() => handlePlay(movie)}
          accessibilityRole="button"
          accessibilityLabel={`Poster ${movie.title}`}
        >
          {posterUri ? (
            <Image source={{ uri: posterUri }} style={styles.cardPoster} contentFit="cover" transition={200} />
          ) : (
            <View style={styles.cardPosterFallback}>
              <Ionicons name="film-outline" size={28} color={colors.textSecondary} />
            </View>
          )}
          <View style={styles.movieBadge}>
            <FinoraText variant="caption" weight="700" style={styles.movieBadgeText}>
              FILM
            </FinoraText>
          </View>
        </Pressable>

        {/* Info */}
        <View style={styles.cardInfo}>
          <FinoraText variant="body" weight="700" style={styles.cardTitle} numberOfLines={1}>
            {movie.title}
          </FinoraText>
          <FinoraText variant="caption" style={styles.cardSubtitle} numberOfLines={1}>
            {`Film${movie.year ? ` • ${movie.year}` : ""}`}
          </FinoraText>
          <View style={styles.metaRow}>
            <FinoraText variant="caption" style={styles.cardSize}>
              {formatBytes(movie.actualBytes ?? movie.fileSizeBytes)}
            </FinoraText>

            {isMissing && (
              <View style={styles.missingBadge}>
                <Ionicons name="alert-circle-outline" size={11} color="#E50914" style={{ marginRight: 2 }} />
                <FinoraText variant="caption" style={styles.missingText}>
                  Manquant
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
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          {!isMissing && (
            <Pressable
              style={styles.playButton}
              onPress={() => handlePlay(movie)}
              accessibilityRole="button"
              accessibilityLabel={`Play offline ${movie.title}`}
            >
              <Ionicons name="play" size={15} color="#FFFFFF" />
              <FinoraText variant="caption" weight="600" style={styles.playText}>
                Play
              </FinoraText>
            </Pressable>
          )}

          <Pressable
            style={styles.deleteButton}
            onPress={() => handleDelete(movie)}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${movie.title}`}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header & Storage Indicator */}
      <View style={styles.header}>
        <FinoraText variant="title" weight="700" style={styles.headerTitle}>
          Téléchargements
        </FinoraText>
        <FinoraText variant="caption" style={styles.storageText}>
          Stockage hors-ligne utilisé : {formatBytes(totalPhysicalStorage)}
        </FinoraText>
      </View>

      {/* Orphan Cleanup Banner */}
      {hasOrphans && (
        <View style={styles.orphanBanner}>
          <Ionicons name="information-circle-outline" size={20} color="#F5A623" style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <FinoraText variant="caption" weight="600" style={styles.orphanTitle}>
              Données résiduelles détectées
            </FinoraText>
            <FinoraText variant="caption" style={styles.orphanSubtitle}>
              Des fichiers de sessions antérieures ne sont plus sur l'appareil.
            </FinoraText>
          </View>
          <Pressable
            style={styles.cleanButton}
            onPress={handleCleanOrphans}
            accessibilityRole="button"
            accessibilityLabel="Nettoyer les fichiers manquants"
          >
            <FinoraText variant="caption" weight="600" style={styles.cleanButtonText}>
              Nettoyer
            </FinoraText>
          </Pressable>
        </View>
      )}

      {/* Active, Queued & Failed Downloads Section */}
      {pendingOrFailedDownloads.length > 0 && (
        <View style={styles.activeSection}>
          <FinoraText variant="caption" weight="700" style={styles.sectionTitle}>
            {`EN COURS (${activeCount}/3 actifs${queuedCount > 0 ? ` • ${queuedCount} en attente` : ""})`}
          </FinoraText>
          {pendingOrFailedDownloads.map((download) => (
            <DownloadProgressCard
              key={download.itemId}
              download={download}
              serverUrl={serverUrl}
              onRetry={handleRetry}
              onCancel={handleCancelDownload}
            />
          ))}
        </View>
      )}

      {/* Downloaded Catalog List */}
      <FlatList
        data={catalogItems}
        keyExtractor={(item) => (item.type === "series" ? `series-${item.seriesId}` : `movie-${item.movie.itemId}`)}
        renderItem={renderCatalogItem}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          catalogItems.length > 0 ? (
            <View style={styles.catalogHeader}>
              <FinoraText variant="caption" weight="700" style={styles.catalogHeaderText}>
                CONTENUS DISPONIBLES ({catalogItems.length})
              </FinoraText>
            </View>
          ) : null
        }
        ListEmptyComponent={
          pendingOrFailedDownloads.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyBadge}>
                <Ionicons name="sparkles" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                <FinoraText variant="caption" weight="700" style={styles.emptyBadgeText}>
                  STOCKAGE HORS-LIGNE
                </FinoraText>
              </View>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="cloud-download-outline" size={44} color={colors.primary} />
              </View>
              <FinoraText variant="title" weight="700" style={styles.emptyTitle}>
                Aucun téléchargement
              </FinoraText>
              <FinoraText variant="caption" style={styles.emptySubtitle}>
                Téléchargez des films et séries depuis votre catalogue pour en profiter partout en voyage ou en déplacement, même sans connexion.
              </FinoraText>
              <Pressable
                style={styles.exploreButton}
                onPress={() => {
                  hapticService.impactMedium();
                  router.push("/(tabs)");
                }}
                accessibilityRole="button"
                accessibilityLabel="Explorer le catalogue"
              >
                <Ionicons name="film-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <FinoraText variant="body" weight="700" style={styles.exploreButtonText}>
                  Explorer le catalogue
                </FinoraText>
              </Pressable>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0C"
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#1C1C26"
  },
  headerTitle: {
    color: colors.textPrimary,
    marginBottom: 4
  },
  storageText: {
    color: colors.textSecondary
  },
  activeSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    backgroundColor: "#11111A",
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E2C"
  },
  sectionTitle: {
    color: colors.primary,
    letterSpacing: 0.8,
    marginBottom: spacing.sm
  },
  listContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  catalogHeader: {
    marginBottom: spacing.sm
  },
  catalogHeaderText: {
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 0.8
  },
  catalogCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#14141E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#202030",
    padding: spacing.sm,
    marginBottom: spacing.sm
  },
  cardPosterContainer: {
    width: 64,
    height: 96,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#0C0C12",
    marginRight: spacing.md,
    position: "relative"
  },
  cardPoster: {
    width: "100%",
    height: "100%"
  },
  cardPosterFallback: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1A1A26"
  },
  episodeCountBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: "rgba(139, 92, 246, 0.88)",
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: "center"
  },
  episodeCountText: {
    color: "#FFFFFF",
    fontSize: 9,
    letterSpacing: 0.5
  },
  movieBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: "rgba(74, 144, 226, 0.85)",
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: "center"
  },
  movieBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    letterSpacing: 0.5
  },
  cardInfo: {
    flex: 1,
    justifyContent: "center"
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: 4
  },
  cardSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 6
  },
  cardSize: {
    color: colors.textSecondary,
    fontSize: 12
  },
  cardChevron: {
    paddingHorizontal: spacing.xs
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2
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
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4
  },
  playText: {
    color: "#FFFFFF",
    fontSize: 12
  },
  deleteButton: {
    padding: 6
  },
  emptyState: {
    paddingVertical: spacing.xxl + spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(139, 92, 246, 0.12)",
    borderColor: "rgba(139, 92, 246, 0.3)",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: spacing.md
  },
  emptyBadgeText: {
    color: colors.primary,
    fontSize: 10,
    letterSpacing: 0.8
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
  },
  emptyTitle: {
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontSize: 18,
    textAlign: "center"
  },
  emptySubtitle: {
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 300,
    lineHeight: 18,
    marginBottom: spacing.lg
  },
  exploreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3
  },
  exploreButtonText: {
    color: "#FFFFFF",
    fontSize: 14
  },
  orphanBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 166, 35, 0.12)",
    borderColor: "rgba(245, 166, 35, 0.3)",
    borderWidth: 1,
    padding: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: 8
  },
  orphanTitle: {
    color: "#F5A623"
  },
  orphanSubtitle: {
    color: colors.textSecondary,
    fontSize: 11
  },
  cleanButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(245, 166, 35, 0.2)"
  },
  cleanButtonText: {
    color: "#F5A623"
  }
});
