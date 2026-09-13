import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
  ActivityIndicator,
  Animated
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { MediaItem } from "../../../types/media";
import { getBackdropUrl, getPosterUrl } from "../../../core/repositories/imageUrlBuilder";
import { mediaRepository } from "../../../core/repositories/mediaRepository";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { FinoraButton } from "../../../design-system/components/FinoraButton";
import { colors, spacing } from "../../../design-system/tokens";
import { hapticService } from "../../../core/feedback/hapticService";

export interface CollectionDetailsViewProps {
  collection: MediaItem;
  serverUrl: string;
  userId?: string;
  onBack: () => void;
  onPlayItem: (item: MediaItem) => void;
  onSelectItem: (item: MediaItem) => void;
  onToggleFavorite?: (item: MediaItem) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BACKDROP_HEIGHT = Math.round(SCREEN_WIDTH * 0.72);

function CollectionMovieRow({
  item,
  serverUrl,
  index,
  onPlay,
  onSelect
}: {
  item: MediaItem;
  serverUrl: string;
  index: number;
  onPlay: (item: MediaItem) => void;
  onSelect: (item: MediaItem) => void;
}) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const posterUri = item.primaryImageTag
    ? getPosterUrl(serverUrl, item.id, item.primaryImageTag, 200)
    : null;

  const formatRuntime = (mins?: number): string | null => {
    if (!mins || mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const runtimeStr = formatRuntime(item.runtimeMinutes);

  return (
    <Pressable
      style={styles.movieCardPressable}
      onPressIn={() => {
        hapticService.impactLight();
        Animated.spring(scaleAnim, {
          toValue: 0.97,
          useNativeDriver: true,
          friction: 6
        }).start();
      }}
      onPressOut={() => {
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6
        }).start();
      }}
      onPress={() => onSelect(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, film ${index + 1}`}
    >
      <Animated.View style={[styles.movieCard, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.movieIndexBadge}>
          <FinoraText variant="caption" color="textSecondary" weight="700">
            {index + 1}
          </FinoraText>
        </View>

        <View style={styles.moviePosterContainer}>
          {posterUri ? (
            <Image
              source={{ uri: posterUri }}
              style={styles.moviePoster}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.moviePosterFallback}>
              <Ionicons name="film-outline" size={24} color={colors.textMuted} />
            </View>
          )}
        </View>

        <View style={styles.movieInfo}>
          <FinoraText variant="body" color="textPrimary" weight="700" numberOfLines={2}>
            {item.name}
          </FinoraText>

          <View style={styles.movieMetaRow}>
            {item.year ? (
              <FinoraText variant="caption" color="textSecondary">
                {item.year}
              </FinoraText>
            ) : null}
            {runtimeStr ? (
              <FinoraText variant="caption" color="textSecondary">
                {item.year ? " · " : ""}{runtimeStr}
              </FinoraText>
            ) : null}
          </View>

          {item.overview ? (
            <FinoraText variant="caption" color="textMuted" numberOfLines={2} style={styles.movieOverview}>
              {item.overview}
            </FinoraText>
          ) : null}
        </View>

        <Pressable
          style={styles.moviePlayButton}
          onPress={(e) => {
            e.stopPropagation();
            hapticService.impactMedium();
            onPlay(item);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Lire ${item.name}`}
          hitSlop={8}
        >
          <Ionicons name="play" size={18} color="#FFFFFF" />
        </Pressable>
      </Animated.View>
    </Pressable>
  );
}

export const CollectionDetailsView: React.FC<CollectionDetailsViewProps> = React.memo(
  ({
    collection,
    serverUrl,
    userId,
    onBack,
    onPlayItem,
    onSelectItem,
    onToggleFavorite
  }) => {
    const insets = useSafeAreaInsets();
    const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);

    const { data: collectionItems = [], isLoading } = useQuery({
      queryKey: ["collectionItems", userId, collection.id],
      queryFn: () =>
        mediaRepository.getItems(userId!, {
          parentId: collection.id,
          includeItemTypes: ["Movie", "Series"],
          sortBy: "PremiereDate,ProductionYear,SortName",
          sortOrder: "Ascending"
        }),
      enabled: Boolean(userId && collection.id)
    });

    const backdropUri = collection.backdropImageTag
      ? getBackdropUrl(serverUrl, collection.id, collection.backdropImageTag, 1080)
      : null;

    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Backdrop Header */}
          <View style={styles.backdropContainer}>
            {backdropUri ? (
              <Image
                source={{ uri: backdropUri }}
                style={styles.backdropImage}
                contentFit="cover"
                transition={300}
              />
            ) : (
              <View style={styles.backdropFallback} />
            )}

            <LinearGradient
              colors={["rgba(10, 10, 12, 0.4)", "rgba(10, 10, 12, 0.8)", "#0A0A0C"]}
              style={styles.backdropGradient}
            />

