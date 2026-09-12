import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { MediaItem } from "../../../types/media";
import {
  getBackdropUrl,
  getLogoUrl
} from "../../../core/repositories/imageUrlBuilder";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { FinoraButton } from "../../../design-system/components/FinoraButton";
import { FinoraIconButton } from "../../../design-system/components/FinoraIconButton";
import { colors, spacing } from "../../../design-system/tokens";
import { CastList } from "./CastList";

export interface MovieDetailsViewProps {
  item: MediaItem;
  serverUrl: string;
  onPlay: (item: MediaItem) => void;
  onBack: () => void;
  onToggleFavorite?: (item: MediaItem) => void;
  onTogglePlayed?: (item: MediaItem) => void;
  onDownload?: (item: MediaItem) => void;
  isDownloaded?: boolean;
  isDownloading?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BACKDROP_HEIGHT = Math.round(SCREEN_WIDTH * 0.72);

export const MovieDetailsView: React.FC<MovieDetailsViewProps> = React.memo(
  ({
    item,
    serverUrl,
    onPlay,
    onBack,
    onToggleFavorite,
    onTogglePlayed,
    onDownload,
    isDownloaded,
    isDownloading
  }) => {
    const insets = useSafeAreaInsets();
    const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);

    const backdropUri = item.backdropImageTag
      ? getBackdropUrl(serverUrl, item.id, item.backdropImageTag, 1080)
      : null;

    const logoUri = item.logoImageTag
      ? getLogoUrl(serverUrl, item.id, item.logoImageTag, 400)
      : null;

    // Formatting runtime
    const formatRuntime = (mins?: number): string | null => {
      if (!mins || mins <= 0) return null;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      if (h > 0) return `${h}h ${m}m`;
      return `${m}m`;
    };

    // Extracting video/audio spec badges
    const videoStream = item.mediaStreams?.find((s) => s.type === "Video");
    const audioStream = item.mediaStreams?.find((s) => s.type === "Audio");

    let resolutionBadge: string | null = null;
    if (videoStream?.width) {
      if (videoStream.width >= 3800) resolutionBadge = "4K";
      else if (videoStream.width >= 1900) resolutionBadge = "1080p";
      else if (videoStream.width >= 1200) resolutionBadge = "720p";
    }

    let audioBadge: string | null = null;
    if (audioStream?.channels) {
      if (audioStream.channels >= 8) audioBadge = "7.1";
      else if (audioStream.channels >= 6) audioBadge = "5.1";
      else if (audioStream.channels >= 2) audioBadge = "Stereo";
    }

    const isResume = item.playedPercentage > 0 && !item.isPlayed;
    const playLabel = isResume ? `Resume (${item.playedPercentage}%)` : "Play";

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Backdrop Header */}
        <View style={styles.headerContainer}>
          {backdropUri ? (
            <Image
              source={{ uri: backdropUri }}
              style={styles.backdropImage}
              contentFit="cover"
              transition={300}
              placeholder={item.blurhash}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.backdropImage, styles.backdropFallback]} />
          )}

          <LinearGradient
            colors={[
              "rgba(10, 10, 12, 0.4)",
              "transparent",
              "rgba(10, 10, 12, 0.8)",
              "#0A0A0C"
            ]}
            locations={[0, 0.35, 0.75, 1]}
            style={styles.gradientOverlay}
          />

          {/* Top Back Button */}
          <View style={[styles.topBar, { top: Math.max(insets.top, 16) + 8 }]}>
            <FinoraIconButton
              accessibilityLabel="Go back"
              onPress={onBack}
              size={40}
              backgroundColor="rgba(10, 10, 12, 0.6)"
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </FinoraIconButton>
          </View>

          {/* Logo or Title */}
          <View style={styles.headerContent}>
            {logoUri ? (
              <Image
                source={{ uri: logoUri }}
                style={styles.logoImage}
                contentFit="contain"
                transition={200}
                cachePolicy="memory-disk"
              />
            ) : (
              <FinoraText variant="title" style={styles.titleText}>
                {item.name}
              </FinoraText>
            )}
          </View>
        </View>

        {/* Metadata Badges */}
        <View style={styles.metadataRow}>
          {item.year ? (
            <FinoraText variant="caption" color="#8E8E9F" style={styles.badgeText}>
              {item.year}
            </FinoraText>
          ) : null}

          {item.runtimeMinutes ? (
            <FinoraText variant="caption" color="#8E8E9F" style={styles.badgeText}>
              {formatRuntime(item.runtimeMinutes)}
            </FinoraText>
          ) : null}

          {item.communityRating ? (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={11} color={colors.accent} style={{ marginRight: 3 }} />
              <FinoraText variant="caption" color={colors.accent} style={styles.ratingText}>
                {item.communityRating}
              </FinoraText>
            </View>
          ) : null}

          {item.officialRating ? (
            <View style={styles.specPill}>
              <FinoraText variant="caption" color="#8E8E9F" style={styles.specText}>
                {item.officialRating}
              </FinoraText>
            </View>
          ) : null}

          {resolutionBadge ? (
            <View style={styles.specPill}>
              <FinoraText variant="caption" color="#FFFFFF" style={styles.specText}>
                {resolutionBadge}
              </FinoraText>
            </View>
          ) : null}

          {audioBadge ? (
            <View style={styles.specPill}>
              <FinoraText variant="caption" color="#8E8E9F" style={styles.specText}>
                {audioBadge}
              </FinoraText>
            </View>
          ) : null}
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionRow}>
          <FinoraButton
            label={playLabel}
            variant="primary"
            size="lg"
            style={styles.playButton}
            onPress={() => onPlay(item)}
            leftIcon={<Ionicons name="play" size={20} color="#FFFFFF" />}
          />

          {onToggleFavorite ? (
            <FinoraIconButton
              accessibilityLabel={item.isFavorite ? "Remove from watchlist" : "Add to watchlist"}
              onPress={() => onToggleFavorite(item)}
              size={48}
              backgroundColor={
                item.isFavorite ? colors.primary : colors.surface
              }
            >
              <Ionicons
                name={item.isFavorite ? "bookmark" : "bookmark-outline"}
                size={22}
                color="#FFFFFF"
              />
            </FinoraIconButton>
          ) : null}

          {onTogglePlayed ? (
            <FinoraIconButton
              accessibilityLabel={item.isPlayed ? "Mark as unplayed" : "Mark as played"}
              onPress={() => onTogglePlayed(item)}
              size={48}
              backgroundColor={
                item.isPlayed ? colors.primary : colors.surface
              }
            >
              <Ionicons
                name={item.isPlayed ? "checkmark-circle" : "checkmark-circle-outline"}
                size={22}
                color="#FFFFFF"
              />
            </FinoraIconButton>
          ) : null}

          {onDownload ? (
            <FinoraIconButton
              accessibilityLabel={
                isDownloaded
                  ? "Film téléchargé"
                  : isDownloading
                  ? "Téléchargement en cours"
                  : "Télécharger le film"
              }
              onPress={() => onDownload(item)}
              size={48}
              backgroundColor={
                isDownloaded
                  ? "#2ECC71"
                  : isDownloading
                  ? "rgba(229, 9, 20, 0.25)"
                  : colors.surface
              }
            >
              <Ionicons
                name={
                  isDownloaded
                    ? "cloud-done"
                    : isDownloading
                    ? "hourglass-outline"
                    : "download-outline"
                }
                size={22}
                color={isDownloaded ? "#FFFFFF" : isDownloading ? colors.primary : "#FFFFFF"}
              />
            </FinoraIconButton>
          ) : null}
        </View>

        {/* Tagline */}
        {item.tagline ? (
          <FinoraText variant="body" color="#8E8E9F" style={styles.taglineText}>
            {`"${item.tagline}"`}
          </FinoraText>
        ) : null}

        {/* Overview Synopsis */}
        {item.overview ? (
          <Pressable
            onPress={() => setIsOverviewExpanded(!isOverviewExpanded)}
            style={styles.overviewContainer}
          >
            <FinoraText
              variant="body"
              numberOfLines={isOverviewExpanded ? undefined : 3}
              style={styles.overviewText}
            >
              {item.overview}
            </FinoraText>
            {item.overview.length > 150 ? (
              <FinoraText variant="caption" color={colors.primary} style={styles.expandText}>
                {isOverviewExpanded ? "Show Less" : "Read More"}
              </FinoraText>
            ) : null}
          </Pressable>
        ) : null}

        {/* Genres */}
        {item.genres && item.genres.length > 0 ? (
          <View style={styles.genresRow}>
            {item.genres.map((genre, idx) => (
              <View key={`${genre}-${idx}`} style={styles.genreChip}>
                <FinoraText variant="caption" color="#8E8E9F">
                  {genre}
                </FinoraText>
              </View>
            ))}
          </View>
        ) : null}

        {/* Cast & Crew Section */}
        {item.people && item.people.length > 0 ? (
          <CastList people={item.people} serverUrl={serverUrl} />
        ) : null}
      </ScrollView>
    );
  }
);

