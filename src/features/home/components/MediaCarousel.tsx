import React from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { MediaItem } from "../../../types/media";
import { MediaCard, CardVariant, POSTER_WIDTH, THUMBNAIL_WIDTH } from "./MediaCard";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { spacing } from "../../../design-system/tokens";

interface MediaCarouselProps {
  title: string;
  items: MediaItem[];
  serverUrl: string;
  variant?: CardVariant;
  onItemPress?: (item: MediaItem) => void;
  onItemLongPress?: (item: MediaItem) => void;
}

export const MediaCarousel = React.memo(
  function MediaCarousel({
    title,
    items,
    serverUrl,
    variant = "poster",
    onItemPress,
    onItemLongPress
  }: MediaCarouselProps) {
    const validItems = React.useMemo(() => {
      return (items || []).filter((item) => !item.isMissing && item.locationType !== "Virtual");
    }, [items]);

    if (validItems.length === 0) {
      return null;
    }

    const itemWidth = variant === "thumbnail" ? THUMBNAIL_WIDTH : POSTER_WIDTH;
    const itemTotalWidth = itemWidth + spacing.md;

    return (
      <View style={styles.sectionContainer}>
        {/* Section Title */}
        <View style={styles.titleContainer}>
          <FinoraText variant="subtitle" color="textPrimary" weight="700">
            {title}
          </FinoraText>
        </View>

        {/* Optimized Horizontal Virtualized FlatList */}
        <FlatList
          data={validItems}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          keyExtractor={(item) => item.id}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={4}
          getItemLayout={(_data, index) => ({
            length: itemTotalWidth,
            offset: itemTotalWidth * index,
            index
          })}
          renderItem={({ item }) => (
            <MediaCard
              item={item}
              serverUrl={serverUrl}
              variant={variant}
              onPress={onItemPress}
              onLongPress={onItemLongPress}
            />
          )}
        />
      </View>
    );
  },
  (prev, next) =>
    prev.title === next.title &&
    prev.items === next.items &&
    prev.serverUrl === next.serverUrl &&
    prev.variant === next.variant
);

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: spacing.xl
  },
  titleContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md
  },
  listContent: {
    paddingHorizontal: spacing.lg
  }
});
