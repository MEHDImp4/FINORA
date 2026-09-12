import React from "react";
import { View, StyleSheet, Dimensions, Pressable } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MediaItem } from "../../../types/media";
import { getBackdropUrl, getLogoUrl } from "../../../core/repositories/imageUrlBuilder";
import { FinoraButton } from "../../../design-system/components/FinoraButton";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";

interface HeroBannerProps {
  item: MediaItem | null;
  serverUrl: string;
  onPlay?: (item: MediaItem) => void;
  onToggleFavorite?: (item: MediaItem) => void;
  onPressDetails?: (item: MediaItem) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = Math.round(SCREEN_WIDTH * 1.15); // Dynamic cinematic vertical elevation

export const HeroBanner = React.memo(function HeroBanner({
  item,
  serverUrl,
  onPlay,
  onToggleFavorite,
  onPressDetails
}: HeroBannerProps) {
  if (!item) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <FinoraText variant="caption" color="textMuted">
          No featured media available
        </FinoraText>
      </View>
    );
  }

  const backdropUri = getBackdropUrl(serverUrl, item.id, item.backdropImageTag, SCREEN_WIDTH);
  const logoUri = item.logoImageTag
    ? getLogoUrl(serverUrl, item.id, item.logoImageTag, 400)
    : undefined;

  const formatRuntime = (mins?: number): string | null => {
    if (!mins || mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const runtimeString = formatRuntime(item.runtimeMinutes);
  const primaryGenre = item.genres && item.genres.length > 0 ? item.genres[0] : null;

  return (
    <Pressable
      style={styles.container}
      onPress={() => onPressDetails && onPressDetails(item)}
      accessibilityRole="imagebutton"
      accessibilityLabel={`Featured: ${item.name}`}
    >
      {/* Dynamic Backdrop */}
      <Image
        source={{ uri: backdropUri }}
        placeholder={item.blurhash ? { blurhash: item.blurhash } : undefined}
        style={styles.backdropImage}
        contentFit="cover"
        transition={300}
      />

      {/* Multi-stop Linear Gradient overlay blending into deep OLED black */}
      <LinearGradient
        colors={[
          "rgba(10, 10, 12, 0.2)",
          "transparent",
          "rgba(10, 10, 12, 0.7)",
          colors.background
        ]}
        locations={[0, 0.35, 0.75, 1]}
        style={styles.gradientOverlay}
      />

      {/* Content Container */}
      <View style={styles.contentContainer}>
        {/* Title or Logo */}
        {logoUri ? (
          <Image
            source={{ uri: logoUri }}
            style={styles.logoImage}
            contentFit="contain"
            accessibilityLabel={item.name}
          />
        ) : (
          <FinoraText variant="title" color="textPrimary" weight="800" style={styles.titleFallback}>
            {item.name}
          </FinoraText>
        )}

        {/* Metadata Badges */}
        <View style={styles.badgeRow}>
          {item.year ? (
            <View style={styles.badge}>
              <FinoraText variant="caption" color="textSecondary" weight="600">
                {item.year}
              </FinoraText>
            </View>
          ) : null}

          {runtimeString ? (
            <View style={styles.badge}>
              <FinoraText variant="caption" color="textSecondary" weight="600">
                {runtimeString}
              </FinoraText>
            </View>
          ) : null}

          {item.communityRating ? (
            <View style={[styles.badge, styles.ratingBadge]}>
              <FinoraText variant="caption" color="textPrimary" weight="700">
                ★ {item.communityRating}
              </FinoraText>
            </View>
          ) : null}

          {primaryGenre ? (
            <View style={styles.badge}>
              <FinoraText variant="caption" color="textMuted" weight="500">
                {primaryGenre}
              </FinoraText>
            </View>
          ) : null}
        </View>

        {/* Action CTAs */}
        <View style={styles.actionsRow}>
          <FinoraButton
            label="Play"
            variant="primary"
            size="md"
            style={styles.playButton}
            onPress={() => onPlay && onPlay(item)}
          />

          <FinoraButton
            label={item.isFavorite ? "★ In Watchlist" : "+ Watchlist"}
            variant="secondary"
            size="md"
            style={styles.watchlistButton}
            onPress={() => onToggleFavorite && onToggleFavorite(item)}
          />
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: HERO_HEIGHT,
    backgroundColor: colors.background,
    position: "relative",
    justifyContent: "flex-end"
  },
  emptyContainer: {
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  backdropImage: {
    ...StyleSheet.absoluteFill
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFill
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: "center",
    zIndex: 10
  },
  logoImage: {
    width: 240,
    height: 70,
    marginBottom: spacing.md
  },
  titleFallback: {
    textAlign: "center",
    marginBottom: spacing.sm,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg
  },
  badge: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4
  },
  ratingBadge: {
    backgroundColor: "rgba(255, 184, 0, 0.2)",
    borderColor: colors.accent,
    borderWidth: 0.5
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    width: "100%"
  },
  playButton: {
    flex: 1,
    maxWidth: 160
  },
  watchlistButton: {
    flex: 1,
    maxWidth: 160
  }
});
