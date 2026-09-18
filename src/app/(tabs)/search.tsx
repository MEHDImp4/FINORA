import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { SearchHistoryList } from "../../features/search/components/SearchHistoryList";
import { SearchPopularItemRow } from "../../features/search/components/SearchPopularItemRow";
import { searchHistoryService } from "../../features/search/searchHistory";
import { useSearchMedia, useSearchSuggestions } from "../../hooks/useSearchQueries";
import { useAuthStore } from "../../stores/authStore";
import { LibraryGridView } from "../../features/library/components/LibraryGridView";
import { MediaItem } from "../../types/media";
import { FinoraText } from "../../design-system/components/FinoraText";
import { colors, spacing } from "../../design-system/tokens";
import { useNetworkDiagnostic } from "../../core/network/networkStatusService";
import { NetworkFailureStateView } from "../../design-system/components/NetworkFailureStateView";
import { useTranslation } from "../../i18n";

const SUGGESTION_ITEM_TYPES = ["Movie", "Series"];

export default function SearchScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const currentUserId = session?.userId;
  const serverUrl = session?.serverUrl || "";

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
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
    debouncedQuery
  );

  const {
    data: suggestions = [],
    isLoading: isSuggestionsLoading
  } = useSearchSuggestions(
    currentUserId,
    SUGGESTION_ITEM_TYPES
  );

  const topSearchItems = useMemo(() => {
    return suggestions.filter(
      (item) => item.type === "Movie" || item.type === "Series"
    );
  }, [suggestions]);

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

  const handlePlayPress = useCallback(
    (item: MediaItem) => {
      if (query.trim().length >= 2) {
        searchHistoryService.addSearchTerm(query.trim()).then(setRecentSearches);
      }
      if (item.type === "Series" || item.type === "Season") {
        router.push(`/details/${item.id}`);
      } else {
        router.push(`/player/${item.id}`);
      }
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
                   ? t("search.searchOfflineTitle")
                   : failureType === "server_unreachable"
                   ? t("search.searchServerDownTitle")
                   : t("search.searchErrorTitle")
              }
              customMessage={
                failureType === "no_internet"
                   ? t("search.searchOfflineDesc")
                   : failureType === "server_unreachable"
                   ? t("search.searchServerDownDesc")
                   : t("search.searchErrorDesc")
              }
            />
          ) : (
            <>
              {results.length > 0 && (
                <View style={styles.resultsHeader}>
                  <FinoraText variant="caption" color="textSecondary" weight="600">
                    {results.length === 1
                      ? t("search.resultsCountSingle", { count: results.length })
                      : t("search.resultsCountMultiple", { count: results.length })}
                  </FinoraText>
                </View>
              )}
              <LibraryGridView
                items={results}
                serverUrl={serverUrl}
                isLoading={isSearching}
                onItemPress={handleItemPress}
                loadingMessage={t("search.searchingCatalog")}
                emptyTitle={t("search.noResultsTitle")}
                emptyMessage={t("search.noResultsDesc")}
              />
            </>
          )}
        </View>
      ) : (
        <View style={styles.idleContainer}>
          {recentSearches.length > 0 && (
            <SearchHistoryList
              history={recentSearches}
              onSelectTerm={handleSelectHistoryTerm}
              onRemoveTerm={handleRemoveHistoryTerm}
              onClearAll={handleClearHistory}
            />
          )}

          <View style={styles.sectionHeader}>
            <FinoraText variant="title" weight="700" color="textPrimary" style={styles.sectionTitle}>
              {t("search.topSearches")}
            </FinoraText>
          </View>

          {isSuggestionsLoading && topSearchItems.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={topSearchItems}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <SearchPopularItemRow
                  item={item}
                  serverUrl={serverUrl}
                  onPress={handleItemPress}
                  onPlayPress={handlePlayPress}
                />
              )}
              contentContainerStyle={styles.popularListContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                !isSuggestionsLoading ? (
                  <View style={styles.centeredState}>
                    <FinoraText variant="title" style={styles.stateTitle}>
                      {t("search.exploreTitle")}
                    </FinoraText>
                    <FinoraText variant="caption" style={styles.stateSubtitle}>
                      {t("search.exploreSubtitle")}
                    </FinoraText>
                  </View>
                ) : null
              }
            />
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs
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
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700"
  },
  popularListContent: {
    paddingBottom: 80
  },
  loadingContainer: {
    paddingTop: spacing.xl,
    alignItems: "center"
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


