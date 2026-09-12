import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, StyleProp, ViewStyle } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { MediaItem } from "../../../types/media";
import {
  getMediaPosterUrls,
  getMediaThumbnailUrls
} from "../../../core/repositories/imageUrlBuilder";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";
import { hapticService } from "../../../core/feedback/hapticService";

export type CardVariant = "poster" | "thumbnail";

interface MediaCardProps {
  item: MediaItem;
  serverUrl: string;
  variant?: CardVariant;
  cardWidth?: number;
  cardHeight?: number;
  style?: StyleProp<ViewStyle>;
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
    cardWidth,
    cardHeight,
    style,
    onPress
  }: MediaCardProps) {
    const isThumbnail = variant === "thumbnail";
    const width = cardWidth ?? (isThumbnail ? THUMBNAIL_WIDTH : POSTER_WIDTH);
    const height = cardHeight ?? (isThumbnail ? THUMBNAIL_HEIGHT : POSTER_HEIGHT);

    // Determine target candidate image URLs with fallback chain
    const candidateUrls = React.useMemo(() => {
      return isThumbnail
        ? getMediaThumbnailUrls(serverUrl, item, width)
        : getMediaPosterUrls(serverUrl, item, width);
    }, [isThumbnail, serverUrl, item, width]);

    const [candidateIndex, setCandidateIndex] = useState(0);

    useEffect(() => {
      setCandidateIndex(0);
    }, [candidateUrls]);

    const currentUrl = candidateUrls[candidateIndex];

    const handleImageError = () => {
      if (candidateIndex < candidateUrls.length - 1) {
        setCandidateIndex((prev) => prev + 1);
      } else {
        setCandidateIndex(candidateUrls.length);
      }
    };

    const hasProgress = item.playedPercentage > 0 && !item.isPlayed;
    const progressLabel = hasProgress ? `, ${Math.round(item.playedPercentage)}% watched` : "";

    const isEpisode = item.type === "Episode";
    const isSeason = item.type === "Season";
    const mainTitle = isEpisode && item.seriesName
      ? item.seriesName
      : isSeason && item.seriesName
      ? item.seriesName
      : item.name;
    const subTitle = isEpisode
      ? typeof item.episodeIndex === "number"
        ? typeof item.seasonIndex === "number"
          ? `S${item.seasonIndex}:E${item.episodeIndex} · ${item.name}`
          : `E${item.episodeIndex} · ${item.name}`
        : item.name
      : isSeason
      ? item.name
      : item.year
      ? String(item.year)
      : null;

    const handlePress = () => {
      hapticService.impactLight();
      if (onPress) {
        onPress(item);
      }
    };

    return (
      <Pressable
        style={({ pressed }) => [
          styles.container,
          { width },
          cardWidth !== undefined && { marginRight: 0 },
          style,
          pressed && styles.pressed
        ]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`${mainTitle}${subTitle ? `, ${subTitle}` : ""}${progressLabel}`}
        accessibilityHint="Double tap to open media details"
      >
        {/* Media Poster / Thumbnail Image */}
        <View style={[styles.imageContainer, { width, height }]}>
          {currentUrl && candidateIndex < candidateUrls.length ? (
            <Image
              key={currentUrl}
              source={{ uri: currentUrl }}
              placeholder={item.blurhash ? { blurhash: item.blurhash } : undefined}
              style={styles.image}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              onError={handleImageError}
            />
          ) : (
            <View style={styles.fallbackContainer}>
              <Ionicons
                name={item.type === "Series" ? "tv-outline" : "film-outline"}
                size={Math.min(width, height) * 0.28}
                color={colors.textMuted}
              />
              <FinoraText
                variant="caption"
                color="textMuted"
                numberOfLines={2}
                style={styles.fallbackText}
              >
                {mainTitle}
              </FinoraText>
            </View>
          )}

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
            {mainTitle}
          </FinoraText>

          <View style={styles.subrow}>
            {subTitle ? (
              <FinoraText
                variant="caption"
                color="textMuted"
                weight="500"
                numberOfLines={1}
                style={{ flex: 1, marginRight: 4 }}
              >
                {subTitle}
              </FinoraText>
            ) : null}

            {!isEpisode && item.communityRating ? (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={10} color={colors.accent} style={styles.starIcon} />
                <FinoraText variant="caption" color="accent" weight="700">
                  {item.communityRating}
                </FinoraText>
              </View>
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
    prev.variant === next.variant &&
    prev.cardWidth === next.cardWidth &&
    prev.cardHeight === next.cardHeight
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
  fallbackContainer: {
    width: "100%",
    height: "100%",
    backgroundColor: "#16161c",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xs
  },
  fallbackText: {
    fontSize: 10,
    textAlign: "center",
    marginTop: 4
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
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  starIcon: {
    marginRight: 2
  }
});
