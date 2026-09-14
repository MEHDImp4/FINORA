import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuthStore } from "../../stores/authStore";
import { useItemDetails } from "../../hooks/useMediaQueries";
import {
  useToggleFavorite,
  useMarkPlayed,
  useRemoveFromResume
} from "../../hooks/useUserDataMutations";
import { MovieDetailsView } from "../../features/details/components/MovieDetailsView";
import { SeriesDetailsView } from "../../features/details/components/SeriesDetailsView";
import { CollectionDetailsView } from "../../features/details/components/CollectionDetailsView";
import { FinoraText } from "../../design-system/components/FinoraText";
import { FinoraButton } from "../../design-system/components/FinoraButton";
import { DetailsSkeleton } from "../../design-system/components/DetailsSkeleton";
import { colors, spacing } from "../../design-system/tokens";
import { MediaItem } from "../../types/media";
import { hapticService } from "../../core/feedback/hapticService";
import { downloadManager } from "../../features/offline/downloadManager";
import { offlineStorageService } from "../../features/offline/offlineStorage";
import { OfflineMediaRecord, DownloadItem } from "../../features/offline/types";
import {
  DownloadQuality,
  buildDownloadUrl,
  getDownloadHeaders
} from "../../features/offline/downloadQuality";
import { useNetworkDiagnostic } from "../../core/network/networkStatusService";
import { NetworkFailureStateView } from "../../design-system/components/NetworkFailureStateView";

