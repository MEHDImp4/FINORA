import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuthStore } from "../../stores/authStore";
import { useItemDetails } from "../../hooks/useMediaQueries";
import { PlayerScreen } from "../../features/player/components/PlayerScreen";
import { FinoraText } from "../../design-system/components/FinoraText";
import { FinoraButton } from "../../design-system/components/FinoraButton";
import { colors, spacing } from "../../design-system/tokens";
import { offlineStorageService } from "../../features/offline/offlineStorage";
import { OfflineMediaRecord } from "../../features/offline/types";
import { MediaItem } from "../../types/media";

export default function PlayerRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const userId = session?.userId || "";
  const serverUrl = session?.serverUrl || "";
  const token = session?.token || "";

  const [offlineRecord, setOfflineRecord] = useState<OfflineMediaRecord | null>(null);
  const [checkingOffline, setCheckingOffline] = useState(true);

  useEffect(() => {
    let active = true;
    if (id) {
      offlineStorageService
        .getOfflineMedia(id)
        .then((record) => {
          if (active) {
            setOfflineRecord(record);
            setCheckingOffline(false);
          }
        })
        .catch(() => {
          if (active) setCheckingOffline(false);
        });
    } else {
      setCheckingOffline(false);
    }
    return () => {
      active = false;
    };
  }, [id]);

  const { data: item, isLoading, isError } = useItemDetails(userId, id);

  if (isLoading || checkingOffline) {
    return (
      <View style={styles.centerContainer} testID="player-route-loading">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const effectiveItem: MediaItem | null =
    item ||
    (offlineRecord
      ? {
          id: offlineRecord.itemId,
          name: offlineRecord.title,
          type: offlineRecord.type,
          year: offlineRecord.year,
          overview: offlineRecord.overview,
          genres: [],
          totalTicks: offlineRecord.totalTicks || 0,
          playbackPositionTicks: offlineRecord.playbackPositionTicks || 0,
          playedPercentage:
            offlineRecord.totalTicks > 0
              ? ((offlineRecord.playbackPositionTicks || 0) / offlineRecord.totalTicks) * 100
              : 0,
          isFavorite: false,
          isPlayed: false,
          mediaStreams: []
        }
      : null);

  if (!effectiveItem) {
    return (
      <View style={styles.centerContainer} testID="player-route-error">
        <FinoraText variant="title" style={styles.errorTitle}>
          Video unavailable
        </FinoraText>
        <FinoraButton label="Go Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <PlayerScreen
      item={effectiveItem}
      serverUrl={serverUrl}
      token={token}
      localPath={offlineRecord?.localPath}
      onBack={() => router.back()}
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl
  },
  errorTitle: {
    marginBottom: spacing.md,
    color: colors.textPrimary
  }
});
