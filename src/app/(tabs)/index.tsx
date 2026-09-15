import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, Animated } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { FinoraScreen } from "../../design-system/components/FinoraScreen";
import { HeroBanner } from "../../features/home/components/HeroBanner";
import { MediaCarousel } from "../../features/home/components/MediaCarousel";
import { FinoraText } from "../../design-system/components/FinoraText";
import { useAuthStore } from "../../stores/authStore";
import {
  useResumeItems,
  useRecentlyAdded,
  useLibraries,
  useWatchlistItems,
  mediaKeys
} from "../../hooks/useMediaQueries";
import {
  useToggleFavorite,
  useMarkPlayed,
  useRemoveFromResume
} from "../../hooks/useUserDataMutations";
import { colors, spacing } from "../../design-system/tokens";
import { MediaItem, MediaLibrary } from "../../types/media";
import { mediaRepository } from "../../core/repositories/mediaRepository";
import { jellyfinClient } from "../../core/jellyfin/jellyfinClient";
import { hapticService } from "../../core/feedback/hapticService";
import { useNetworkDiagnostic } from "../../core/network/networkStatusService";
import { NetworkFailureStateView } from "../../design-system/components/NetworkFailureStateView";
import { OfflineBanner } from "../../design-system/components/OfflineBanner";
import { HomeSkeleton } from "../../design-system/components/HomeSkeleton";
import {
  getRecommendedForYou,
  getBecauseYouWatched
} from "../../features/recommendations/recommendationEngine";
import { useNotificationStore } from "../../stores/notificationStore";
import { useNotificationSync } from "../../features/notifications/useNotificationSync";
import { NotificationsModal } from "../../features/notifications/components/NotificationsModal";
import { MediaQuickActionsModal } from "../../features/home/components/MediaQuickActionsModal";

function CategoryPillItem({
  label,
  icon,
  onPress,
  accessibilityLabel
}: {
  label: string;
  icon?: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      style={styles.pillPressable}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => {
        hapticService.selection();
        Animated.spring(scaleAnim, {
          toValue: 0.94,
          useNativeDriver: true,
          friction: 6
        }).start();
      }}
      onPressOut={() => {
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6
        }).start();
      }}
      onPress={onPress}
      hitSlop={4}
    >
      <Animated.View style={[styles.categoryPill, { transform: [{ scale: scaleAnim }] }]}>
        {icon}
        <FinoraText
          variant="caption"
          color="textPrimary"
          weight="600"
          numberOfLines={1}
          style={styles.categoryPillText}
        >
          {label}
        </FinoraText>
      </Animated.View>
    </Pressable>
  );
}

