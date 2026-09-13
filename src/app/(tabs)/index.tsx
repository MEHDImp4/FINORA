import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator, Animated } from "react-native";
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

  // Data queries
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

  const isAnyError = Boolean(isResumeError || isRecentError || isLibrariesError);

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
    // Dynamically cycle hero banner to next eligible media item
    setHeroIndex((prev) => prev + 1);
    try {
      // 1. Ask Jellyfin to check disk changes / scan (throttled to 1/30s)
      await mediaRepository.refreshLibrary().catch(() => {});
      // 2. Refetch active queries and wait for server responses
      await queryClient.refetchQueries({ queryKey: mediaKeys.all, type: "active" });
      // 3. Re-run diagnostic
      await runDiagnostic();
    } finally {
      setIsPullRefreshing(false);
    }
  }, [queryClient, runDiagnostic]);

  const isFocusedRef = React.useRef(true);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      const now = Date.now();
      // Throttle focus refetch to at most once every 15 seconds
      if (now - lastFocusRef.current > 15000) {
        lastFocusRef.current = now;
        queryClient.invalidateQueries({ queryKey: mediaKeys.all, refetchType: "active" });
      }
      if (!hasAnyContent) {
        runDiagnostic();
      }
      return () => {
        isFocusedRef.current = false;
      };
    }, [queryClient, hasAnyContent, runDiagnostic])
  );

  // Build candidate pool for the featured hero banner
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

    // Priority 1: Items with official primary posters (Movies, Series, or Episodes with Series poster)
    addIfValid(
      recentItems?.filter(
        (i) => Boolean(i.primaryImageTag || i.seriesPrimaryImageTag || i.parentPrimaryImageTag)
      )
    );
    // Priority 2: In-progress resume items with official posters
    addIfValid(resumeItems);
    // Priority 3: Other items
    addIfValid(recentItems);

    return list;
  }, [recentItems, resumeItems]);

  // Netflix-style automatic rotation every 5 seconds when screen is focused
  React.useEffect(() => {
    if (isPullRefreshing || heroPool.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      if (isFocusedRef.current) {
        setHeroIndex((prev) => prev + 1);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [isPullRefreshing, heroPool.length]);

  // Dynamically select featured item using circular rotation index
  const featuredItem = useMemo(() => {
    if (heroPool.length === 0) return null;
    return heroPool[heroIndex % heroPool.length];
  }, [heroPool, heroIndex]);

  // Netflix-style Recommendations Engine
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

  // 1. If server is confirmed unreachable or device is offline and no content is cached
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

  // 2. If queries or diagnostic are still checking initially and no content is yet available
  if (!hasAnyContent && (isInitialLoading || isDiagChecking)) {
    return (
      <FinoraScreen safeTop={true} safeBottom={false}>
        <View style={styles.loadingFullContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <FinoraText
            variant="body"
            color="textSecondary"
            style={{ marginTop: spacing.md, textAlign: "center" }}
          >
            Connexion au serveur Jellyfin...
          </FinoraText>
        </View>
      </FinoraScreen>
    );
  }

  // 3. If queries failed with error and catalog is empty
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
      {/* Offline / Server Unreachable Banner if cached content is shown */}
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
        {/* Netflix Top Header: Brand mark + "Home", Downloads & Notifications */}
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
                Home
              </FinoraText>
            </View>

            <View style={styles.headerIconsRow}>
              <Pressable
                style={styles.headerIconButton}
                onPress={() => router.push("/(tabs)/downloads")}
                accessibilityRole="button"
                accessibilityLabel="Téléchargements"
              >
                <Ionicons name="download-outline" size={20} color="#FFFFFF" />
              </Pressable>

              <Pressable
                style={styles.headerIconButton}
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

          {/* Quick 4 Core Category Pills (Static, Non-Scrollable Row) */}
          <View style={styles.categoriesBar}>
            <View style={styles.categoriesRow}>
              <CategoryPillItem
                label={showsLib?.name || "Shows"}
                onPress={() => router.push({ pathname: "/(tabs)/library", params: { tab: showsLib?.id || "shows" } })}
                accessibilityLabel="Browse Shows"
              />

              <CategoryPillItem
                label={moviesLib?.name || "Movies"}
                onPress={() => router.push({ pathname: "/(tabs)/library", params: { tab: moviesLib?.id || "movies" } })}
                accessibilityLabel="Browse Movies"
              />

              <CategoryPillItem
                label={collectionsLib?.name || "Collections"}
                onPress={() => router.push({ pathname: "/(tabs)/library", params: { tab: collectionsLib?.id || "collections" } })}
                accessibilityLabel="Browse Collections"
              />

              <CategoryPillItem
                label="Watchlist"
                icon={<Ionicons name="bookmark" size={11} color="#FFFFFF" style={styles.pillIcon} />}
                onPress={() => router.push({ pathname: "/(tabs)/library", params: { tab: "watchlist" } })}
                accessibilityLabel="Browse Watchlist"
              />
            </View>
          </View>
        </View>

        {/* Dynamic Hero Banner */}
        <HeroBanner
          item={featuredItem}
          serverUrl={serverUrl}
          onPlay={handlePlay}
          onToggleFavorite={handleToggleFavorite}
          onPressDetails={handleItemPress}
        />

        {/* Continue Watching Section (Posters with progress bars) */}
        {resumeItems && resumeItems.length > 0 ? (
          <MediaCarousel
            title="Continue Watching"
            items={resumeItems}
            serverUrl={serverUrl}
            variant="poster"
            onItemPress={handleItemPress}
            onItemLongPress={handleItemLongPress}
          />
        ) : null}

        {/* Netflix Top Picks: Recommandé pour vous */}
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

        {/* Netflix: Parce que vous avez regardé [Titre] */}
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

        {/* Watchlist Section (My List Posters) */}
        {watchlistItems && watchlistItems.length > 0 ? (
          <MediaCarousel
            title="Watchlist"
            items={watchlistItems}
            serverUrl={serverUrl}
            variant="poster"
            onItemPress={handleItemPress}
            onItemLongPress={handleItemLongPress}
          />
        ) : null}

        {/* Recently Added Section (Posters) */}
        {recentItems && recentItems.length > 0 ? (
          <MediaCarousel
            title="Recently Added"
            items={recentItems}
            serverUrl={serverUrl}
            variant="poster"
            onItemPress={handleItemPress}
            onItemLongPress={handleItemLongPress}
          />
        ) : null}

        {/* Dynamic Per-Library Sections (Movies, TV Shows, Anime, Collections...) */}
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
    paddingBottom: 80
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative"
  },
  notificationDot: {
    position: "absolute",
    top: 7,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E50914",
    borderWidth: 1.5,
    borderColor: "#101014"
  },
  categoriesBar: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs
  },
  categoriesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 7
  },
  pillPressable: {
    flex: 1
  },
  categoryPill: {
    paddingHorizontal: 4,
    paddingVertical: 7.5,
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
