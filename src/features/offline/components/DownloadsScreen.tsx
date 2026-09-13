import React, { useEffect, useState, useCallback, useMemo } from "react";
import { View, FlatList, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { offlineStorageService } from "../offlineStorage";
import { downloadManager } from "../downloadManager";
import { OfflineMediaRecord, DownloadItem } from "../types";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";
import { hapticService } from "../../../core/feedback/hapticService";

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1000) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${Math.round(mb)} MB`;
}

export function formatSpeed(bytesPerSec?: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return "";
  const mb = bytesPerSec / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(1)} MB/s`;
  }
  const kb = bytesPerSec / 1024;
  return `${Math.round(kb)} KB/s`;
}

export function formatTimeRemaining(seconds?: number): string {
  if (!seconds || seconds <= 0) return "";
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `~${hours}h ${mins}m`;
  }
  if (seconds >= 60) {
    const mins = Math.ceil(seconds / 60);
    return `~${mins} min`;
  }
  return `~${seconds}s`;
}

interface DownloadsScreenProps {
  onPlayItem?: (record: OfflineMediaRecord) => void;
}

export function getRetentionLabel(record: OfflineMediaRecord): string | null {
  if (!record.completedWatchedAt && !record.isPlayed) return null;
  if (!record.completedWatchedAt) return "Vu • Suppression programmée";

  const elapsedMs = Date.now() - record.completedWatchedAt;
  const remainingHours = Math.max(0, 48 - Math.floor(elapsedMs / (3600 * 1000)));

  if (remainingHours >= 24) {
    const days = Math.ceil(remainingHours / 24);
    return `Vu • Expire dans ${days}j`;
  }
  if (remainingHours > 0) {
    return `Vu • Expire dans ${remainingHours}h`;
  }
  return "Vu • Expire bientôt";
}

