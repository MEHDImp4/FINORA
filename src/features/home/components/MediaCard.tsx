import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { MediaItem } from "../../../types/media";
import { getPosterUrl, getBackdropUrl } from "../../../core/repositories/imageUrlBuilder";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";

export type CardVariant = "poster" | "thumbnail";

interface MediaCardProps {
  item: MediaItem;
  serverUrl: string;
  variant?: CardVariant;
  onPress?: (item: MediaItem) => void;
}

export const POSTER_WIDTH = 130;
export const POSTER_HEIGHT = 195; // 2:3 ratio

export const THUMBNAIL_WIDTH = 220;
export const THUMBNAIL_HEIGHT = 124; // 16:9 ratio

export const MediaCard = React.memo(
  function MediaCard({
    item,
    serverUrl,
    variant = "poster",
    onPress
  }: MediaCardProps) {
    const isThumbnail = variant === "thumbnail";
    const width = isThumbnail ? THUMBNAIL_WIDTH : POSTER_WIDTH;
    const height = isThumbnail ? THUMBNAIL_HEIGHT : POSTER_HEIGHT;

    // Determine target image URL: Thumbnails prefer backdrop or primary, posters prefer primary
    const imageUrl = isThumbnail
      ? getBackdropUrl(serverUrl, item.id, item.backdropImageTag || item.primaryImageTag, width)
      : getPosterUrl(serverUrl, item.id, item.primaryImageTag, width);

    const hasProgress = item.playedPercentage > 0 && !item.isPlayed;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.container,
          { width },
          pressed && styles.pressed
        ]}
        onPress={() => onPress && onPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}${item.year ? `, ${item.year}` : ""}`}
      >
        {/* Media Poster / Thumbnail Image */}
        <View style={[styles.imageContainer, { width, height }]}>
          <Image
            source={{ uri: imageUrl }}
            placeholder={item.blurhash ? { blurhash: item.blurhash } : undefined}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />

          {/* Progress Bar for In-Progress Media */}
          {hasProgress ? (
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, Math.max(5, item.playedPercentage))}%` }
                ]}
              />
            </View>
          ) : null}
        </View>

        {/* Media Metadata Caption */}
        <View style={styles.captionContainer}>
          <FinoraText
            variant="caption"
            color="textPrimary"
            weight="600"
            numberOfLines={1}
            style={styles.titleText}
          >
            {item.name}
          </FinoraText>

          <View style={styles.subrow}>
            {item.year ? (
              <FinoraText variant="caption" color="textMuted" weight="500">
                {item.year}
              </FinoraText>
            ) : null}

            {item.communityRating ? (
              <FinoraText variant="caption" color="accent" weight="700">
                ★ {item.communityRating}
              </FinoraText>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.playedPercentage === next.item.playedPercentage &&
    prev.item.isPlayed === next.item.isPlayed &&
    prev.item.isFavorite === next.item.isFavorite &&
    prev.serverUrl === next.serverUrl &&
    prev.variant === next.variant
);

const styles = StyleSheet.create({
  container: {
    marginRight: spacing.md,
    borderRadius: 8
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }]
  },
  imageContainer: {
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: colors.card,
    position: "relative"
  },
  image: {
    width: "100%",
    height: "100%"
  },
  progressBarTrack: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "rgba(0, 0, 0, 0.6)"
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2
  },
  captionContainer: {
    marginTop: spacing.xs,
    paddingHorizontal: 2
  },
  titleText: {
    fontSize: 13
  },
  subrow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2
  }
});
