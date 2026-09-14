import React, { useState, useCallback, useMemo, useEffect } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useLibraries,
  useInfiniteLibraryItems,
  useWatchlistItems,
  useGenres
} from "../../hooks/useMediaQueries";
import { useAuthStore } from "../../stores/authStore";
import { LibraryFilterBar } from "../../features/library/components/LibraryFilterBar";
import { LibraryGridView } from "../../features/library/components/LibraryGridView";
import { SortOptionsModal } from "../../features/library/components/SortOptionsModal";
import {
  AVAILABLE_SORT_OPTIONS,
  SortOption
} from "../../features/library/types";
import { MediaItem } from "../../types/media";
import { FinoraText } from "../../design-system/components/FinoraText";
import { colors, spacing } from "../../design-system/tokens";
import { useNetworkDiagnostic } from "../../core/network/networkStatusService";
import { NetworkFailureStateView } from "../../design-system/components/NetworkFailureStateView";
import { SearchBar } from "../../features/search/components/SearchBar";
import { hapticService } from "../../core/feedback/hapticService";
import {
  useToggleFavorite,
  useMarkPlayed,
  useRemoveFromResume
} from "../../hooks/useUserDataMutations";
import { MediaQuickActionsModal } from "../../features/home/components/MediaQuickActionsModal";

const WATCHLIST_ID = "watchlist";

