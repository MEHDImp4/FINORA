import React, { useCallback } from "react";
import { View, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { MediaCard } from "../../home/components/MediaCard";
import { MediaItem } from "../../../types/media";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";

interface LibraryGridViewProps {
  items: MediaItem[];
  serverUrl: string;
  isLoading: boolean;
  onItemPress: (item: MediaItem) => void;
  emptyMessage?: string;
}

export const LibraryGridView = React.memo(function LibraryGridView({
  items,
  serverUrl,
  isLoading,
  onItemPress,
  emptyMessage = "No media found in this library"
}: LibraryGridViewProps) {
  const renderItem = useCallback(
    ({ item }: { item: MediaItem }) => (
      <View style={styles.gridItem}>
        <MediaCard
          item={item}
          serverUrl={serverUrl}
          variant="poster"
          onPress={onItemPress}
        />
      </View>
    ),
    [serverUrl, onItemPress]
  );

  const keyExtractor = useCallback((item: MediaItem) => item.id, []);

  if (isLoading && items.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <FinoraText variant="caption" style={styles.loadingText}>
          Loading library items...
        </FinoraText>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      numColumns={3}
      contentContainerStyle={styles.container}
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={5}
      removeClippedSubviews={true}
      ListEmptyComponent={
        !isLoading ? (
          <View style={styles.centerContainer}>
            <FinoraText variant="title" style={styles.emptyTitle}>
              No Items
            </FinoraText>
            <FinoraText variant="caption" style={styles.emptySubtitle}>
              {emptyMessage}
            </FinoraText>
          </View>
        ) : null
      }
    />
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl
  },
  gridItem: {
    flex: 1 / 3,
    alignItems: "center",
    marginBottom: spacing.md
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    marginTop: spacing.xxl
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: spacing.md
  },
  emptyTitle: {
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  emptySubtitle: {
    color: colors.textSecondary,
    textAlign: "center"
  }
});
