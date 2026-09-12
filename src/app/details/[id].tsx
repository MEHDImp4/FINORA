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

export default function DetailsScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const userId = session?.userId || "";
  const serverUrl = session?.serverUrl || "";

  const { data: item, isLoading, isError } = useItemDetails(userId, id);
  const toggleFavorite = useToggleFavorite(userId);
  const markPlayed = useMarkPlayed(userId);

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
        />
      ) : (
        <MovieDetailsView
          item={item}
          serverUrl={serverUrl}
          onPlay={handlePlay}
          onBack={() => router.back()}
          onToggleFavorite={handleToggleFavorite}
          onTogglePlayed={handleTogglePlayed}
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
