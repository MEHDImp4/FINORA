import React, { useCallback } from "react";
import { View, FlatList, ActivityIndicator, StyleSheet, Dimensions } from "react-native";
import { MediaCard } from "../../home/components/MediaCard";
import { MediaItem } from "../../../types/media";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { PosterGridSkeleton } from "../../../design-system/components/PosterGridSkeleton";
import { colors, spacing } from "../../../design-system/tokens";

interface LibraryGridViewProps {
  items: MediaItem[];
  serverUrl: string;
  isLoading: boolean;
  onItemPress: (item: MediaItem) => void;
  onItemLongPress?: (item: MediaItem) => void;
  emptyTitle?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  onEndReached?: () => void;
  isFetchingMore?: boolean;
}

const HORIZONTAL_PADDING = spacing.md; // 16
const GRID_GAP = spacing.sm; // 8

export const LibraryGridView = React.memo(function LibraryGridView({
  items,
  serverUrl,
  isLoading,
  onItemPress,
  onItemLongPress,
  emptyTitle = "No Items",
  emptyMessage = "No media found in this library",
  loadingMessage = "Loading library items...",
  onEndReached,
  isFetchingMore = false
}: LibraryGridViewProps) {
  const screenWidth = Dimensions.get("window").width || 375;
  const cardWidth = Math.max(90, Math.floor((screenWidth - (HORIZONTAL_PADDING * 2) - (GRID_GAP * 2)) / 3));
  const cardHeight = Math.round(cardWidth * 1.5);

  const renderItem = useCallback(
    ({ item }: { item: MediaItem }) => (
      <View style={{ width: cardWidth, marginBottom: GRID_GAP * 1.5 }}>
        <MediaCard
          item={item}
          serverUrl={serverUrl}
          variant="poster"
          cardWidth={cardWidth}
          cardHeight={cardHeight}
          onPress={onItemPress}
          onLongPress={onItemLongPress}
        />
      </View>
    ),
    [serverUrl, cardWidth, cardHeight, onItemPress, onItemLongPress]
  );

  const keyExtractor = useCallback((item: MediaItem) => item.id, []);

  if (isLoading && items.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <PosterGridSkeleton rows={4} />
        <FinoraText variant="caption" style={styles.loadingText}>
          {loadingMessage}
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
      columnWrapperStyle={{ gap: GRID_GAP }}
      contentContainerStyle={[styles.container, { paddingHorizontal: HORIZONTAL_PADDING }]}
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={5}
      removeClippedSubviews={true}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      ListFooterComponent={
        isFetchingMore ? (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.footerLoader}
            testID="library-grid-loading-more"
          />
        ) : null
      }
      ListEmptyComponent={
        !isLoading ? (
          <View style={styles.centerContainer}>
            <FinoraText variant="title" style={styles.emptyTitle}>
              {emptyTitle}
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
    paddingTop: spacing.sm,
    paddingBottom: 80
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    marginTop: spacing.xxl
  },
  loadingContainer: {
    flex: 1,
    paddingTop: spacing.sm
  },
  footerLoader: {
    paddingVertical: spacing.lg
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: "center"
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
