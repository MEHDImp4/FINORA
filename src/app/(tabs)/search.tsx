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
import { MediaCard } from "../../features/home/components/MediaCard";
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

  const renderItem = useCallback(
    ({ item }: { item: MediaItem }) => (
      <View style={styles.gridItem}>
        <MediaCard
          item={item}
          serverUrl={serverUrl}
          variant="poster"
          onPress={handleItemPress}
        />
      </View>
    ),
    [serverUrl, handleItemPress]
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

      {isSearching && results.length === 0 ? (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <FinoraText variant="caption" style={styles.stateSubtitle}>
            Searching catalog...
          </FinoraText>
        </View>
      ) : hasSearchTerm ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={3}
          contentContainerStyle={styles.gridContainer}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={5}
          removeClippedSubviews={true}
          ListEmptyComponent={
            !isLoading && debouncedQuery.trim().length >= 2 ? (
              <View style={styles.centeredState}>
                <FinoraText variant="title" style={styles.stateTitle}>
                  No Results Found
                </FinoraText>
                <FinoraText variant="caption" style={styles.stateSubtitle}>
                  Try a different search term or category
                </FinoraText>
              </View>
            ) : null
          }
        />
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
  gridContainer: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl
  },
  gridItem: {
    flex: 1 / 3,
    alignItems: "center",
    marginBottom: spacing.md
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