export function DownloadsScreen({ onPlayItem }: DownloadsScreenProps) {
  const router = useRouter();
  const [offlineItems, setOfflineItems] = useState<
    (OfflineMediaRecord & { fileExists?: boolean; actualBytes?: number })[]
  >([]);
  const [totalPhysicalStorage, setTotalPhysicalStorage] = useState<number>(0);
  const [hasOrphans, setHasOrphans] = useState<boolean>(false);
  const [activeDownloads, setActiveDownloads] = useState<DownloadItem[]>([]);

  const loadData = useCallback(async () => {
    await offlineStorageService.cleanupExpiredWatchedMedia(48);
    const verified = await offlineStorageService.getVerifiedOfflineMedia();
    setOfflineItems(verified.items);
    setTotalPhysicalStorage(verified.totalPhysicalBytes);
    setHasOrphans(verified.hasOrphans);
  }, []);

  // Reload catalog whenever user switches to the Downloads tab
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    loadData();
    const unsub = downloadManager.subscribe((downloads) => {
      setActiveDownloads(downloads);
      // If any download completed, refresh offline storage catalog automatically
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

  const renderItem = useCallback(
    ({ item }: { item: OfflineMediaRecord & { fileExists?: boolean; actualBytes?: number } }) => {
      const retentionLabel = getRetentionLabel(item);
      const isMissing = item.fileExists === false;

      return (
        <View style={styles.recordRow} testID={`offline-item-${item.itemId}`}>
          <View style={styles.recordInfo}>
            <FinoraText variant="body" style={styles.itemTitle} numberOfLines={1}>
              {item.title}
            </FinoraText>
            <View style={styles.metaRow}>
              <FinoraText variant="caption" style={styles.itemMeta}>
                {item.seriesName ? `${item.seriesName} • ` : ""}
                {typeof item.seasonIndex === "number" && typeof item.episodeIndex === "number"
                  ? `S${item.seasonIndex}:E${item.episodeIndex} • `
                  : `${item.type} • `}
                {formatBytes(item.actualBytes !== undefined ? item.actualBytes : item.fileSizeBytes)}
              </FinoraText>
              {isMissing ? (
                <View style={styles.missingBadge}>
                  <Ionicons name="alert-circle-outline" size={12} color="#E50914" style={{ marginRight: 3 }} />
                  <FinoraText variant="caption" style={styles.missingText}>
                    Fichier manquant
                  </FinoraText>
                </View>
              ) : null}
              {retentionLabel ? (
                <View style={styles.retentionBadge}>
                  <Ionicons name="time-outline" size={12} color="#F5A623" style={{ marginRight: 3 }} />
                  <FinoraText variant="caption" style={styles.retentionText}>
                    {retentionLabel}
                  </FinoraText>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.actionButtons}>
            {!isMissing ? (
              <Pressable
                style={styles.playButton}
                onPress={() => handlePlay(item)}
                accessibilityRole="button"
                accessibilityLabel={`Play offline ${item.title}`}
              >
                <Ionicons name="play" size={16} color="#FFFFFF" />
                <FinoraText variant="caption" style={styles.playText}>
                  Play
                </FinoraText>
              </Pressable>
            ) : null}

            <Pressable
              style={styles.deleteButton}
              onPress={() => handleDelete(item)}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.title}`}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      );
    },
    [handlePlay, handleDelete]
  );

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

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header & Real Storage Indicator */}
      <View style={styles.header}>
        <FinoraText variant="title" style={styles.headerTitle}>
          Downloads
        </FinoraText>
        <FinoraText variant="caption" style={styles.storageText}>
          Total offline storage: {formatBytes(totalPhysicalStorage)}
        </FinoraText>
      </View>

      {/* Orphan Cleanup Banner if Phantom Entries Exist */}
      {hasOrphans && (
        <View style={styles.orphanBanner}>
          <Ionicons name="information-circle-outline" size={20} color="#F5A623" style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <FinoraText variant="caption" style={styles.orphanTitle}>
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
            <FinoraText variant="caption" style={styles.cleanButtonText}>
              Nettoyer
            </FinoraText>
          </Pressable>
        </View>
      )}

      {/* Active, Queued & Failed Downloads Section */}
      {pendingOrFailedDownloads.length > 0 && (
        <View style={styles.activeSection}>
          <FinoraText variant="caption" style={styles.sectionTitle}>
            {`Téléchargements (${activeCount}/3 actifs${queuedCount > 0 ? ` • ${queuedCount} en attente` : ""})`}
          </FinoraText>
          {pendingOrFailedDownloads.map((download) => {
            const isFailed = download.status === "failed";
            const isQueued = download.status === "queued";
            const progressPercent = Math.round(download.progress * 100);

            return (
              <View key={download.itemId} style={styles.downloadProgressRow}>
                <View style={styles.downloadRowHeader}>
                  <FinoraText variant="body" style={styles.downloadTitle} numberOfLines={1}>
                    {download.title}
                  </FinoraText>
                  <View style={styles.rowActions}>
                    {isFailed ? (
                      <Pressable
                        style={styles.retryButton}
                        onPress={() => handleRetry(download.itemId)}
                        accessibilityRole="button"
                        accessibilityLabel="Réessayer"
                      >
                        <Ionicons name="refresh" size={14} color="#FFFFFF" />
                        <FinoraText variant="caption" style={styles.retryButtonText}>
                          Réessayer
                        </FinoraText>
                      </Pressable>
                    ) : null}
                    <Pressable
                      style={styles.cancelButton}
                      onPress={() => handleCancelDownload(download.itemId)}
                      accessibilityRole="button"
                      accessibilityLabel="Annuler"
                      hitSlop={6}
                    >
                      <Ionicons name="close-circle-outline" size={18} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                </View>

                {isFailed ? (
                  <View style={styles.errorNotice}>
                    <Ionicons name="alert-circle" size={14} color="#E50914" style={{ marginRight: 4 }} />
                    <FinoraText variant="caption" style={styles.errorText}>
                      {download.error || "Échec du téléchargement"}
                    </FinoraText>
                  </View>
                ) : isQueued ? (
                  <View style={styles.queuedNotice}>
                    <Ionicons name="hourglass-outline" size={13} color="#4A90E2" style={{ marginRight: 4 }} />
                    <FinoraText variant="caption" style={styles.queuedText}>
                      En file d'attente (démarrera automatiquement)
                    </FinoraText>
                  </View>
                ) : (
                  <>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width:
                              download.totalBytes > 0
                                ? `${progressPercent}%`
                                : download.bytesDownloaded > 0
                                ? "100%"
                                : "5%"
                          }
                        ]}
                      />
                    </View>
                    <View style={styles.progressStatusRow}>
                      <FinoraText variant="caption" style={styles.progressMeta}>
                        {download.totalBytes > 0
                          ? `${formatBytes(download.bytesDownloaded)} / ${formatBytes(download.totalBytes)}`
                          : download.bytesDownloaded > 0
                          ? `${formatBytes(download.bytesDownloaded)} reçus`
                          : "Connexion au serveur..."}
                        {download.speedBytesPerSecond ? ` • ${formatSpeed(download.speedBytesPerSecond)}` : ""}
                        {download.estimatedSecondsRemaining ? ` • ${formatTimeRemaining(download.estimatedSecondsRemaining)}` : ""}
                      </FinoraText>
                      <FinoraText variant="caption" style={styles.progressPercent}>
                        {download.totalBytes > 0 ? `${progressPercent}%` : "En cours"}
                      </FinoraText>
                    </View>
                  </>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Downloaded Offline Catalog List */}
      <FlatList
        data={offlineItems}
        keyExtractor={(item) => item.itemId}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="download-outline"
              size={54}
              color={colors.textSecondary}
              style={styles.emptyIcon}
            />
            <FinoraText variant="title" style={styles.emptyTitle}>
              No Downloads Yet
            </FinoraText>
            <FinoraText variant="caption" style={styles.emptySubtitle}>
              Download movies and episodes to watch on the go without internet
            </FinoraText>
          </View>
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
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4
  },
  storageText: {
    color: colors.textSecondary
  },
  activeSection: {
    padding: spacing.md,
    backgroundColor: "#14141E",
    borderBottomWidth: 1,
    borderBottomColor: "#222232"
  },
  sectionTitle: {
    fontWeight: "600",
    color: colors.primary,
    marginBottom: spacing.xs
  },
  downloadProgressRow: {
    marginVertical: spacing.xs
  },
  downloadTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: 4
  },
  progressBar: {
    height: 6,
    backgroundColor: "#2B2B3D",
    borderRadius: 3,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary
  },
  progressPercent: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    alignSelf: "flex-end"
  },
  listContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A26"
  },
  recordInfo: {
    flex: 1,
    marginRight: spacing.md
  },
  itemTitle: {
    color: colors.textPrimary,
    fontWeight: "600",
    marginBottom: 4
  },
  itemMeta: {
    color: colors.textSecondary
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2
  },
  retentionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 166, 35, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  retentionText: {
    color: "#F5A623",
    fontSize: 11,
    fontWeight: "600"
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4
  },
  playText: {
    color: "#FFFFFF",
    fontWeight: "600"
  },
  deleteButton: {
    padding: 6
  },
  emptyState: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyIcon: {
    marginBottom: spacing.md,
    opacity: 0.7
  },
  emptyTitle: {
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  emptySubtitle: {
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 280
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
    color: "#F5A623",
    fontWeight: "700"
  },
  orphanSubtitle: {
    color: colors.textSecondary,
    fontSize: 11
  },
  cleanButton: {
    backgroundColor: "#F5A623",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6
  },
  cleanButtonText: {
    color: "#000000",
    fontWeight: "700",
    fontSize: 12
  },
  downloadRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600"
  },
  cancelButton: {
    padding: 2
  },
  errorNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(229, 9, 20, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 2
  },
  errorText: {
    color: "#E50914",
    fontSize: 11
  },
  progressStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4
  },
  progressMeta: {
    color: colors.textSecondary,
    fontSize: 11
  },
  missingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(229, 9, 20, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  missingText: {
    color: "#E50914",
    fontSize: 11,
    fontWeight: "600"
  },
  queuedNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(74, 144, 226, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    marginTop: 2
  },
  queuedText: {
    color: "#4A90E2",
    fontSize: 11,
    fontWeight: "500"
  }
});
