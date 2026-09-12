import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
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
import { useSeasons, useEpisodes } from "../../../hooks/useMediaQueries";
import { SeasonPicker } from "./SeasonPicker";
import { EpisodeCard } from "./EpisodeCard";
import { CastList } from "./CastList";
import { DownloadSeriesModal } from "./DownloadSeriesModal";
import { DownloadQuality } from "../../offline/downloadQuality";
import { hapticService } from "../../../core/feedback/hapticService";

export interface SeriesDetailsViewProps {
  series: MediaItem;
  serverUrl: string;
  userId: string;
  onPlayEpisode: (episode: MediaItem) => void;
  onBack: () => void;
  onToggleFavorite?: (item: MediaItem) => void;
  onDownloadEpisodes?: (episodes: MediaItem[], quality: DownloadQuality) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BACKDROP_HEIGHT = Math.round(SCREEN_WIDTH * 0.72);

export const SeriesDetailsView: React.FC<SeriesDetailsViewProps> = React.memo(
  ({
    series,
    serverUrl,
    userId,
    onPlayEpisode,
    onBack,
    onToggleFavorite,
    onDownloadEpisodes
  }) => {
    const insets = useSafeAreaInsets();
    const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

    const { data: seasons = [], isLoading: isLoadingSeasons } = useSeasons(
      series.id,
      userId
    );

    // Default to the first season when loaded if not yet set
    useEffect(() => {
      if (seasons.length > 0 && !selectedSeasonId) {
        setSelectedSeasonId(seasons[0].id);
      }
    }, [seasons, selectedSeasonId]);

    const { data: episodes = [], isLoading: isLoadingEpisodes } = useEpisodes(
      series.id,
      selectedSeasonId,
      userId
    );

    // Compute next episode to play: first unplayed episode or episode 1
    const nextEpisodeToPlay = useMemo(() => {
      if (episodes.length === 0) return null;
      const unplayed = episodes.find((ep) => !ep.isPlayed);
      return unplayed || episodes[0];
    }, [episodes]);

    const backdropUri = series.backdropImageTag
      ? getBackdropUrl(serverUrl, series.id, series.backdropImageTag, 1080)
      : null;

    const logoUri = series.logoImageTag
      ? getLogoUrl(serverUrl, series.id, series.logoImageTag, 400)
      : null;

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
              placeholder={series.blurhash}
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
                {series.name}
              </FinoraText>
            )}
          </View>
        </View>

        {/* Metadata Badges */}
        <View style={styles.metadataRow}>
          {series.year ? (
            <FinoraText variant="caption" color="#8E8E9F" style={styles.badgeText}>
              {series.year}
            </FinoraText>
          ) : null}

          {seasons.length > 0 ? (
            <FinoraText variant="caption" color="#8E8E9F" style={styles.badgeText}>
              {`${seasons.length} Season${seasons.length > 1 ? "s" : ""}`}
            </FinoraText>
          ) : null}

          {series.communityRating ? (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={11} color={colors.accent} style={{ marginRight: 3 }} />
              <FinoraText variant="caption" color={colors.accent} style={styles.ratingText}>
                {series.communityRating}
              </FinoraText>
            </View>
          ) : null}

          {series.officialRating ? (
            <View style={styles.specPill}>
              <FinoraText variant="caption" color="#8E8E9F" style={styles.specText}>
                {series.officialRating}
              </FinoraText>
            </View>
          ) : null}
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionRow}>
          <FinoraButton
            label={
              nextEpisodeToPlay
                ? typeof nextEpisodeToPlay.episodeIndex === "number"
                  ? `Play S${nextEpisodeToPlay.seasonIndex ?? 1}:E${nextEpisodeToPlay.episodeIndex}`
                  : "Play Next Episode"
                : "Play"
            }
            variant="primary"
            size="lg"
            style={styles.playButton}
            onPress={() => {
              if (nextEpisodeToPlay) {
                onPlayEpisode(nextEpisodeToPlay);
              }
            }}
            disabled={!nextEpisodeToPlay}
            leftIcon={<Ionicons name="play" size={20} color="#FFFFFF" />}
          />

          {onToggleFavorite ? (
            <FinoraIconButton
              accessibilityLabel={series.isFavorite ? "Remove from watchlist" : "Add to watchlist"}
              onPress={() => onToggleFavorite(series)}
              size={48}
              backgroundColor={
                series.isFavorite ? colors.primary : colors.surface
              }
            >
              <Ionicons
                name={series.isFavorite ? "bookmark" : "bookmark-outline"}
                size={22}
                color="#FFFFFF"
              />
            </FinoraIconButton>
          ) : null}

          <FinoraIconButton
            accessibilityLabel="Télécharger la série"
            onPress={() => {
              hapticService.impactLight();
              setIsDownloadModalOpen(true);
            }}
            size={48}
            backgroundColor={colors.surface}
          >
            <Ionicons name="download-outline" size={22} color="#FFFFFF" />
          </FinoraIconButton>
        </View>

        {/* Overview Synopsis */}
        {series.overview ? (
          <Pressable
            onPress={() => setIsOverviewExpanded(!isOverviewExpanded)}
            style={styles.overviewContainer}
          >
            <FinoraText
              variant="body"
              numberOfLines={isOverviewExpanded ? undefined : 3}
              style={styles.overviewText}
            >
              {series.overview}
            </FinoraText>
            {series.overview.length > 150 ? (
              <FinoraText variant="caption" color={colors.primary} style={styles.expandText}>
                {isOverviewExpanded ? "Show Less" : "Read More"}
              </FinoraText>
            ) : null}
          </Pressable>
        ) : null}

        {/* Season Picker Tabs */}
        {isLoadingSeasons ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
        ) : (
          <SeasonPicker
            seasons={seasons}
            selectedSeasonId={selectedSeasonId}
            onSelectSeason={setSelectedSeasonId}
          />
        )}

        {/* Episode Cards List */}
        <View style={styles.episodesSection}>
          <FinoraText variant="title" style={styles.sectionTitle}>
            Episodes
          </FinoraText>
          {isLoadingEpisodes ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
          ) : episodes.length > 0 ? (
            episodes.map((ep) => (
              <EpisodeCard
                key={ep.id}
                episode={ep}
                serverUrl={serverUrl}
                onPlay={onPlayEpisode}
              />
            ))
          ) : (
            <FinoraText variant="caption" color={colors.textMuted} style={styles.emptyText}>
              No episodes found for this season.
            </FinoraText>
          )}
        </View>

        {/* Cast List */}
        {series.people && series.people.length > 0 ? (
          <CastList people={series.people} serverUrl={serverUrl} />
        ) : null}

        <DownloadSeriesModal
          visible={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          series={series}
          seasons={seasons}
          userId={userId}
          onConfirmDownload={(episodes, quality) => {
            if (onDownloadEpisodes) {
              onDownloadEpisodes(episodes, quality);
            }
          }}
        />
      </ScrollView>
    );
  }
);

SeriesDetailsView.displayName = "SeriesDetailsView";

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
  loader: {
    marginVertical: spacing.md
  },
  episodesSection: {
    marginTop: spacing.md
  },
  sectionTitle: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm
  },
  emptyText: {
    paddingHorizontal: spacing.md,
    fontStyle: "italic"
  }
});