export default function LibraryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; q?: string }>();
  const session = useAuthStore((s) => s.session);
  const currentUserId = session?.userId;
  const serverUrl = session?.serverUrl || "";

  // Search state in library
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(params.q));
  const [searchQuery, setSearchQuery] = useState(params.q || "");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(params.q || "");

  // Active library state
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(
    params.tab === "watchlist" ? WATCHLIST_ID : params.tab || null
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (params.q) {
      setIsSearchOpen(true);
      setSearchQuery(params.q);
      setDebouncedSearchQuery(params.q);
    }
  }, [params.q]);

  useEffect(() => {
    if (!params.tab) return;
    if (params.tab === "watchlist") {
      setSelectedLibraryId(WATCHLIST_ID);
    } else {
      setSelectedLibraryId(params.tab);
    }
    setSelectedGenre(null);
  }, [params.tab]);

  // Sorting state
  const [currentSort, setCurrentSort] = useState<SortOption>(
    AVAILABLE_SORT_OPTIONS[0]
  );
  const [sortModalVisible, setSortModalVisible] = useState(false);

  // Genre filter state
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const isWatchlist = selectedLibraryId === WATCHLIST_ID;

  // Fetch libraries
  const {
    data: libraries = [],
    isLoading: isLibrariesLoading,
    isError: isLibrariesError,
    refetch: refetchLibraries
  } = useLibraries(currentUserId);

  // Default to first library if none selected and not on watchlist
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

  // Determine item types based on library collection type (prevents showing all episodes instead of series)
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

  // Fetch genres for active library
  const { data: genres = [] } = useGenres(
    currentUserId,
    isWatchlist ? undefined : activeLibraryId
  );

  // Fetch library items in pages so a large library is not downloaded in one request
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
      genres: selectedGenre ? [selectedGenre] : undefined,
      includeItemTypes,
      searchTerm: debouncedSearchQuery.trim().length >= 2 ? debouncedSearchQuery.trim() : undefined
    }
  );

  const libraryItems = useMemo(
    () => (libraryItemsPages?.pages ?? []).flatMap((page) => page.items),
    [libraryItemsPages]
  );
  const libraryItemTotal = libraryItemsPages?.pages?.[0]?.total ?? libraryItems.length;

  // Fetch watchlist items
  const {
    data: rawWatchlistItems = [],
    isLoading: isWatchlistLoading,
    isError: isWatchlistError,
    refetch: refetchWatchlist
  } = useWatchlistItems(
    currentUserId,
    isWatchlist
      ? {
          sortBy: currentSort.sortBy,
          sortOrder: currentSort.sortOrder,
          genres: selectedGenre ? [selectedGenre] : undefined
        }
      : undefined
  );

  const watchlistItems = useMemo(() => {
    if (!debouncedSearchQuery.trim() || debouncedSearchQuery.trim().length < 2) {
      return rawWatchlistItems;
    }
    const q = debouncedSearchQuery.trim().toLowerCase();
    return rawWatchlistItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.seriesName && item.seriesName.toLowerCase().includes(q))
    );
  }, [rawWatchlistItems, debouncedSearchQuery]);

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
    setSelectedGenre(null); // reset genre when switching library
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
      {/* Top Libraries Selector */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {/* Watchlist Tab */}
          <Pressable
            key="watchlist"
            style={[
              styles.libraryTab,
              isWatchlist && styles.libraryTabSelected
            ]}
            onPress={() => handleLibrarySelect(WATCHLIST_ID)}
            accessibilityRole="button"
            accessibilityLabel="Select Watchlist"
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
              Watchlist
            </FinoraText>
          </Pressable>

          {libraries.map((lib) => {
            const isSelected = !isWatchlist && lib.id === activeLibraryId;
            return (
              <Pressable
                key={lib.id}
                style={[
                  styles.libraryTab,
                  isSelected && styles.libraryTabSelected
                ]}
                onPress={() => handleLibrarySelect(lib.id)}
                accessibilityRole="button"
                accessibilityLabel={`Select library ${lib.name}`}
                accessibilityState={{ selected: isSelected }}
              >
                <FinoraText
                  variant="body"
                  style={[
                    styles.libraryTabText,
                    isSelected && styles.libraryTabTextSelected
                  ]}
                >
                  {lib.name}
                </FinoraText>
              </Pressable>
            );
          })}

          {/* Dedicated Collections Tab if not present in server libraries views */}
          {!hasCollectionLib ? (
            <Pressable
              key="collections"
              style={[
                styles.libraryTab,
                isCollectionTab && styles.libraryTabSelected
              ]}
              onPress={() => handleLibrarySelect("collections")}
              accessibilityRole="button"
              accessibilityLabel="Select Collections"
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
                Collections
              </FinoraText>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>

      {/* Action bar: Search trigger, Results count, & Sort trigger */}
      <View style={styles.actionBar}>
        <View style={styles.actionBarLeft}>
          <Pressable
            style={[styles.actionIconButton, isSearchOpen && styles.actionIconButtonActive]}
            onPress={() => {
              hapticService.selection();
              if (isSearchOpen && searchQuery) {
                setSearchQuery("");
                setDebouncedSearchQuery("");
              }
              setIsSearchOpen((prev) => !prev);
            }}
            accessibilityRole="button"
            accessibilityLabel={isSearchOpen ? "Close search" : "Open search"}
          >
            <Ionicons
              name={isSearchOpen ? "close" : "search-outline"}
              size={18}
              color={isSearchOpen ? colors.primary : colors.textPrimary}
            />
          </Pressable>

          <FinoraText variant="caption" style={styles.resultsCount}>
            {itemCount}{" "}
            {isWatchlist
              ? itemCount <= 1
                ? "titre dans la liste"
                : "titres dans la liste"
              : isCollectionTab
              ? itemCount <= 1
                ? "collection"
                : "collections"
              : itemCount <= 1
              ? "titre"
              : "titres"}
            {debouncedSearchQuery.trim() ? ` pour "${debouncedSearchQuery.trim()}"` : ""}
          </FinoraText>
        </View>

        <Pressable
          style={styles.sortButton}
          onPress={() => setSortModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Open sort options"
        >
          <Ionicons name="swap-vertical" size={16} color={colors.textPrimary} />
          <FinoraText variant="caption" style={styles.sortButtonText}>
            {currentSort.label}
          </FinoraText>
        </Pressable>
      </View>

      {/* Expandable Integrated Search Bar */}
      {isSearchOpen && (
        <View style={styles.searchBarWrapper}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => {
              setSearchQuery("");
              setDebouncedSearchQuery("");
            }}
            placeholder={
              isWatchlist
                ? "Rechercher dans la Watchlist..."
                : isCollectionTab
                ? "Rechercher une collection..."
                : `Rechercher dans ${activeLibrary?.name || "la bibliothèque"}...`
            }
            autoFocus={true}
          />
        </View>
      )}

      {/* Genre filter horizontal list */}
      {!isWatchlist && !isCollectionTab && (
        <LibraryFilterBar
          genres={genres}
          selectedGenre={selectedGenre}
          onSelectGenre={setSelectedGenre}
        />
      )}

      {/* Network Failure State or 3-Column Virtualized Media Grid */}
      {items.length === 0 && (isAnyError || failureType !== null) ? (
        <NetworkFailureStateView
          failureType={failureType}
          onRetry={handleRetry}
          isRetrying={isDiagChecking || isLoading}
          customTitle={
            failureType === "no_internet"
              ? "Bibliothèque indisponible hors-ligne"
              : failureType === "server_unreachable"
              ? "Serveur Jellyfin indisponible"
              : "Impossible de charger la bibliothèque"
          }
          customMessage={
            failureType === "no_internet"
              ? "La navigation dans votre catalogue complet nécessite une connexion réseau. Retrouvez vos contenus prêts à regarder dans vos téléchargements."
              : failureType === "server_unreachable"
              ? "Le serveur Jellyfin est éteint ou inaccessible. Visionnez vos films et séries téléchargés."
              : "Une erreur réseau est survenue lors du chargement des médias."
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
          loadingMessage="Chargement de vos médias..."
          emptyTitle={
            isWatchlist
              ? "Votre Watchlist est vide"
              : isCollectionTab
              ? "Aucune collection trouvée"
              : "Aucun média trouvé"
          }
          emptyMessage={
            isWatchlist
              ? "Ajoutez des films et séries depuis la page d'accueil ou la recherche pour les retrouver rapidement ici."
              : isCollectionTab
              ? "Aucune saga ou collection n'a été trouvée sur votre serveur Jellyfin."
              : "Aucun film ou série ne correspond à vos filtres dans cette bibliothèque."
          }
        />
      )}

      {/* Sort bottom sheet */}
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
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8
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
  },
  actionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  actionBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
    marginRight: spacing.sm
  },
  actionIconButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#161622",
    borderWidth: 1,
    borderColor: "#262638",
    justifyContent: "center",
    alignItems: "center"
  },
  actionIconButtonActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(229, 9, 20, 0.15)"
  },
  searchBarWrapper: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs
  },
  resultsCount: {
    color: colors.textSecondary
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#161622",
    borderWidth: 1,
    borderColor: "#262638",
    gap: 4
  },
  sortButtonText: {
    color: colors.textPrimary,
    fontWeight: "600"
  }
});