MovieDetailsView.displayName = "MovieDetailsView";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  contentContainer: {
    paddingBottom: spacing.xl
  },
  headerContainer: {
    width: "100%",
    height: BACKDROP_HEIGHT,
    position: "relative",
    justifyContent: "flex-end"
  },
  backdropImage: {
    ...StyleSheet.absoluteFill
  },
  backdropFallback: {
    backgroundColor: colors.surface
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFill
  },
  topBar: {
    position: "absolute",
    top: 48,
    left: spacing.md,
    zIndex: 10
  },
  backIcon: {
    fontSize: 26,
    lineHeight: 28,
    color: "#FFFFFF",
    marginTop: -2
  },
  headerContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md
  },
  logoImage: {
    width: 220,
    height: 60,
    marginBottom: spacing.xs
  },
  titleText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  badgeText: {
    fontWeight: "600"
  },
  ratingBadge: {
    backgroundColor: "rgba(255, 184, 0, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  ratingText: {
    fontWeight: "700"
  },
  specPill: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  specText: {
    fontSize: 11,
    fontWeight: "600"
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  playButton: {
    flex: 1
  },
  playIcon: {
    fontSize: 14,
    marginRight: 6
  },
  taglineText: {
    fontStyle: "italic",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm
  },
  overviewContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md
  },
  overviewText: {
    lineHeight: 22,
    color: "#D0D0DC"
  },
  expandText: {
    marginTop: 4,
    fontWeight: "600"
  },
  genresRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.md
  },
  genreChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  }
});
