import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
  NativeScrollEvent,
  NativeSyntheticEvent
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
import { ShimmerSkeleton } from "../../../design-system/components/ShimmerSkeleton";
import { EpisodeListSkeleton } from "../../../design-system/components/EpisodeSkeleton";
import { colors, spacing } from "../../../design-system/tokens";
import { useSeasons, useEpisodes } from "../../../hooks/useMediaQueries";
import { SeasonPicker } from "./SeasonPicker";
import { EpisodeCard } from "./EpisodeCard";
import { CastList } from "./CastList";
import { DownloadSeriesModal } from "./DownloadSeriesModal";
import { DownloadQualityModal } from "./DownloadQualityModal";
import { DownloadQuality } from "../../offline/downloadQuality";
import { hapticService } from "../../../core/feedback/hapticService";
import { MediaCarousel } from "../../home/components/MediaCarousel";
import { useSimilarItems } from "../../../hooks/useMediaQueries";
import { MediaQuickActionsModal } from "../../home/components/MediaQuickActionsModal";
import { usePlaybackPreferencesStore } from "../../../stores/playbackPreferencesStore";
import { useTranslation } from "../../../i18n";

export interface SeriesDetailsViewProps {
  series: MediaItem;
  serverUrl: string;
  userId: string;
  onPlayEpisode: (episode: MediaItem) => void;
  onBack: () => void;
  onSelectSimilar?: (item: MediaItem) => void;
  onToggleFavorite?: (item: MediaItem) => void;
  onTogglePlayed?: (item: MediaItem, played: boolean) => void;
  onRemoveFromResume?: (item: MediaItem) => void;
  onDownloadEpisodes?: (episodes: MediaItem[], quality: DownloadQuality) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BACKDROP_HEIGHT = Math.round(SCREEN_WIDTH * 0.72);
const EPISODES_PAGE_SIZE = 10;
const LOAD_MORE_THRESHOLD_PX = 600;

export const SeriesDetailsView: React.FC<SeriesDetailsViewProps> = React.memo(
  ({
    series,
    serverUrl,
    userId,
    onPlayEpisode,
    onBack,
    onSelectSimilar,
    onToggleFavorite,
    onTogglePlayed,
    onRemoveFromResume,
    onDownloadEpisodes
  }) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const [selectedEpisodeForDownload, setSelectedEpisodeForDownload] =
      useState<MediaItem | null>(null);
    const [actionItem, setActionItem] = useState<MediaItem | null>(null);

    const defaultDownloadQuality =
      usePlaybackPreferencesStore((s) => s.preferences.defaultDownloadQuality) || "1080p";

    const handleTogglePlayedAction = React.useCallback(
      (item: MediaItem, played: boolean) => {
        if (onTogglePlayed) {
          onTogglePlayed(item, played);
        }
      },
      [onTogglePlayed]
    );

    const handleRemoveFromResumeAction = React.useCallback(
      (item: MediaItem) => {
        if (onRemoveFromResume) {
          onRemoveFromResume(item);
        }
      },
      [onRemoveFromResume]
    );

    const { data: similarItems = [] } = useSimilarItems(userId, series.id, 12);

    const { data: seasons = [], isLoading: isLoadingSeasons } = useSeasons(
      series.id,
      userId
    );

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

    const [visibleEpisodeCount, setVisibleEpisodeCount] = useState(EPISODES_PAGE_SIZE);
    const isLoadingMoreRef = useRef(false);

    useEffect(() => {
      setVisibleEpisodeCount(EPISODES_PAGE_SIZE);
      isLoadingMoreRef.current = false;
    }, [selectedSeasonId]);

    useEffect(() => {
      isLoadingMoreRef.current = false;
    }, [visibleEpisodeCount]);

    const visibleEpisodes = useMemo(
      () => episodes.slice(0, visibleEpisodeCount),
      [episodes, visibleEpisodeCount]
    );

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (isLoadingMoreRef.current || visibleEpisodeCount >= episodes.length) return;

      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      if (distanceFromBottom > LOAD_MORE_THRESHOLD_PX) return;

      isLoadingMoreRef.current = true;
      setVisibleEpisodeCount((count) =>
        Math.min(episodes.length, count + EPISODES_PAGE_SIZE)
      );
    };

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
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
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

          <View style={[styles.topBar, { top: Math.max(insets.top, 16) + 8 }]}>
            <FinoraIconButton
              accessibilityLabel={t("common.back")}
              onPress={onBack}
              size={40}
              backgroundColor="rgba(10, 10, 12, 0.6)"
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </FinoraIconButton>
          </View>

          <View style={styles.headerContent}>
            {logoUri ? (
              <Image
                source={{ uri: logoUri }}
                style={styles.logoImage}
                contentFit="contain"
                transition={200}
                cachePolicy="memory-disk"
                accessibilityLabel={series.name}
              />
            ) : (
              <FinoraText variant="title" style={styles.titleText}>
                {series.name}
              </FinoraText>
            )}
          </View>
        </View>

        <View style={styles.metadataRow}>
          {series.year ? (
            <FinoraText variant="caption" color="textSecondary" style={styles.badgeText}>
              {series.year}
            </FinoraText>
          ) : null}

