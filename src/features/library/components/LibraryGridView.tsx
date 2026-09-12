import React, { useCallback } from "react";
import { View, FlatList, ActivityIndicator, StyleSheet, Dimensions } from "react-native";
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

const HORIZONTAL_PADDING = spacing.md; // 16
const GRID_GAP = spacing.sm; // 8

export const LibraryGridView = React.memo(function LibraryGridView({
  items,
  serverUrl,
  isLoading,
  onItemPress,
  emptyMessage = "No media found in this library"
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
        />
      </View>
    ),
    [serverUrl, cardWidth, cardHeight, onItemPress]
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
      columnWrapperStyle={{ gap: GRID_GAP }}
      contentContainerStyle={[styles.container, { paddingHorizontal: HORIZONTAL_PADDING }]}
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl
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
