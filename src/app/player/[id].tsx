import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useAuthStore } from "../../stores/authStore";
import { useItemDetails } from "../../hooks/useMediaQueries";
import { PlayerScreen } from "../../features/player/components/PlayerScreen";
import { FinoraText } from "../../design-system/components/FinoraText";
import { FinoraButton } from "../../design-system/components/FinoraButton";
import { colors, spacing } from "../../design-system/tokens";
import { offlineStorageService } from "../../features/offline/offlineStorage";
import { OfflineMediaRecord } from "../../features/offline/types";
import { MediaItem } from "../../types/media";
import { jellyfinClient } from "../../core/jellyfin/jellyfinClient";
import { useQueryClient } from "@tanstack/react-query";
import { mediaKeys } from "../../hooks/useMediaQueries";
import { useTranslation } from "../../i18n";

export default function PlayerRoute() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const rawId = Array.isArray(id) ? id[0] : (id ?? "");
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);
  const authStatus = useAuthStore((state) => state.status);
  const restoreSession = useAuthStore((state) => state.restoreSession);

  const userId = session?.userId || "";
  const serverUrl = session?.serverUrl || jellyfinClient.getServerUrl() || "";
  const token = session?.token || jellyfinClient.getAuthToken() || "";

  const [offlineRecord, setOfflineRecord] = useState<OfflineMediaRecord | null>(null);
  const [checkingOffline, setCheckingOffline] = useState(true);

  useEffect(() => {
    let active = true;
    if (rawId) {
      offlineStorageService
        .getOfflineMedia(rawId)
        .then(async (record) => {
          if (!active) return;
          if (record) {
            const resolvedUri = await offlineStorageService.resolveLocalUri(record);
            if (resolvedUri) {
              record.localPath = resolvedUri;
            }
            setOfflineRecord(record);
          }
          setCheckingOffline(false);
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
  }, [rawId]);

  const isOfflineMode = Boolean(offlineRecord);

  // Only trigger session restoration if we are online and not checking offline storage
  useEffect(() => {
    if (!checkingOffline && !isOfflineMode) {
      if (!session && (authStatus === "idle" || authStatus === "unauthenticated")) {
        restoreSession().catch(() => {});
      }
    }
  }, [checkingOffline, isOfflineMode, session, authStatus, restoreSession]);

  // Only fetch details from server if we are online and finished checking offline storage
  const shouldFetchOnline = !checkingOffline && !isOfflineMode && Boolean(userId && rawId);
  const { data: item, isLoading, isError } = useItemDetails(
    shouldFetchOnline ? userId : undefined,
    shouldFetchOnline ? rawId : undefined
  );

  useEffect(() => {
    // Only invalidate if we are in online mode and the server returned an error/missing item
    if (shouldFetchOnline && (isError || (item && (item.isMissing || item.locationType === "Virtual")))) {
      try {
        queryClient.setQueriesData({ queryKey: mediaKeys.all }, (oldData: any) => {
          if (Array.isArray(oldData)) {
            return oldData.filter((i: any) => i?.id !== rawId && i?.seriesId !== rawId);
          }
          return oldData;
        });
        queryClient.invalidateQueries({ queryKey: mediaKeys.all });
      } catch {
        // Ignored
      }
    }
  }, [shouldFetchOnline, isError, item, rawId, queryClient]);

  const playerScreenOptions = (
    <Stack.Screen
      options={{
        headerShown: false,
        contentStyle: { backgroundColor: "#000000" },
        statusBarHidden: true,
        statusBarStyle: "light",
        statusBarTranslucent: true,
        navigationBarColor: "#000000",
        navigationBarHidden: true,
        gestureEnabled: false,
        animation: "fade"
      }}
    />
  );

  if (checkingOffline) {
    return (
      <View style={styles.centerContainer} testID="player-route-loading">
        {playerScreenOptions}
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // If online streaming, wait for server details and auth restoration
  if (!isOfflineMode && (isLoading || authStatus === "restoring" || authStatus === "authenticating")) {
    return (
      <View style={styles.centerContainer} testID="player-route-loading">
        {playerScreenOptions}
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!token && !offlineRecord) {
    return (
      <View style={styles.centerContainer} testID="player-route-auth-error">
        {playerScreenOptions}
        <FinoraText variant="title" style={styles.errorTitle}>
          {t("player.authRequiredTitle")}
        </FinoraText>
        <FinoraText variant="caption" style={{ color: colors.textSecondary, marginBottom: spacing.md }}>
          {t("player.authRequiredDesc")}
        </FinoraText>
        <FinoraButton label={t("common.back")} variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const effectiveItem: MediaItem | null =
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
          seriesId: offlineRecord.seriesId,
          seriesName: offlineRecord.seriesName,
          seasonIndex: offlineRecord.seasonIndex,
          episodeIndex: offlineRecord.episodeIndex,
          mediaStreams: []
        }
      : item) || null;

  if (
    !effectiveItem ||
    effectiveItem.locationType === "Virtual" ||
    effectiveItem.isMissing ||
    effectiveItem.type === "Season" ||
    effectiveItem.type === "Series" ||
    effectiveItem.type === "Folder"
  ) {
    return (
      <View style={styles.centerContainer} testID="player-route-error">
        {playerScreenOptions}
        <FinoraText variant="title" style={styles.errorTitle}>
          {isOfflineMode ? t("downloads.missingFile") : t("player.mediaNotFoundTitle")}
        </FinoraText>
        <FinoraText
          variant="caption"
          style={{ color: colors.textSecondary, marginBottom: spacing.md, textAlign: "center" }}
        >
          {isOfflineMode
            ? t("downloads.orphanDesc")
            : t("player.mediaNotFoundDesc")}
        </FinoraText>
        <FinoraButton label={t("common.back")} variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <>
      {playerScreenOptions}
      <PlayerScreen
        item={effectiveItem}
        serverUrl={serverUrl}
        token={token}
        localPath={offlineRecord?.localPath}
        onBack={() => router.back()}
        onNextEpisode={(episodeId) => {
          router.replace({ pathname: "/player/[id]", params: { id: episodeId } });
        }}
      />
    </>
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
