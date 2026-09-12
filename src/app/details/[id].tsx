import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuthStore } from "../../stores/authStore";
import { useItemDetails } from "../../hooks/useMediaQueries";
import { useToggleFavorite, useMarkPlayed } from "../../hooks/useUserDataMutations";
import { MovieDetailsView } from "../../features/details/components/MovieDetailsView";
import { SeriesDetailsView } from "../../features/details/components/SeriesDetailsView";
import { FinoraText } from "../../design-system/components/FinoraText";
import { FinoraButton } from "../../design-system/components/FinoraButton";
import { colors, spacing } from "../../design-system/tokens";
import { MediaItem } from "../../types/media";
import { hapticService } from "../../core/feedback/hapticService";
import { downloadManager } from "../../features/offline/downloadManager";
import { offlineStorageService } from "../../features/offline/offlineStorage";
import { OfflineMediaRecord, DownloadItem } from "../../features/offline/types";
import {
  DownloadQuality,
  buildDownloadUrl
} from "../../features/offline/downloadQuality";

export default function DetailsScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const userId = session?.userId || "";
  const serverUrl = session?.serverUrl || "";
  const token = session?.token || "";

  const { data: item, isLoading, isError } = useItemDetails(userId, id);
  const toggleFavorite = useToggleFavorite(userId);
  const markPlayed = useMarkPlayed(userId);

  const [offlineRecord, setOfflineRecord] = React.useState<OfflineMediaRecord | null>(null);
  const [activeDownload, setActiveDownload] = React.useState<DownloadItem | undefined>(undefined);

  React.useEffect(() => {
    if (id) {
      offlineStorageService.getOfflineMedia(id).then(setOfflineRecord).catch(() => {});
    }
    const unsub = downloadManager.subscribe((downloads) => {
      const found = downloads.find((d) => d.itemId === id);
      setActiveDownload(found);
    });
    return unsub;
  }, [id]);

  const handlePlay = (mediaItem: MediaItem) => {
    router.push({
      pathname: "/player/[id]",
      params: { id: mediaItem.id }
    });
  };

  const handleToggleFavorite = (mediaItem: MediaItem) => {
    hapticService.impactMedium();
    toggleFavorite.mutate({
      itemId: mediaItem.id,
      isFavorite: !mediaItem.isFavorite,
      item: mediaItem
    });
  };

  const handleTogglePlayed = (mediaItem: MediaItem) => {
    markPlayed.mutate({
      itemId: mediaItem.id,
      played: !mediaItem.isPlayed
    });
  };

  const handleDownloadMovie = async (
    mediaItem: MediaItem,
    quality: DownloadQuality = "720p"
  ) => {
    hapticService.impactMedium();
    const downloadUrl = buildDownloadUrl(serverUrl, mediaItem.id, token, quality);
    const localPath = `finora_downloads/movie_${mediaItem.id}.mp4`;

    await downloadManager.startDownload(
      {
        itemId: mediaItem.id,
        title: `${mediaItem.name} (${quality.toUpperCase()})`,
        type: "Movie",
        year: mediaItem.year,
        downloadUrl,
        localPath
      },
      {
        totalTicks: mediaItem.totalTicks || 72000000000,
        playbackPositionTicks: mediaItem.playbackPositionTicks || 0,
        overview: mediaItem.overview,
        posterPath: mediaItem.primaryImageTag
      }
    );

    hapticService.notificationSuccess();
  };

  const handleDownloadSeriesEpisodes = async (
    episodes: MediaItem[],
    quality: DownloadQuality = "720p"
  ) => {
    hapticService.impactMedium();
    for (const ep of episodes) {
      const downloadUrl = buildDownloadUrl(serverUrl, ep.id, token, quality);
      const localPath = `finora_downloads/ep_${ep.id}.mp4`;

      await downloadManager.startDownload(
        {
          itemId: ep.id,
          title: `${item?.name || "Série"} - ${ep.name} (${quality.toUpperCase()})`,
          type: "Episode",
          year: ep.year || item?.year,
          downloadUrl,
          localPath,
          seriesId: item?.id,
          seriesName: item?.name,
          seasonIndex: ep.seasonIndex,
          episodeIndex: ep.episodeIndex
        },
        {
          totalTicks: ep.totalTicks || 25000000000,
          playbackPositionTicks: ep.playbackPositionTicks || 0,
          overview: ep.overview,
          posterPath: ep.primaryImageTag || item?.primaryImageTag,
          seriesId: item?.id,
          seriesName: item?.name,
          seasonIndex: ep.seasonIndex,
          episodeIndex: ep.episodeIndex
        }
      );
    }

    hapticService.notificationSuccess();
  };

  React.useEffect(() => {
    if (item && item.type === "Season" && item.seriesId) {
      router.replace({
        pathname: "/details/[id]",
        params: { id: item.seriesId }
      });
    }
  }, [item, router]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer} testID="details-loading">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !item || item.locationType === "Virtual" || item.isMissing) {
    return (
      <View style={styles.centerContainer} testID="details-error">
        <FinoraText variant="title" style={styles.errorTitle}>
          Item not found
        </FinoraText>
        <FinoraText
          variant="caption"
          style={{ color: colors.textSecondary, marginBottom: spacing.md, textAlign: "center" }}
        >
          This media is not available on the server.
        </FinoraText>
        <FinoraButton
          label="Go Back"
          variant="secondary"
          onPress={() => router.back()}
          style={styles.backButton}
        />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { paddingBottom: insets.bottom }]}
      testID="details-screen"
    >
      {item.type === "Series" ? (
        <SeriesDetailsView
          series={item}
          serverUrl={serverUrl}
          userId={userId}
          onPlayEpisode={handlePlay}
          onBack={() => router.back()}
          onToggleFavorite={handleToggleFavorite}
          onDownloadEpisodes={handleDownloadSeriesEpisodes}
        />
      ) : (
        <MovieDetailsView
          item={item}
          serverUrl={serverUrl}
          onPlay={handlePlay}
          onBack={() => router.back()}
          onToggleFavorite={handleToggleFavorite}
          onTogglePlayed={handleTogglePlayed}
          onDownload={handleDownloadMovie}
          isDownloaded={!!offlineRecord}
          isDownloading={activeDownload?.status === "downloading"}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg
  },
  errorTitle: {
    marginBottom: spacing.md,
    color: "#FFFFFF"
  },
  backButton: {
    minWidth: 140
  }
});
