import React, { useState, useCallback, useMemo } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useLibraries,
  useLibraryItems,
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

export default function LibraryScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const currentUserId = session?.userId;
  const serverUrl = session?.serverUrl || "";

  // Active library state
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);

  // Sorting state
  const [currentSort, setCurrentSort] = useState<SortOption>(
    AVAILABLE_SORT_OPTIONS[0]
  );
  const [sortModalVisible, setSortModalVisible] = useState(false);

  // Genre filter state
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  // Fetch libraries
  const { data: libraries = [], isLoading: isLibrariesLoading } = useLibraries(
    currentUserId
  );

  // Default to first library if none selected
  const activeLibrary = useMemo(() => {
    if (selectedLibraryId) {
      return libraries.find((lib) => lib.id === selectedLibraryId);
    }
    return libraries.length > 0 ? libraries[0] : undefined;
  }, [selectedLibraryId, libraries]);

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
  const { data: genres = [] } = useGenres(currentUserId, activeLibraryId);

  // Fetch library items
  const { data: items = [], isLoading: isItemsLoading } = useLibraryItems(
    currentUserId,
    activeLibraryId,
    {
      sortBy: currentSort.sortBy,
      sortOrder: currentSort.sortOrder,
      genres: selectedGenre ? [selectedGenre] : undefined,
      includeItemTypes
    }
  );

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
      {libraries.length > 1 && (
        <View style={styles.tabsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            {libraries.map((lib) => {
              const isSelected = lib.id === activeLibraryId;
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
      )}

      {/* Action bar: Sort trigger & Active genre info */}
      <View style={styles.actionBar}>
        <FinoraText variant="caption" style={styles.resultsCount}>
          {items.length} {items.length === 1 ? "item" : "items"}
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
      <LibraryFilterBar
        genres={genres}
        selectedGenre={selectedGenre}
        onSelectGenre={setSelectedGenre}
      />

      {/* 3-Column Virtualized Media Grid */}
      <LibraryGridView
        items={items}
        serverUrl={serverUrl}
        isLoading={isItemsLoading || isLibrariesLoading}
        onItemPress={handleItemPress}
      />

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
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8
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
