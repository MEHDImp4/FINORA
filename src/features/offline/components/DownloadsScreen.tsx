import React, { useEffect, useState, useCallback, useMemo } from "react";
import { View, FlatList, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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
  const [offlineItems, setOfflineItems] = useState<OfflineMediaRecord[]>([]);
  const [activeDownloads, setActiveDownloads] = useState<DownloadItem[]>([]);

  const loadData = useCallback(async () => {
    await offlineStorageService.cleanupExpiredWatchedMedia(48);
    const items = await offlineStorageService.getAllOfflineMedia();
    setOfflineItems(items);
  }, []);

  useEffect(() => {
    loadData();
    const unsub = downloadManager.subscribe(setActiveDownloads);
    return unsub;
  }, [loadData]);

  const totalStorageBytes = useMemo(() => {
    return offlineItems.reduce((acc, curr) => acc + (curr.fileSizeBytes || 0), 0);
  }, [offlineItems]);

  const handlePlay = useCallback(
    (record: OfflineMediaRecord) => {
      hapticService.impactMedium();
      if (onPlayItem) {
        onPlayItem(record);
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

  const renderItem = useCallback(
    ({ item }: { item: OfflineMediaRecord }) => {
      const retentionLabel = getRetentionLabel(item);

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
                {formatBytes(item.fileSizeBytes)}
              </FinoraText>
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

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header & Storage Indicator */}
      <View style={styles.header}>
        <FinoraText variant="title" style={styles.headerTitle}>
          Downloads
        </FinoraText>
        <FinoraText variant="caption" style={styles.storageText}>
          Total offline storage: {formatBytes(totalStorageBytes)}
        </FinoraText>
      </View>

      {/* Active Downloads in Progress */}
      {activeDownloads.filter((d) => d.status === "downloading").length > 0 && (
        <View style={styles.activeSection}>
          <FinoraText variant="caption" style={styles.sectionTitle}>
            Downloading Now
          </FinoraText>
          {activeDownloads
            .filter((d) => d.status === "downloading")
            .map((download) => (
              <View key={download.itemId} style={styles.downloadProgressRow}>
                <FinoraText variant="body" style={styles.downloadTitle} numberOfLines={1}>
                  {download.title}
                </FinoraText>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.round(download.progress * 100)}%` }
                    ]}
                  />
                </View>
                <FinoraText variant="caption" style={styles.progressPercent}>
                  {Math.round(download.progress * 100)}%
                </FinoraText>
              </View>
            ))}
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
  }
});