export default function DetailsScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const userId = session?.userId || "";
  const serverUrl = session?.serverUrl || "";
  const token = session?.token || "";

  const { data: item, isLoading, isError, refetch } = useItemDetails(userId, id);
  const toggleFavoriteMutation = useToggleFavorite(userId);
  const markPlayedMutation = useMarkPlayed(userId);
  const removeFromResumeMutation = useRemoveFromResume(userId);

  const [offlineRecord, setOfflineRecord] = React.useState<OfflineMediaRecord | null>(null);
  const [activeDownload, setActiveDownload] = React.useState<DownloadItem | undefined>(undefined);

  const { failureType, isChecking: isDiagChecking, runDiagnostic } = useNetworkDiagnostic(
    serverUrl,
    Boolean(isError && !item)
  );

  const handleRetryLoad = React.useCallback(async () => {
    await Promise.allSettled([refetch(), runDiagnostic()]);
  }, [refetch, runDiagnostic]);

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

  const handlePlay = (mediaId?: string | MediaItem) => {
    hapticService.impactMedium();
    const targetId = typeof mediaId === "string" ? mediaId : mediaId?.id || id;
    router.push({
      pathname: "/player/[id]",
      params: { id: targetId }
    });
  };

  const handleToggleFavorite = (mediaItem?: MediaItem) => {
    const targetItem = mediaItem || item;
    if (!targetItem) return;
    hapticService.selection();
    toggleFavoriteMutation.mutate({
      itemId: targetItem.id,
      isFavorite: !targetItem.isFavorite,
      item: targetItem
    });
  };

  const handleTogglePlayed = (mediaItem?: MediaItem) => {
    const targetItem = mediaItem || item;
    if (!targetItem) return;
    markPlayedMutation.mutate({
      itemId: targetItem.id,
      played: !targetItem.isPlayed
    });
  };

  const handleDownloadMovie = async (
    mediaItem: MediaItem,
    quality: DownloadQuality = "original"
  ) => {
    hapticService.impactMedium();
    const downloadUrl = buildDownloadUrl(serverUrl, mediaItem.id, token, quality);
    const localPath = `finora_downloads/movie_${mediaItem.id}.mp4`;
    const headers = getDownloadHeaders(token);

    await downloadManager.startDownload(
      {
        itemId: mediaItem.id,
        title: `${mediaItem.name} (${quality.toUpperCase()})`,
        type: "Movie",
        year: mediaItem.year,
        downloadUrl,
        localPath,
        posterPath: mediaItem.primaryImageTag
      },
      {
        totalTicks: mediaItem.totalTicks || 72000000000,
        playbackPositionTicks: mediaItem.playbackPositionTicks || 0,
        overview: mediaItem.overview,
        posterPath: mediaItem.primaryImageTag
      },
      { headers }
    );

    hapticService.notificationSuccess();
  };

  const handleDownloadSeriesEpisodes = async (
    episodes: MediaItem[],
    quality: DownloadQuality = "original"
  ) => {
    hapticService.impactMedium();
    const headers = getDownloadHeaders(token);

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
          seriesPosterPath: item?.primaryImageTag,
          seasonIndex: ep.seasonIndex,
          episodeIndex: ep.episodeIndex,
          posterPath: ep.primaryImageTag || item?.primaryImageTag
        },
        {
          totalTicks: ep.totalTicks || 25000000000,
          playbackPositionTicks: ep.playbackPositionTicks || 0,
          overview: ep.overview,
          posterPath: ep.primaryImageTag || item?.primaryImageTag,
          seriesPosterPath: item?.primaryImageTag,
          seriesId: item?.id,
          seriesName: item?.name,
          seasonIndex: ep.seasonIndex,
          episodeIndex: ep.episodeIndex
        },
        { headers }
      );
    }

    hapticService.notificationSuccess();
  };

  const seriesTargetId =
    (item?.type === "Season" || item?.type === "Episode") && (item?.seriesId || item?.parentId)
      ? item.seriesId || item.parentId
      : undefined;

  React.useEffect(() => {
    if (seriesTargetId) {
      router.replace({
        pathname: "/details/[id]",
        params: { id: seriesTargetId }
      });
    }
  }, [seriesTargetId, router]);

  if (isLoading || seriesTargetId) {
    return (
      <View style={styles.loadingContainer} testID="details-loading">
        <DetailsSkeleton />
      </View>
    );
  }

  if ((isError && !item) || (failureType !== null && !item)) {
    if (offlineRecord) {
      return (
        <View style={styles.centerContainer} testID="details-offline-available">
          <FinoraText variant="title" weight="700" style={styles.errorTitle}>
            {offlineRecord.title}
          </FinoraText>
          <FinoraText
            variant="caption"
            style={{ color: colors.textSecondary, marginBottom: spacing.lg, textAlign: "center", maxWidth: 300 }}
          >
            Le serveur est actuellement inaccessible, mais une copie locale est téléchargée sur votre appareil.
          </FinoraText>
          <FinoraButton
            label="Visionner la copie locale"
            variant="primary"
            onPress={() => handlePlay(offlineRecord.itemId)}
            style={styles.backButton}
          />
          <FinoraButton
            label="Retour"
            variant="secondary"
            onPress={() => router.back()}
            style={{ ...styles.backButton, marginTop: spacing.sm }}
          />
        </View>
      );
    }

    return (
      <View style={styles.centerContainer} testID="details-error">
        <NetworkFailureStateView
          failureType={failureType}
          onRetry={handleRetryLoad}
          isRetrying={isDiagChecking || isLoading}
          customTitle={
            failureType === "no_internet"
              ? "Média inaccessible hors-ligne"
              : failureType === "server_unreachable"
              ? "Serveur Jellyfin injoignable"
              : "Impossible de charger la fiche"
          }
          customMessage={
            failureType === "no_internet"
              ? "Cette fiche requiert une connexion réseau active. Retrouvez vos contenus déjà téléchargés."
              : failureType === "server_unreachable"
              ? "Le serveur Jellyfin est éteint ou inaccessible. Visionnez vos films et séries téléchargés."
              : "Une erreur réseau est survenue lors de la récupération des détails."
          }
        />
        <FinoraButton
          label="Retour"
          variant="secondary"
          onPress={() => router.back()}
          style={styles.backButton}
        />
      </View>
    );
  }

  if (!item || item.locationType === "Virtual" || item.isMissing) {
    return (
      <View style={styles.centerContainer} testID="details-error">
        <FinoraText variant="title" style={styles.errorTitle}>
          Média introuvable
        </FinoraText>
        <FinoraText
          variant="caption"
          style={{ color: colors.textSecondary, marginBottom: spacing.md, textAlign: "center" }}
        >
          Ce média n'est plus disponible sur le serveur.
        </FinoraText>
        <FinoraButton
          label="Retour"
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
          onSelectSimilar={(similarItem) => {
            hapticService.selection();
            router.push({ pathname: "/details/[id]", params: { id: similarItem.id } });
          }}
          onToggleFavorite={handleToggleFavorite}
          onTogglePlayed={(mediaItem, played) => {
            markPlayedMutation.mutate({ itemId: mediaItem.id, played });
          }}
          onRemoveFromResume={(mediaItem) => {
            removeFromResumeMutation.mutate({ itemId: mediaItem.id });
          }}
          onDownloadEpisodes={handleDownloadSeriesEpisodes}
        />
      ) : item.type === "BoxSet" ? (
        <CollectionDetailsView
          collection={item}
          serverUrl={serverUrl}
          userId={userId}
          onBack={() => router.back()}
          onPlayItem={(targetItem) => handlePlay(targetItem.id)}
          onSelectItem={(targetItem) => {
            hapticService.selection();
            router.push({ pathname: "/details/[id]", params: { id: targetItem.id } });
          }}
          onToggleFavorite={handleToggleFavorite}
        />
      ) : (
        <MovieDetailsView
          item={item}
          serverUrl={serverUrl}
          userId={userId}
          onPlay={handlePlay}
          onBack={() => router.back()}
          onSelectSimilar={(similarItem) => {
            hapticService.selection();
            router.push({ pathname: "/details/[id]", params: { id: similarItem.id } });
          }}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background
  },
  errorTitle: {
    marginBottom: spacing.md,
    color: "#FFFFFF"
  },
  backButton: {
    minWidth: 140
  }
});
