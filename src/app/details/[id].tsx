import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuthStore } from "../../stores/authStore";
import { useItemDetails } from "../../hooks/useMediaQueries";
import { useToggleFavorite, useMarkPlayed } from "../../hooks/useUserDataMutations";
import { MovieDetailsView } from "../../features/details/components/MovieDetailsView";
import { FinoraText } from "../../design-system/components/FinoraText";
import { FinoraButton } from "../../design-system/components/FinoraButton";
import { colors, spacing } from "../../design-system/tokens";
import { MediaItem } from "../../types/media";

export default function DetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const userId = session?.userId || "";
  const serverUrl = session?.serverUrl || "";

  const { data: item, isLoading, isError } = useItemDetails(id, userId);
  const toggleFavorite = useToggleFavorite(userId);
  const markPlayed = useMarkPlayed(userId);

  const handlePlay = (mediaItem: MediaItem) => {
    // In Phase 6 this routes to FinoraPlayerEngine player screen
    // For now we log and can navigate
    console.debug(`[FINORA] Play item: ${mediaItem.id} (${mediaItem.name})`);
  };

  const handleToggleFavorite = (mediaItem: MediaItem) => {
    toggleFavorite.mutate({
      itemId: mediaItem.id,
      isFavorite: !mediaItem.isFavorite
    });
  };

  const handleTogglePlayed = (mediaItem: MediaItem) => {
    markPlayed.mutate({
      itemId: mediaItem.id,
      played: !mediaItem.isPlayed
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer} testID="details-loading">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !item) {
    return (
      <View style={styles.centerContainer} testID="details-error">
        <FinoraText variant="title" style={styles.errorTitle}>
          Item not found
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
    <View style={styles.container} testID="details-screen">
      <MovieDetailsView
        item={item}
        serverUrl={serverUrl}
        onPlay={handlePlay}
        onBack={() => router.back()}
        onToggleFavorite={handleToggleFavorite}
        onTogglePlayed={handleTogglePlayed}
      />
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
