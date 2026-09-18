import React, { useState, useCallback, useMemo, useEffect } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useLibraries,
  useInfiniteLibraryItems,
  useWatchlistItems
} from "../../hooks/useMediaQueries";
import { useAuthStore } from "../../stores/authStore";
import { LibraryFilterBar } from "../../features/library/components/LibraryFilterBar";
import { LibraryGridView } from "../../features/library/components/LibraryGridView";
import { SortOptionsModal } from "../../features/library/components/SortOptionsModal";
import {
  AVAILABLE_SORT_OPTIONS,
  SortOption,
  getSortOptionLabel
} from "../../features/library/types";
import { MediaItem } from "../../types/media";
import { FinoraText } from "../../design-system/components/FinoraText";
import { colors, spacing } from "../../design-system/tokens";
import { useNetworkDiagnostic } from "../../core/network/networkStatusService";
import { NetworkFailureStateView } from "../../design-system/components/NetworkFailureStateView";
import { hapticService } from "../../core/feedback/hapticService";
import {
  useToggleFavorite,
  useMarkPlayed,
  useRemoveFromResume
} from "../../hooks/useUserDataMutations";
import { MediaQuickActionsModal } from "../../features/home/components/MediaQuickActionsModal";
import { useTranslation } from "../../i18n";
import { getLocalizedLibraryName } from "../../features/library/libraryLocalization";

const WATCHLIST_ID = "watchlist";

