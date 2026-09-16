import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Keyboard
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SearchBar } from "../../features/search/components/SearchBar";
import {
  SearchCategoryChips,
  SEARCH_CATEGORIES,
  SearchCategory
} from "../../features/search/components/SearchCategoryChips";
import { SearchHistoryList } from "../../features/search/components/SearchHistoryList";
import { searchHistoryService } from "../../features/search/searchHistory";
import { useSearchMedia } from "../../hooks/useSearchQueries";
import { useAuthStore } from "../../stores/authStore";
import { LibraryGridView } from "../../features/library/components/LibraryGridView";
import { MediaItem } from "../../types/media";
import { FinoraText } from "../../design-system/components/FinoraText";
import { colors, spacing } from "../../design-system/tokens";
import { useNetworkDiagnostic } from "../../core/network/networkStatusService";
import { NetworkFailureStateView } from "../../design-system/components/NetworkFailureStateView";

export default function SearchScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const currentUserId = session?.userId;
  const serverUrl = session?.serverUrl || "";

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>(
    SEARCH_CATEGORIES[0]
  );
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Debounce search query by 250ms (< 300ms budget)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(handler);
  }, [query]);

  // Load recent searches on mount and when active account changes
  useEffect(() => {
    searchHistoryService.getRecentSearches().then(setRecentSearches);
  }, [session?.serverId, session?.userId]);

  const {
    data: results = [],
    isLoading,
    isFetching,
    isError,
    refetch
  } = useSearchMedia(
    currentUserId,
    debouncedQuery,
    selectedCategory.itemTypes
  );

  const hasSearchTerm = query.trim().length > 0;
  const isSearching = (isLoading || isFetching) && debouncedQuery.trim().length >= 2;

  const { failureType, isChecking: isDiagChecking, runDiagnostic } = useNetworkDiagnostic(
    serverUrl,
    Boolean(isError && hasSearchTerm)
  );

  const handleRetrySearch = useCallback(async () => {
    await Promise.allSettled([refetch(), runDiagnostic()]);
  }, [refetch, runDiagnostic]);

  const handleSubmitSearch = useCallback(async () => {
    Keyboard.dismiss();
    const trimmed = query.trim();
    if (trimmed.length >= 2) {
      const updated = await searchHistoryService.addSearchTerm(trimmed);
      setRecentSearches(updated);
    }
  }, [query]);

  const handleSelectHistoryTerm = useCallback((term: string) => {
    setQuery(term);
    setDebouncedQuery(term);
  }, []);

  const handleRemoveHistoryTerm = useCallback(async (term: string) => {
    const updated = await searchHistoryService.removeSearchTerm(term);
    setRecentSearches(updated);
  }, []);

  const handleClearHistory = useCallback(async () => {
    await searchHistoryService.clearSearchHistory();
    setRecentSearches([]);
  }, []);

  const handleItemPress = useCallback(
    (item: MediaItem) => {
      if (query.trim().length >= 2) {
        searchHistoryService.addSearchTerm(query.trim()).then(setRecentSearches);
      }
      const targetId =
        (item.type === "Episode" || item.type === "Season") && item.seriesId
          ? item.seriesId
          : item.id;
      router.push(`/details/${targetId}`);
    },
    [query, router]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          onClear={() => {
            setQuery("");
            setDebouncedQuery("");
          }}
          onSubmitEditing={handleSubmitSearch}
        />
        <SearchCategoryChips
          selectedCategoryId={selectedCategory.id}
          onSelectCategory={setSelectedCategory}
        />
      </View>

      {hasSearchTerm ? (
        <View style={styles.resultsContainer}>
          {isError && results.length === 0 ? (
            <NetworkFailureStateView
              failureType={failureType}
              onRetry={handleRetrySearch}
              isRetrying={isDiagChecking || isSearching}
              customTitle={
                failureType === "no_internet"
                  ? "Recherche indisponible hors-ligne"
                  : failureType === "server_unreachable"
                  ? "Serveur indisponible pour la recherche"
                  : "Erreur lors de la recherche"
              }
              customMessage={
                failureType === "no_internet"
                  ? "La recherche dans le catalogue nécessite une connexion Internet ou un accès au serveur. Visionnez vos contenus téléchargés."
                  : failureType === "server_unreachable"
                  ? "Le serveur Jellyfin est injoignable pour effectuer cette recherche. Vous pouvez regarder vos contenus téléchargés."
                  : "Une erreur est survenue lors de la communication avec le serveur."
              }
            />
          ) : (
            <>
              {results.length > 0 && (
                <View style={styles.resultsHeader}>
                  <FinoraText variant="caption" color="textSecondary" weight="600">
                    {results.length} {results.length === 1 ? "résultat trouvé" : "résultats trouvés"}
                  </FinoraText>
                </View>
              )}
              <LibraryGridView
                items={results}
                serverUrl={serverUrl}
                isLoading={isSearching}
                onItemPress={handleItemPress}
                loadingMessage="Recherche dans le catalogue..."
                emptyTitle="Aucun résultat trouvé"
                emptyMessage="Essayez un autre mot-clé ou modifiez la catégorie sélectionnée."
              />
            </>
          )}
        </View>
      ) : (
        <View style={styles.idleContainer}>
          <SearchHistoryList
            history={recentSearches}
            onSelectTerm={handleSelectHistoryTerm}
            onRemoveTerm={handleRemoveHistoryTerm}
            onClearAll={handleClearHistory}
          />
          {recentSearches.length === 0 && (
            <View style={styles.centeredState}>
              <FinoraText variant="title" style={styles.stateTitle}>
                Explorer FINORA
              </FinoraText>
              <FinoraText variant="caption" style={styles.stateSubtitle}>
                Recherchez des films, séries et animés
              </FinoraText>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0C"
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm
  },
  resultsContainer: {
    flex: 1
  },
  resultsHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs
  },
  idleContainer: {
    flex: 1
  },
  centeredState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    marginTop: spacing.xxl
  },
  stateTitle: {
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: "center"
  },
  stateSubtitle: {
    color: colors.textSecondary,
    textAlign: "center"
  }
});