          {seasons.length > 0 ? (
            <FinoraText variant="caption" color="textSecondary" style={styles.badgeText}>
              {t("details.seasonCount", { count: seasons.length, plural: seasons.length > 1 ? "s" : "" })}
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
              <FinoraText variant="caption" color="textSecondary" style={styles.specText}>
                {series.officialRating}
              </FinoraText>
            </View>
          ) : null}
        </View>

        <View style={styles.actionRow}>
          <FinoraButton
            label={
              nextEpisodeToPlay
                ? typeof nextEpisodeToPlay.episodeIndex === "number"
                  ? t("details.playEpisodeSpecific", {
                      season: nextEpisodeToPlay.seasonIndex ?? 1,
                      episode: nextEpisodeToPlay.episodeIndex
                    })
                  : t("details.playNextEpisode")
                : t("details.play")
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
              accessibilityLabel={series.isFavorite ? t("details.removeFromMyList") : t("details.addToMyList")}
              onPress={() => onToggleFavorite(series)}
              size={48}
              backgroundColor={series.isFavorite ? colors.primary : colors.surface}
            >
              <Ionicons
                name={series.isFavorite ? "bookmark" : "bookmark-outline"}
                size={22}
                color="#FFFFFF"
              />
            </FinoraIconButton>
          ) : null}

          <FinoraIconButton
            accessibilityLabel={t("details.downloadSeries")}
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

        {series.overview ? (
          <Pressable
            onPress={() => setIsOverviewExpanded(!isOverviewExpanded)}
            style={styles.overviewContainer}
            accessibilityRole="button"
            accessibilityLabel={isOverviewExpanded ? t("common.seeLess") : t("common.seeMore")}
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
                {isOverviewExpanded ? t("common.seeLess") : t("common.seeMore")}
              </FinoraText>
            ) : null}
          </Pressable>
        ) : null}

        {isLoadingSeasons ? (
          <View style={styles.seasonSkeletonRow}>
            {[0, 1, 2].map((index) => (
              <ShimmerSkeleton key={index} width={96} height={32} borderRadius={16} />
            ))}
          </View>
        ) : (
          <SeasonPicker
            seasons={seasons}
            selectedSeasonId={selectedSeasonId}
            onSelectSeason={setSelectedSeasonId}
          />
        )}

        <View style={styles.episodesSection}>
          <FinoraText variant="title" style={styles.sectionTitle}>
            {t("details.episodes")}
          </FinoraText>
          {isLoadingEpisodes ? (
            <EpisodeListSkeleton count={6} />
          ) : episodes.length > 0 ? (
            visibleEpisodes.map((ep) => (
              <EpisodeCard
                key={ep.id}
                episode={ep}
                serverUrl={serverUrl}
                onPlay={onPlayEpisode}
                onLongPress={(episode) => {
                  hapticService.impactMedium();
                  setActionItem(episode);
                }}
                onDownload={(episode) => {
                  hapticService.impactMedium();
                  if (onDownloadEpisodes) {
                    onDownloadEpisodes([episode], defaultDownloadQuality);
                  }
                }}
                onLongPressDownload={(episode) => {
                  hapticService.impactHeavy();
                  setSelectedEpisodeForDownload(episode);
                }}
              />
            ))
          ) : (
            <FinoraText variant="caption" color="textMuted" style={styles.emptyText}>
              {t("details.noEpisodesForSeason")}
            </FinoraText>
          )}
        </View>

        {series.people && series.people.length > 0 ? (
          <CastList people={series.people} serverUrl={serverUrl} />
        ) : null}

        {similarItems && similarItems.length > 0 ? (
          <View style={{ marginTop: spacing.md }}>
            <MediaCarousel
              title={t("details.similar")}
              items={similarItems}
              serverUrl={serverUrl}
              variant="poster"
              onItemPress={onSelectSimilar}
              onItemLongPress={(item) => {
                setActionItem(item);
              }}
            />
          </View>
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

        {selectedEpisodeForDownload && (
          <DownloadQualityModal
            visible={!!selectedEpisodeForDownload}
            onClose={() => setSelectedEpisodeForDownload(null)}
            item={selectedEpisodeForDownload}
            onConfirmDownload={(quality) => {
              if (onDownloadEpisodes && selectedEpisodeForDownload) {
                onDownloadEpisodes([selectedEpisodeForDownload], quality);
              }
              setSelectedEpisodeForDownload(null);
            }}
          />
        )}

        <MediaQuickActionsModal
          visible={!!actionItem}
          item={actionItem}
          serverUrl={serverUrl}
          onClose={() => setActionItem(null)}
          onPlay={(item) => {
            if (item.type === "Episode") {
              onPlayEpisode(item);
            } else if (onSelectSimilar) {
              onSelectSimilar(item);
            }
          }}
          onViewDetails={(item) => {
            if (onSelectSimilar) {
              onSelectSimilar(item);
            }
          }}
          onTogglePlayed={handleTogglePlayedAction}
          onRemoveFromResume={handleRemoveFromResumeAction}
          onToggleFavorite={onToggleFavorite}
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
    flexDirection: "row",
    alignItems: "center",
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
    flex: 1,
    minWidth: 0
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
  seasonSkeletonRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
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
