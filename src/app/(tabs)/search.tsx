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

  // Load recent searches on mount
  useEffect(() => {
    searchHistoryService.getRecentSearches().then(setRecentSearches);
  }, []);

  const { data: results = [], isLoading, isFetching } = useSearchMedia(
    currentUserId,
    debouncedQuery,
    selectedCategory.itemTypes
  );

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
      router.push(`/details/${item.id}`);
    },
    [query, router]
  );

  const hasSearchTerm = query.trim().length > 0;
  const isSearching = (isLoading || isFetching) && debouncedQuery.trim().length >= 2;

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
          {results.length > 0 && (
            <View style={styles.resultsHeader}>
              <FinoraText variant="caption" color="textSecondary" weight="600">
                {results.length} {results.length === 1 ? "item found" : "items found"}
              </FinoraText>
            </View>
          )}
          <LibraryGridView
            items={results}
            serverUrl={serverUrl}
            isLoading={isSearching}
            onItemPress={handleItemPress}
            loadingMessage="Searching catalog..."
            emptyTitle="No Results Found"
            emptyMessage="Try a different search term or category"
          />
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
                Explore FINORA
              </FinoraText>
              <FinoraText variant="caption" style={styles.stateSubtitle}>
                Search movies, TV shows, and series
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