            {/* Navigation top bar buttons */}
            <View style={[styles.topBar, { top: Math.max(insets.top, 12) }]}>
              <Pressable
                style={styles.circleButton}
                onPress={() => {
                  hapticService.selection();
                  onBack();
                }}
                accessibilityRole="button"
                accessibilityLabel="Retour"
              >
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </Pressable>

              {onToggleFavorite ? (
                <Pressable
                  style={styles.circleButton}
                  onPress={() => {
                    hapticService.selection();
                    onToggleFavorite(collection);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Ajouter aux favoris"
                >
                  <Ionicons
                    name={collection.isFavorite ? "heart" : "heart-outline"}
                    size={20}
                    color={collection.isFavorite ? "#E50914" : "#FFFFFF"}
                  />
                </Pressable>
              ) : null}
            </View>

            {/* Title & Tag inside Backdrop header */}
            <View style={styles.headerInfo}>
              <View style={styles.collectionBadge}>
                <Ionicons name="albums" size={12} color="#FFFFFF" style={{ marginRight: 5 }} />
                <FinoraText variant="caption" color="textPrimary" weight="700">
                  COLLECTION SAGA
                </FinoraText>
              </View>

              <FinoraText variant="title" color="textPrimary" weight="800" style={styles.collectionTitle}>
                {collection.name}
              </FinoraText>

              <FinoraText variant="caption" color="textSecondary" weight="600" style={styles.itemCountText}>
                {collectionItems.length > 0
                  ? `${collectionItems.length} titre${collectionItems.length > 1 ? "s" : ""}`
                  : "Collection"}
              </FinoraText>
            </View>
          </View>

          {/* Overview / Description */}
          {collection.overview ? (
            <Pressable
              style={styles.overviewSection}
              onPress={() => setIsOverviewExpanded((prev) => !prev)}
            >
              <FinoraText
                variant="body"
                color="textSecondary"
                numberOfLines={isOverviewExpanded ? undefined : 3}
                style={styles.overviewText}
              >
                {collection.overview}
              </FinoraText>
              {collection.overview.length > 140 ? (
                <FinoraText variant="caption" color="primary" weight="600" style={{ marginTop: 4 }}>
                  {isOverviewExpanded ? "Voir moins" : "Lire la suite"}
                </FinoraText>
              ) : null}
            </Pressable>
          ) : null}

          {/* Quick Play First Item button */}
          {collectionItems.length > 0 ? (
            <View style={styles.primaryActionRow}>
              <FinoraButton
                label={`Commencer (${collectionItems[0].name})`}
                variant="primary"
                size="md"
                leftIcon={<Ionicons name="play" size={16} color="#FFFFFF" />}
                onPress={() => onPlayItem(collectionItems[0])}
                style={styles.startCollectionButton}
              />
            </View>
          ) : null}

          {/* Section: Films dans cette collection */}
          <View style={styles.sectionHeader}>
            <FinoraText variant="title" color="textPrimary" weight="700" style={styles.sectionTitle}>
              Œuvres de la collection
            </FinoraText>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <FinoraText variant="caption" color="textSecondary" style={{ marginTop: spacing.sm }}>
                Chargement des œuvres...
              </FinoraText>
            </View>
          ) : collectionItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FinoraText variant="caption" color="textMuted">
                Aucun média trouvé dans cette collection.
              </FinoraText>
            </View>
          ) : (
            <View style={styles.moviesList}>
              {collectionItems.map((item, idx) => (
                <CollectionMovieRow
                  key={item.id}
                  item={item}
                  serverUrl={serverUrl}
                  index={idx}
                  onPlay={onPlayItem}
                  onSelect={onSelectItem}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0C"
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1
  },
  backdropContainer: {
    width: SCREEN_WIDTH,
    height: BACKDROP_HEIGHT,
    position: "relative",
    justifyContent: "flex-end"
  },
  backdropImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  backdropFallback: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#161622"
  },
  backdropGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  topBar: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)"
  },
  headerInfo: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    zIndex: 2
  },
  collectionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: spacing.xs
  },
  collectionTitle: {
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.5,
    marginBottom: 4
  },
  itemCountText: {
    color: colors.textSecondary
  },
  overviewSection: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm
  },
  overviewText: {
    lineHeight: 20
  },
  primaryActionRow: {
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs
  },
  startCollectionButton: {
    width: "100%"
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs
  },
  sectionTitle: {
    fontSize: 18
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: "center"
  },
  emptyContainer: {
    padding: spacing.lg,
    alignItems: "center"
  },
  moviesList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm
  },
  movieCardPressable: {
    borderRadius: 12
  },
  movieCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)"
  },
  movieIndexBadge: {
    width: 22,
    alignItems: "center",
    marginRight: 8
  },
  moviePosterContainer: {
    width: 54,
    height: 81,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#161622",
    marginRight: 12
  },
  moviePoster: {
    width: "100%",
    height: "100%"
  },
  moviePosterFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  movieInfo: {
    flex: 1,
    marginRight: 10
  },
  movieMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3
  },
  movieOverview: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 15
  },
  moviePlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(229, 9, 20, 0.9)",
    justifyContent: "center",
    alignItems: "center"
  }
});
