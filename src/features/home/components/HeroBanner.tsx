import React, { useState, useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, Pressable, Animated, useWindowDimensions } from "react-native";
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

export const HeroBanner = React.memo(function HeroBanner({
  item,
  serverUrl,
  onPlay,
  onToggleFavorite,
  onPressDetails
}: HeroBannerProps) {
  const { width: screenWidth } = useWindowDimensions();
  const heroHeight = Math.round(Math.max(340, Math.min(430, screenWidth * 1.02)));
  const candidateUrls = useMemo(
    () => (item ? getHeroBannerUrls(serverUrl, item, 1280) : []),
    [serverUrl, item]
  );
  const candidateKey = candidateUrls.join("|");
  const [candidateIndex, setCandidateIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fadeAnim.setValue(0.35);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true
    }).start();
  }, [item?.id, fadeAnim]);

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
          Aucun média à mettre en avant
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
      style={[styles.container, { height: heroHeight }]}
      onPress={() => onPressDetails && onPressDetails(item)}
      accessibilityRole="imagebutton"
      accessibilityLabel={`À la une : ${displayTitle}`}
    >
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

      <View style={styles.contentContainer}>
        <Animated.View style={[styles.infoContainer, { opacity: fadeAnim }]}>
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

        <View style={styles.actionsRow}>
          <FinoraButton
            label="Lire"
            variant="primary"
            size="md"
            leftIcon={<Ionicons name="play" size={16} color="#FFFFFF" />}
            style={styles.playButton}
            onPress={() => onPlay && onPlay(item)}
          />

          <FinoraButton
            label={item.isFavorite ? "Dans ma liste" : "Ma liste"}
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
    backgroundColor: colors.background,
    position: "relative",
    justifyContent: "flex-end"
  },
  emptyContainer: {
    height: 220,
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
    paddingBottom: spacing.lg,
    alignItems: "center",
    zIndex: 10
  },
  infoContainer: {
    width: "100%",
    alignItems: "center"
  },
  logoImage: {
    width: 220,
    maxWidth: "82%",
    height: 64,
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
    gap: spacing.xs,
    marginBottom: spacing.md,
    flexWrap: "wrap"
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(22, 22, 30, 0.72)",
    borderColor: "rgba(255, 255, 255, 0.20)",
    borderTopColor: "rgba(255, 255, 255, 0.35)",
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4
  },
  ratingBadge: {
    backgroundColor: "rgba(45, 35, 10, 0.85)",
    borderColor: "rgba(255, 184, 0, 0.85)",
    borderTopColor: "rgba(255, 215, 0, 0.95)",
    borderWidth: 1.2
  },
  starIcon: {
    marginRight: 5
  },
  badgeText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700"
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    width: "100%"
  },
  playButton: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.28)",
    borderTopColor: "rgba(255, 255, 255, 0.45)",
    shadowColor: "#E50914",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10
  },
  watchlistButton: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10,
    backgroundColor: "rgba(30, 30, 42, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    borderTopColor: "rgba(255, 255, 255, 0.32)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8
  }
});