export default function LibraryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ tab?: string }>();
  const session = useAuthStore((s) => s.session);
  const currentUserId = session?.userId;
  const serverUrl = session?.serverUrl || "";

  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(
    params.tab === "watchlist" ? WATCHLIST_ID : params.tab || null
  );

  useEffect(() => {
    if (!params.tab) return;
    if (params.tab === "watchlist") {
      setSelectedLibraryId(WATCHLIST_ID);
    } else {
      setSelectedLibraryId(params.tab);
    }
  }, [params.tab]);

  const [currentSort, setCurrentSort] = useState<SortOption>(
    AVAILABLE_SORT_OPTIONS[0]
  );
  const [sortModalVisible, setSortModalVisible] = useState(false);

  const isWatchlist = selectedLibraryId === WATCHLIST_ID;

  const {
    data: libraries = [],
    isLoading: isLibrariesLoading,
    isError: isLibrariesError,
    refetch: refetchLibraries
  } = useLibraries(currentUserId);

  const activeLibrary = useMemo(() => {
    if (isWatchlist) return undefined;
    if (selectedLibraryId) {
      const normalizedSelected = selectedLibraryId.toLowerCase().replace(/[\s-_]/g, "");
      const match = libraries.find((lib) => {
        if (lib.id === selectedLibraryId) return true;
        const colType = (lib.collectionType || (lib as any).type || "").toLowerCase().replace(/[\s-_]/g, "");
        const nameType = (lib.name || "").toLowerCase().replace(/[\s-_]/g, "");
        return colType === normalizedSelected || nameType === normalizedSelected;
      });
      if (match) return match;
    }
    return libraries.length > 0 ? libraries[0] : undefined;
  }, [selectedLibraryId, libraries, isWatchlist]);

  const activeLibraryId = activeLibrary?.id;

  const isCollectionTab = useMemo(() => {
    if (selectedLibraryId === "collections" || selectedLibraryId === "boxsets") return true;
    if (activeLibrary) {
      const type = (activeLibrary.collectionType || "").toLowerCase();
      const name = (activeLibrary.name || "").toLowerCase();
      return type === "boxsets" || name.includes("collection") || name.includes("boxset");
    }
    return false;
  }, [selectedLibraryId, activeLibrary]);

  const hasCollectionLib = useMemo(() => {
    return libraries.some((l) => {
      const type = (l.collectionType || "").toLowerCase();
      const name = (l.name || "").toLowerCase();
      return type === "boxsets" || name.includes("collection") || name.includes("boxset");
    });
  }, [libraries]);

  const includeItemTypes = useMemo(() => {
    if (isCollectionTab) {
      return ["BoxSet"];
    }
    if (!activeLibrary) return undefined;
    const type = activeLibrary.collectionType?.toLowerCase() || "";
    const name = activeLibrary.name?.toLowerCase() || "";

    if (type === "tvshows" || name.includes("show") || name.includes("série") || name.includes("serie")) {
      return ["Series"];
    }
    if (type === "movies" || name.includes("movie") || name.includes("film")) {
      return ["Movie"];
    }
    return ["Movie", "Series"];
  }, [activeLibrary, isCollectionTab]);

  const {
    data: libraryItemsPages,
    isLoading: isItemsLoading,
    isError: isItemsError,
    refetch: refetchItems,
    fetchNextPage: fetchNextLibraryPage,
    hasNextPage: hasNextLibraryPage,
    isFetchingNextPage: isFetchingNextLibraryPage
  } = useInfiniteLibraryItems(
    currentUserId,
    isWatchlist ? undefined : activeLibraryId,
    {
      sortBy: currentSort.sortBy,
      sortOrder: currentSort.sortOrder,
      includeItemTypes
    }
  );

  const libraryItems = useMemo(
    () => (libraryItemsPages?.pages ?? []).flatMap((page) => page.items),
    [libraryItemsPages]
  );
  const libraryItemTotal = libraryItemsPages?.pages?.[0]?.total ?? libraryItems.length;

  const {
    data: watchlistItems = [],
    isLoading: isWatchlistLoading,
    isError: isWatchlistError,
    refetch: refetchWatchlist
  } = useWatchlistItems(
    currentUserId,
    isWatchlist
      ? {
          sortBy: currentSort.sortBy,
          sortOrder: currentSort.sortOrder
        }
      : undefined
  );

  const items = isWatchlist ? watchlistItems : libraryItems;
  const itemCount = isWatchlist ? watchlistItems.length : libraryItemTotal;
  const isLoading = isWatchlist ? isWatchlistLoading : (isItemsLoading || isLibrariesLoading);

  const handleLoadMoreItems = useCallback(() => {
    if (!isWatchlist && hasNextLibraryPage && !isFetchingNextLibraryPage) {
      fetchNextLibraryPage();
    }
  }, [isWatchlist, hasNextLibraryPage, isFetchingNextLibraryPage, fetchNextLibraryPage]);
  const isAnyError = isWatchlist ? Boolean(isWatchlistError) : Boolean(isLibrariesError || isItemsError);

  const { failureType, isChecking: isDiagChecking, runDiagnostic } = useNetworkDiagnostic(
    serverUrl,
    isAnyError
  );

  const handleRetry = useCallback(async () => {
    await Promise.allSettled([
      refetchLibraries(),
      refetchItems(),
      refetchWatchlist(),
      runDiagnostic()
    ]);
  }, [refetchLibraries, refetchItems, refetchWatchlist, runDiagnostic]);

  const handleLibrarySelect = useCallback((libraryId: string) => {
    hapticService.selection();
    setSelectedLibraryId(libraryId);
  }, []);

  const toggleFavorite = useToggleFavorite(currentUserId || "");
  const markPlayed = useMarkPlayed(currentUserId || "");
  const removeFromResume = useRemoveFromResume(currentUserId || "");

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

  const handleToggleFavorite = useCallback(
    (item: MediaItem) => {
      toggleFavorite.mutate({ itemId: item.id, isFavorite: !item.isFavorite, item });
    },
    [toggleFavorite]
  );

  const handlePlayItem = useCallback(
    (item: MediaItem) => {
      if (item.type === "Series" || item.type === "Season") {
        router.push(`/details/${item.id}`);
        return;
      }
      router.push(`/player/${item.id}`);
    },
    [router]
  );

  const handleItemPress = useCallback(
    (item: MediaItem) => {
      const targetId =
        (item.type === "Episode" || item.type === "Season") && item.seriesId
          ? item.seriesId
          : item.id;
      router.push(`/details/${targetId}`);
    },
    [router]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          <Pressable
            key="watchlist"
            style={[
              styles.libraryTab,
              isWatchlist && styles.libraryTabSelected
            ]}
            onPress={() => handleLibrarySelect(WATCHLIST_ID)}
            accessibilityRole="button"
            accessibilityLabel={t("home.myList")}
            accessibilityState={{ selected: isWatchlist }}
          >
            <Ionicons
              name="bookmark"
              size={13}
              color={isWatchlist ? "#FFFFFF" : colors.textSecondary}
              style={styles.tabIcon}
            />
            <FinoraText
              variant="body"
              style={[
                styles.libraryTabText,
                isWatchlist && styles.libraryTabTextSelected
              ]}
            >
              {t("home.myList")}
            </FinoraText>
          </Pressable>

          {libraries.map((lib) => {
            const isSelected = !isWatchlist && lib.id === activeLibraryId;
            const displayName = getLocalizedLibraryName(lib, t);
            return (
              <Pressable
                key={lib.id}
                style={[
                  styles.libraryTab,
                  isSelected && styles.libraryTabSelected
                ]}
                onPress={() => handleLibrarySelect(lib.id)}
                accessibilityRole="button"
                accessibilityLabel={displayName}
                accessibilityState={{ selected: isSelected }}
              >
                <FinoraText
                  variant="body"
                  style={[
                    styles.libraryTabText,
                    isSelected && styles.libraryTabTextSelected
                  ]}
                >
                  {displayName}
                </FinoraText>
              </Pressable>
            );
          })}

          {!hasCollectionLib ? (
            <Pressable
              key="collections"
              style={[
                styles.libraryTab,
                isCollectionTab && styles.libraryTabSelected
              ]}
              onPress={() => handleLibrarySelect("collections")}
              accessibilityRole="button"
              accessibilityLabel={t("common.collections")}
              accessibilityState={{ selected: isCollectionTab }}
            >
              <Ionicons
                name="albums-outline"
                size={13}
                color={isCollectionTab ? "#FFFFFF" : colors.textSecondary}
                style={styles.tabIcon}
              />
              <FinoraText
                variant="body"
                style={[
                  styles.libraryTabText,
                  isCollectionTab && styles.libraryTabTextSelected
                ]}
              >
                {t("common.collections")}
              </FinoraText>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>

      <LibraryFilterBar
        currentSort={currentSort}
        onOpenSortModal={() => setSortModalVisible(true)}
      />

      {items.length === 0 && (isAnyError || failureType !== null) ? (
        <NetworkFailureStateView
          failureType={failureType}
          onRetry={handleRetry}
          isRetrying={isDiagChecking || isLoading}
          customTitle={
            failureType === "no_internet"
              ? t("library.offlineUnavailableTitle")
              : failureType === "server_unreachable"
              ? t("library.serverUnreachableTitle")
              : t("common.error")
          }
          customMessage={
            failureType === "no_internet"
              ? t("library.offlineUnavailableDesc")
              : failureType === "server_unreachable"
              ? t("library.serverUnreachableDesc")
              : t("search.searchErrorDesc")
          }
        />
      ) : (
        <LibraryGridView
          items={items}
          serverUrl={serverUrl}
          isLoading={isLoading}
          onItemPress={handleItemPress}
          onItemLongPress={handleItemLongPress}
          onEndReached={handleLoadMoreItems}
          isFetchingMore={!isWatchlist && isFetchingNextLibraryPage}
          loadingMessage={t("library.loadingMedia")}
          emptyTitle={
            isWatchlist
              ? t("library.emptyWatchlistTitle")
              : isCollectionTab
              ? t("library.emptyCollectionsTitle")
              : t("library.emptyTitle")
          }
          emptyMessage={
            isWatchlist
              ? t("library.emptyWatchlistDesc")
              : isCollectionTab
              ? t("library.emptyCollectionsDesc")
              : t("library.emptyDesc")
          }
        />
      )}

      <SortOptionsModal
        visible={sortModalVisible}
        currentSort={currentSort}
        onSelectSort={setCurrentSort}
        onClose={() => setSortModalVisible(false)}
      />

      <MediaQuickActionsModal
        visible={!!actionItem}
        item={actionItem}
        serverUrl={serverUrl}
        onClose={() => setActionItem(null)}
        onPlay={handlePlayItem}
        onViewDetails={handleItemPress}
        onTogglePlayed={handleTogglePlayed}
        onRemoveFromResume={handleRemoveFromResume}
        onToggleFavorite={handleToggleFavorite}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0C"
  },
  tabsWrapper: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs
  },
  tabsContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm
  },
  libraryTab: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 12
  },
  tabIcon: {
    marginRight: 5
  },
  libraryTabSelected: {
    backgroundColor: "#1F1F2F"
  },
  libraryTabText: {
    color: colors.textSecondary,
    fontWeight: "600"
  },
  libraryTabTextSelected: {
    color: colors.textPrimary
  }
});

