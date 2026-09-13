import React, { useState, useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, Dimensions, Pressable, Animated } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { MediaItem } from "../../../types/media";
import { getHeroBannerUrls, getLogoUrl } from "../../../core/repositories/imageUrlBuilder";
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
  const candidateUrls = useMemo(
    () => (item ? getHeroBannerUrls(serverUrl, item, 1280) : []),
    [serverUrl, item]
  );
  const candidateKey = candidateUrls.join("|");
  const [candidateIndex, setCandidateIndex] = useState(0);

  // Netflix-style smooth gentle dissolve when the featured item changes
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Gentle dissolve: starts at 0.35 so it never flashes black, smoothly transitioning to 1.0
    fadeAnim.setValue(0.35);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true
    }).start();
  }, [item?.id]);

  useEffect(() => {
    setCandidateIndex(0);
  }, [candidateKey]);

  const currentUri = candidateUrls[candidateIndex];

  const handleImageError = () => {
    if (candidateIndex < candidateUrls.length - 1) {
      setCandidateIndex((prev) => prev + 1);
    } else {
      setCandidateIndex(candidateUrls.length);
    }
  };

  if (!item) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <FinoraText variant="caption" color="textMuted">
          No featured media available
        </FinoraText>
      </View>
    );
  }

  const logoUri = item.logoImageTag
    ? getLogoUrl(serverUrl, item.id, item.logoImageTag, 400)
    : item.seriesId
    ? getLogoUrl(serverUrl, item.seriesId, undefined, 400)
    : undefined;
  const displayTitle = item.type === "Episode" && item.seriesName ? item.seriesName : item.name;

  const formatRuntime = (mins?: number): string | null => {
    if (!mins || mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const runtimeString = formatRuntime(item.runtimeMinutes);
  const primaryGenre = item.genres && item.genres.length > 0 ? item.genres[0] : null;

  // Fallback badge labels if ratings/genres are missing on Jellyfin items
  const typeLabel =
    item.type === "Movie"
      ? "Film"
      : item.type === "Series"
      ? "Série"
      : item.type === "Episode"
      ? "Épisode"
      : null;

  const hasRating = Boolean(item.communityRating);
  const hasGenre = Boolean(primaryGenre);
  const hasRuntime = Boolean(runtimeString);
  const isHD = Boolean(item.mediaStreams?.some((s) => s.type === "Video" && (s.height || 0) >= 720));

  return (
    <Pressable
      style={styles.container}
      onPress={() => onPressDetails && onPressDetails(item)}
      accessibilityRole="imagebutton"
      accessibilityLabel={`Featured: ${displayTitle}`}
    >
      {/* Dynamic Backdrop with continuous smooth crossfade without remounting */}
      {currentUri && candidateIndex < candidateUrls.length ? (
        <Image
          source={{ uri: currentUri }}
          placeholder={item.blurhash ? { blurhash: item.blurhash } : undefined}
          style={styles.backdropImage}
          contentFit="cover"
          contentPosition="center"
          transition={600}
          cachePolicy="memory-disk"
          onError={handleImageError}
        />
      ) : (
        <View style={[styles.backdropImage, { backgroundColor: colors.surface }]} />
      )}

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
        {/* Animated Metadata Info (Logo/Title and Badges) with gentle dissolve */}
        <Animated.View style={[styles.infoContainer, { opacity: fadeAnim }]}>
          {/* Title or Logo */}
          {logoUri ? (
            <Image
              source={{ uri: logoUri }}
              style={styles.logoImage}
              contentFit="contain"
              accessibilityLabel={displayTitle}
            />
          ) : (
            <FinoraText variant="title" color="textPrimary" weight="800" style={styles.titleFallback}>
              {displayTitle}
            </FinoraText>
          )}

          {/* Metadata Badges */}
          <View style={styles.badgeRow}>
            {item.communityRating ? (
              <View style={[styles.badge, styles.ratingBadge]}>
                <Ionicons name="star" size={14} color="#FFD700" style={styles.starIcon} />
                <FinoraText variant="body" color="textPrimary" weight="700" style={styles.badgeText}>
                  {typeof item.communityRating === "number"
                    ? item.communityRating.toFixed(1)
                    : item.communityRating}
                </FinoraText>
              </View>
            ) : null}

            {item.officialRating ? (
              <View style={styles.badge}>
                <FinoraText variant="body" color="textPrimary" weight="700" style={styles.badgeText}>
                  {item.officialRating}
                </FinoraText>
              </View>
            ) : null}

            {item.year ? (
              <View style={styles.badge}>
                <FinoraText variant="body" color="textPrimary" weight="700" style={styles.badgeText}>
                  {item.year}
                </FinoraText>
              </View>
            ) : null}

            {runtimeString ? (
              <View style={styles.badge}>
                <FinoraText variant="body" color="textPrimary" weight="700" style={styles.badgeText}>
                  {runtimeString}
                </FinoraText>
              </View>
            ) : null}

            {primaryGenre ? (
              <View style={styles.badge}>
                <FinoraText variant="body" color="textPrimary" weight="700" style={styles.badgeText}>
                  {primaryGenre}
                </FinoraText>
              </View>
            ) : null}

            {/* Guaranteed fallback badges when rating or genre is missing */}
            {(!hasRating || !hasGenre) && typeLabel ? (
              <View style={styles.badge}>
                <FinoraText variant="body" color="textPrimary" weight="700" style={styles.badgeText}>
                  {typeLabel}
                </FinoraText>
              </View>
            ) : null}

            {(!hasRating || !hasRuntime) && isHD ? (
              <View style={styles.badge}>
                <FinoraText variant="body" color="textPrimary" weight="700" style={styles.badgeText}>
                  HD
                </FinoraText>
              </View>
            ) : null}
          </View>
        </Animated.View>

        {/* Action CTAs: Solid and stable, never flash or disappear during rotation */}
        <View style={styles.actionsRow}>
          <FinoraButton
            label="Play"
            variant="primary"
            size="md"
            leftIcon={<Ionicons name="play" size={16} color="#FFFFFF" />}
            style={styles.playButton}
            onPress={() => onPlay && onPlay(item)}
          />

          <FinoraButton
            label={item.isFavorite ? "In Watchlist" : "Watchlist"}
            leftIcon={
              <Ionicons
                name={item.isFavorite ? "bookmark" : "add"}
                size={16}
                color="#FFFFFF"
              />
            }
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
    marginHorizontal: 14,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
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
    width: "100%",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: "center",
    zIndex: 10
  },
  infoContainer: {
    width: "100%",
    alignItems: "center"
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
    marginBottom: spacing.lg,
    flexWrap: "wrap"
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(22, 22, 30, 0.88)",
    borderColor: "rgba(255, 255, 255, 0.28)",
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 8
  },
  ratingBadge: {
    backgroundColor: "rgba(45, 35, 10, 0.92)",
    borderColor: "rgba(255, 184, 0, 0.85)",
    borderWidth: 1.2
  },
  starIcon: {
    marginRight: 5
  },
  badgeText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700"
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    width: "100%"
  },
  playButton: {
    minWidth: 130,
    paddingHorizontal: 20
  },
  watchlistButton: {
    minWidth: 175,
    paddingHorizontal: 16
  }
});
