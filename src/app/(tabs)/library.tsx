import React, { useState, useCallback, useMemo, useEffect } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useLibraries,
  useLibraryItems,
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

const WATCHLIST_ID = "watchlist";

export default function LibraryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const session = useAuthStore((s) => s.session);
  const currentUserId = session?.userId;
  const serverUrl = session?.serverUrl || "";

  // Active library state
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(
    params.tab === "watchlist" ? WATCHLIST_ID : null
  );

  useEffect(() => {
    if (params.tab === "watchlist") {
      setSelectedLibraryId(WATCHLIST_ID);
      setSelectedGenre(null);
    }
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
      return libraries.find((lib) => lib.id === selectedLibraryId);
    }
    return libraries.length > 0 ? libraries[0] : undefined;
  }, [selectedLibraryId, libraries, isWatchlist]);

  const activeLibraryId = activeLibrary?.id;

  // Determine item types based on library collection type (prevents showing all episodes instead of series)
  const includeItemTypes = useMemo(() => {
    if (!activeLibrary) return undefined;
    const type = activeLibrary.collectionType?.toLowerCase() || "";
    const name = activeLibrary.name?.toLowerCase() || "";

    if (type === "tvshows" || name.includes("show") || name.includes("série") || name.includes("serie")) {
      return ["Series"];
    }
    if (type === "movies" || name.includes("movie") || name.includes("film")) {
      return ["Movie"];
    }
    if (type === "boxsets" || name.includes("collection")) {
      return ["BoxSet"];
    }
    return ["Movie", "Series"];
  }, [activeLibrary]);

  // Fetch genres for active library
  const { data: genres = [] } = useGenres(
    currentUserId,
    isWatchlist ? undefined : activeLibraryId
  );

  // Fetch library items
  const {
    data: libraryItems = [],
    isLoading: isItemsLoading,
    isError: isItemsError,
    refetch: refetchItems
  } = useLibraryItems(
    currentUserId,
    isWatchlist ? undefined : activeLibraryId,
    {
      sortBy: currentSort.sortBy,
      sortOrder: currentSort.sortOrder,
      genres: selectedGenre ? [selectedGenre] : undefined,
      includeItemTypes
    }
  );

  // Fetch watchlist items
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
          sortOrder: currentSort.sortOrder,
          genres: selectedGenre ? [selectedGenre] : undefined
        }
      : undefined
  );

  const items = isWatchlist ? watchlistItems : libraryItems;
  const isLoading = isWatchlist ? isWatchlistLoading : (isItemsLoading || isLibrariesLoading);
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
    setSelectedLibraryId(libraryId);
    setSelectedGenre(null); // reset genre when switching library
  }, []);

  const handleItemPress = useCallback(
    (item: MediaItem) => {
      router.push(`/details/${item.id}`);
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
              color={isWatchlist ? "#E50914" : colors.textSecondary}
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
        </ScrollView>
      </View>

      {/* Action bar: Sort trigger & Active genre info */}
      <View style={styles.actionBar}>
        <FinoraText variant="caption" style={styles.resultsCount}>
          {items.length} {isWatchlist ? (items.length <= 1 ? "titre dans la liste" : "titres dans la liste") : (items.length <= 1 ? "titre" : "titres")}
        </FinoraText>

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

      {/* Genre filter horizontal list */}
      {!isWatchlist && (
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
          loadingMessage="Chargement de vos médias..."
          emptyTitle={isWatchlist ? "Votre Watchlist est vide" : "Aucun média trouvé"}
          emptyMessage={
            isWatchlist
              ? "Ajoutez des films et séries depuis la page d'accueil ou la recherche pour les retrouver rapidement ici."
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