function HomeLibraryRow({
  library,
  userId,
  serverUrl,
  onItemPress,
  onItemLongPress
}: {
  library: MediaLibrary;
  userId?: string;
  serverUrl: string;
  onItemPress: (item: MediaItem) => void;
  onItemLongPress?: (item: MediaItem) => void;
}) {
  const { data: items = [] } = useRecentlyAdded(userId, library.id, 16);

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <MediaCarousel
      title={library.name}
      items={items}
      serverUrl={serverUrl}
      variant="poster"
      onItemPress={onItemPress}
      onItemLongPress={onItemLongPress}
    />
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);
  const userId = session?.userId;
  const serverUrl = session?.serverUrl || jellyfinClient.getServerUrl() || "";

  const {
    data: resumeItems,
    isError: isResumeError,
    isLoading: isResumeLoading
  } = useResumeItems(userId);

  const {
    data: recentItems,
    isError: isRecentError,
    isLoading: isRecentLoading
  } = useRecentlyAdded(userId);

  const {
    data: libraries,
    isError: isLibrariesError,
    isLoading: isLibrariesLoading
  } = useLibraries(userId);

  const {
    data: watchlistItems = [],
    isError: isWatchlistError
  } = useWatchlistItems(userId);

  const isAnyError = Boolean(isResumeError || isRecentError || isLibrariesError || isWatchlistError);

  const hasAnyContent = Boolean(
    (resumeItems && resumeItems.length > 0) ||
    (recentItems && recentItems.length > 0) ||
    (libraries && libraries.length > 0) ||
    (watchlistItems && watchlistItems.length > 0)
  );

  const isInitialLoading = !hasAnyContent && (isResumeLoading || isRecentLoading || isLibrariesLoading);

  const { failureType, isChecking: isDiagChecking, runDiagnostic } = useNetworkDiagnostic(
    serverUrl,
    {
      isError: isAnyError,
      autoCheck: !hasAnyContent
    }
  );

  const toggleFavorite = useToggleFavorite(userId || "");
  const markPlayed = useMarkPlayed(userId || "");
  const removeFromResume = useRemoveFromResume(userId || "");

  const [actionItem, setActionItem] = useState<MediaItem | null>(null);

  const handleItemLongPress = useCallback((item: MediaItem) => {
    setActionItem(item);
  }, []);

  const handleTogglePlayed = useCallback(
    (item: MediaItem, played: boolean) => {
      markPlayed.mutate({ itemId: item.id, played });
    },
    [markPlayed]
  );

  const handleRemoveFromResume = useCallback(
    (item: MediaItem) => {
      removeFromResume.mutate({ itemId: item.id });
    },
    [removeFromResume]
  );

  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const lastFocusRef = React.useRef(0);

  const unreadNotifCount = useNotificationStore((state) => state.unreadCount);
  const [isNotifModalVisible, setIsNotifModalVisible] = useState(false);
  const { runSync: runNotificationSync } = useNotificationSync();

  const onRefresh = useCallback(async () => {
    setIsPullRefreshing(true);
    setHeroIndex((prev) => prev + 1);
    try {
      await mediaRepository.refreshLibrary().catch(() => {});
      await queryClient.refetchQueries({ queryKey: mediaKeys.all, type: "active" });
      await runDiagnostic();
      await runNotificationSync();
    } finally {
      setIsPullRefreshing(false);
    }
  }, [queryClient, runDiagnostic, runNotificationSync]);

  const isFocusedRef = React.useRef(true);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      const now = Date.now();
      if (now - lastFocusRef.current > 15000) {
        lastFocusRef.current = now;
        queryClient.invalidateQueries({ queryKey: mediaKeys.all, refetchType: "active" });
        runNotificationSync();
      }
      if (!hasAnyContent) {
        runDiagnostic();
      }
      return () => {
        isFocusedRef.current = false;
      };
    }, [queryClient, hasAnyContent, runDiagnostic, runNotificationSync])
  );

  const heroPool = useMemo(() => {
    const list: MediaItem[] = [];
    const seen = new Set<string>();

    const addIfValid = (items?: MediaItem[]) => {
      if (!items) return;
      for (const item of items) {
        if (!item || !item.id || seen.has(item.id)) continue;
        if (item.isMissing || item.locationType === "Virtual") continue;
        if (item.backdropImageTag || item.primaryImageTag) {
          seen.add(item.id);
          list.push(item);
        }
      }
    };

    addIfValid(
      recentItems?.filter(
        (i) => Boolean(i.primaryImageTag || i.seriesPrimaryImageTag || i.parentPrimaryImageTag)
      )
    );
    addIfValid(resumeItems);
    addIfValid(recentItems);

    return list;
  }, [recentItems, resumeItems]);

  // Keep the featured item alive long enough to be read before rotating.
  React.useEffect(() => {
    if (isPullRefreshing || heroPool.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      if (isFocusedRef.current) {
        setHeroIndex((prev) => prev + 1);
      }
    }, 9000);

    return () => clearInterval(timer);
  }, [isPullRefreshing, heroPool.length]);

  const featuredItem = useMemo(() => {
    if (heroPool.length === 0) return null;
    return heroPool[heroIndex % heroPool.length];
  }, [heroPool, heroIndex]);

  const recommendedItems = useMemo(() => {
    return getRecommendedForYou(recentItems || [], resumeItems || [], watchlistItems || [], 16);
  }, [recentItems, resumeItems, watchlistItems]);

  const recommendedItemsList = useMemo(() => {
    return recommendedItems.map((r) => r.item);
  }, [recommendedItems]);

  const becauseYouWatched = useMemo(() => {
    return getBecauseYouWatched(resumeItems || [], recentItems || [], 12);
  }, [resumeItems, recentItems]);

  const becauseYouWatchedItems = useMemo(() => {
    return becauseYouWatched ? becauseYouWatched.items.map((r) => r.item) : [];
  }, [becauseYouWatched]);

  const showsLib = useMemo(() => {
    return libraries?.find((l) => {
      const type = (l.collectionType || "").toLowerCase();
      const name = (l.name || "").toLowerCase();
      return type === "tvshows" || name.includes("show") || name.includes("série") || name.includes("serie");
    });
  }, [libraries]);

  const moviesLib = useMemo(() => {
    return libraries?.find((l) => {
      const type = (l.collectionType || "").toLowerCase();
      const name = (l.name || "").toLowerCase();
      return type === "movies" || name.includes("movie") || name.includes("film");
    });
  }, [libraries]);

  const collectionsLib = useMemo(() => {
    return libraries?.find((l) => {
      const type = (l.collectionType || "").toLowerCase();
      const name = (l.name || "").toLowerCase();
      return type === "boxsets" || name.includes("collection") || name.includes("boxset");
    });
  }, [libraries]);

  const handlePlay = (item: MediaItem) => {
    if (item.type === "Series" || item.type === "Season") {
      router.push({ pathname: "/details/[id]", params: { id: item.id } });
      return;
    }
    router.push({ pathname: "/player/[id]", params: { id: item.id } });
  };

  const handleItemPress = (item: MediaItem) => {
    const targetId =
      (item.type === "Episode" || item.type === "Season") && item.seriesId
        ? item.seriesId
        : item.id;
    router.push({ pathname: "/details/[id]", params: { id: targetId } });
  };

  const handleToggleFavorite = (item: MediaItem) => {
    hapticService.impactMedium();
    toggleFavorite.mutate({
      itemId: item.id,
      isFavorite: !item.isFavorite,
      item
    });
  };

  if (!hasAnyContent && failureType !== null) {
    return (
      <FinoraScreen safeTop={true} safeBottom={false}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.failureContainer}
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing || isDiagChecking}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <NetworkFailureStateView
            failureType={failureType}
            onRetry={onRefresh}
            isRetrying={isPullRefreshing || isDiagChecking}
          />
        </ScrollView>
      </FinoraScreen>
    );
  }

  if (!hasAnyContent && (isInitialLoading || isDiagChecking)) {
    return (
      <FinoraScreen safeTop={true} safeBottom={false}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <HomeSkeleton sections={3} />
        </ScrollView>
      </FinoraScreen>
    );
  }

  if (!hasAnyContent && isAnyError) {
    return (
      <FinoraScreen safeTop={true} safeBottom={false}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.failureContainer}
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing || isDiagChecking}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <NetworkFailureStateView
            failureType={failureType || "server_unreachable"}
            onRetry={onRefresh}
            isRetrying={isPullRefreshing || isDiagChecking}
          />
        </ScrollView>
      </FinoraScreen>
    );
  }

  return (
    <FinoraScreen safeTop={false} safeBottom={false}>
      <OfflineBanner
        isOffline={Boolean(hasAnyContent && failureType !== null)}
        message={
          failureType === "no_internet"
            ? "Appareil hors-ligne. Affichage des médias en cache."
            : "Serveur Jellyfin indisponible. Affichage des médias en cache."
        }
        onRetry={onRefresh}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isPullRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={[styles.topHeader, { paddingTop: Math.max(insets.top, 12) }]}>
          <View style={styles.topHeaderRow}>
            <View style={styles.brandRow}>
              <Image
                source={require("../../../assets/finora-icon-f.png")}
                style={styles.brandLogoIcon}
                contentFit="contain"
                transition={200}
                accessibilityLabel="Logo FINORA"
              />
              <FinoraText variant="title" color="textPrimary" weight="800" style={styles.headerTitle}>
                Accueil
              </FinoraText>
            </View>

            <View style={styles.headerIconsRow}>
              <Pressable
                style={styles.headerIconButton}
                hitSlop={4}
                onPress={() => router.push("/(tabs)/downloads")}
                accessibilityRole="button"
                accessibilityLabel="Téléchargements"
              >
                <Ionicons name="download-outline" size={20} color="#FFFFFF" />
              </Pressable>

              <Pressable
                style={styles.headerIconButton}
                hitSlop={4}
                onPress={() => {
                  hapticService.selection();
                  setIsNotifModalVisible(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Notifications${unreadNotifCount > 0 ? `, ${unreadNotifCount} non lues` : ""}`}
              >
                <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
                {unreadNotifCount > 0 && <View style={styles.notificationDot} />}
              </Pressable>
            </View>
          </View>

          <View style={styles.categoriesBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesRow}
            >
              <CategoryPillItem
                label={showsLib?.name || "Séries"}
                onPress={() => router.push({ pathname: "/(tabs)/library", params: { tab: showsLib?.id || "shows" } })}
                accessibilityLabel="Parcourir les séries"
              />

              <CategoryPillItem
                label={moviesLib?.name || "Films"}
                onPress={() => router.push({ pathname: "/(tabs)/library", params: { tab: moviesLib?.id || "movies" } })}
                accessibilityLabel="Parcourir les films"
              />

              <CategoryPillItem
                label={collectionsLib?.name || "Collections"}
                onPress={() => router.push({ pathname: "/(tabs)/library", params: { tab: collectionsLib?.id || "collections" } })}
                accessibilityLabel="Parcourir les collections"
              />

              <CategoryPillItem
                label="Ma liste"
                icon={<Ionicons name="bookmark" size={11} color="#FFFFFF" style={styles.pillIcon} />}
                onPress={() => router.push({ pathname: "/(tabs)/library", params: { tab: "watchlist" } })}
                accessibilityLabel="Parcourir ma liste"
              />
            </ScrollView>
          </View>
        </View>

        <HeroBanner
          item={featuredItem}
          serverUrl={serverUrl}
          onPlay={handlePlay}
          onToggleFavorite={handleToggleFavorite}
          onPressDetails={handleItemPress}
        />

        {resumeItems && resumeItems.length > 0 ? (
          <MediaCarousel
            title="Continuer à regarder"
            items={resumeItems}
            serverUrl={serverUrl}
            variant="poster"
            onItemPress={handleItemPress}
            onItemLongPress={handleItemLongPress}
          />
        ) : null}

        {recommendedItemsList.length > 0 ? (
          <MediaCarousel
            title="Recommandé pour vous"
            items={recommendedItemsList}
            serverUrl={serverUrl}
            variant="poster"
            onItemPress={handleItemPress}
            onItemLongPress={handleItemLongPress}
          />
        ) : null}

        {becauseYouWatched && becauseYouWatchedItems.length > 0 ? (
          <MediaCarousel
            title={`Parce que vous avez regardé ${becauseYouWatched.sourceItem.name}`}
            items={becauseYouWatchedItems}
            serverUrl={serverUrl}
            variant="poster"
            onItemPress={handleItemPress}
            onItemLongPress={handleItemLongPress}
          />
        ) : null}

        {watchlistItems && watchlistItems.length > 0 ? (
          <MediaCarousel
            title="Ma liste"
            items={watchlistItems}
            serverUrl={serverUrl}
            variant="poster"
            onItemPress={handleItemPress}
            onItemLongPress={handleItemLongPress}
          />
        ) : null}

        {recentItems && recentItems.length > 0 ? (
          <MediaCarousel
            title="Ajouts récents"
            items={recentItems}
            serverUrl={serverUrl}
            variant="poster"
            onItemPress={handleItemPress}
            onItemLongPress={handleItemLongPress}
          />
        ) : null}

        {libraries?.map((library) => (
          <HomeLibraryRow
            key={library.id}
            library={library}
            userId={userId}
            serverUrl={serverUrl}
            onItemPress={handleItemPress}
            onItemLongPress={handleItemLongPress}
          />
        ))}
      </ScrollView>

      <NotificationsModal
        visible={isNotifModalVisible}
        onClose={() => setIsNotifModalVisible(false)}
        onSelectMedia={(mediaId) =>
          router.push({ pathname: "/details/[id]", params: { id: mediaId } })
        }
      />

      <MediaQuickActionsModal
        visible={!!actionItem}
        item={actionItem}
        serverUrl={serverUrl}
        onClose={() => setActionItem(null)}
        onPlay={handlePlay}
        onViewDetails={handleItemPress}
        onTogglePlayed={handleTogglePlayed}
        onRemoveFromResume={handleRemoveFromResume}
        onToggleFavorite={handleToggleFavorite}
      />
    </FinoraScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  contentContainer: {
    paddingBottom: 100
  },
  failureContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xxl
  },
  loadingFullContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl
  },
  topHeader: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    backgroundColor: "transparent"
  },
  topHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  brandLogoIcon: {
    width: 32,
    height: 32
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5
  },
  headerIconsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative"
  },
  notificationDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E50914",
    borderWidth: 1.5,
    borderColor: "#101014"
  },
  categoriesBar: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    marginHorizontal: -spacing.md
  },
  categoriesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingRight: spacing.xl
  },
  pillPressable: {
    minWidth: 96,
    maxWidth: 180,
    minHeight: 44,
    justifyContent: "center"
  },
  categoryPill: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.09)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    borderTopColor: "rgba(255, 255, 255, 0.28)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.2
  },
  pillIcon: {
    marginRight: 4
  }
});
