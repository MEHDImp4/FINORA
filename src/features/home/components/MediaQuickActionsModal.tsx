import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MediaItem } from "../../../types/media";
import {
  getMediaPosterUrls,
  getMediaThumbnailUrls
} from "../../../core/repositories/imageUrlBuilder";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";
import { hapticService } from "../../../core/feedback/hapticService";
import { useTranslation } from "../../../i18n";

export interface MediaQuickActionsModalProps {
  visible: boolean;
  item: MediaItem | null;
  serverUrl: string;
  onClose: () => void;
  onPlay?: (item: MediaItem) => void;
  onViewDetails?: (item: MediaItem) => void;
  onTogglePlayed?: (item: MediaItem, played: boolean) => void;
  onRemoveFromResume?: (item: MediaItem) => void;
  onToggleFavorite?: (item: MediaItem) => void;
}

interface ActionRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  title: string;
  description: string;
  onPress: () => void;
  destructive?: boolean;
}

function ActionRow({
  icon,
  iconColor = "#FFFFFF",
  iconBg = "rgba(255, 255, 255, 0.08)",
  title,
  description,
  onPress,
  destructive = false
}: ActionRowProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionRow,
        pressed && styles.actionRowPressed
      ]}
      onPressIn={() => {
        hapticService.selection();
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
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${description}`}
    >
      <Animated.View style={[styles.actionRowInner, { transform: [{ scale: scaleAnim }] }]}>
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>

        <View style={styles.actionTextContainer}>
          <FinoraText
            variant="body"
            weight="600"
            color={destructive ? "error" : "textPrimary"}
            style={styles.actionTitle}
            numberOfLines={1}
          >
            {title}
          </FinoraText>
          <FinoraText
            variant="caption"
            color="textMuted"
            numberOfLines={1}
            style={styles.actionDesc}
          >
            {description}
          </FinoraText>
        </View>

        <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.25)" />
      </Animated.View>
    </Pressable>
  );
}

export function MediaQuickActionsModal({
  visible,
  item,
  serverUrl,
  onClose,
  onPlay,
  onViewDetails,
  onTogglePlayed,
  onRemoveFromResume,
  onToggleFavorite
}: MediaQuickActionsModalProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  if (!item) {
    return null;
  }

  const isEpisode = item.type === "Episode";
  const isSeason = item.type === "Season";
  const isSeries = item.type === "Series";

  const mainTitle = isEpisode && item.seriesName
    ? item.seriesName
    : isSeason && item.seriesName
    ? item.seriesName
    : item.name;

  const subTitle = isEpisode
    ? typeof item.episodeIndex === "number"
      ? typeof item.seasonIndex === "number"
        ? `S${item.seasonIndex}:E${item.episodeIndex} · ${item.name}`
        : `${t("common.episode")} ${item.episodeIndex} · ${item.name}`
      : item.name
    : isSeason
    ? item.name
    : item.year
    ? `${item.year}${item.runtimeMinutes ? ` · ${item.runtimeMinutes}m` : ""}`
    : item.runtimeMinutes
    ? `${item.runtimeMinutes}m`
    : null;

  // Candidate images
  const imageCandidateUrls = isEpisode
    ? getMediaThumbnailUrls(serverUrl, item, 200)
    : getMediaPosterUrls(serverUrl, item, 160);
  const imageUrl = imageCandidateUrls[0] || null;

  const hasProgress = item.playedPercentage > 0 && !item.isPlayed;
  const isPlayed = item.isPlayed;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View
          style={[
            styles.sheetContainer,
            {
              marginTop: Math.max(insets.top + 16, 24),
              marginBottom: Math.max(insets.bottom + 16, 24)
            }
          ]}
        >
          {/* Top Apple Handle */}
          <View style={styles.handle} />

          {/* Media Header Preview */}
          <View style={styles.mediaHeader}>
            <View style={styles.posterContainer}>
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  placeholder={item.blurhash ? { blurhash: item.blurhash } : undefined}
                  style={styles.posterImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={styles.posterFallback}>
                  <Ionicons
                    name={isSeries || isEpisode ? "tv-outline" : "film-outline"}
                    size={24}
                    color={colors.textMuted}
                  />
                </View>
              )}
            </View>

            <View style={styles.headerInfo}>
              <FinoraText
                variant="subtitle"
                weight="700"
                color="textPrimary"
                numberOfLines={1}
                style={styles.mainTitleText}
              >
                {mainTitle}
              </FinoraText>

              {subTitle ? (
                <FinoraText
                  variant="caption"
                  weight="500"
                  color="textMuted"
                  numberOfLines={1}
                  style={styles.subTitleText}
                >
                  {subTitle}
                </FinoraText>
              ) : null}

              {/* Status Badge */}
              <View style={styles.statusBadgeRow}>
                {isPlayed ? (
                  <View style={[styles.statusBadge, styles.statusPlayedBadge]}>
                    <Ionicons name="checkmark-circle" size={12} color="#4ADE80" />
                    <Text style={[styles.statusBadgeText, { color: "#4ADE80" }]}>
                      {t("quickActions.statusPlayed")}
                    </Text>
                  </View>
                ) : hasProgress ? (
                  <View style={[styles.statusBadge, styles.statusProgressBadge]}>
                    <Ionicons name="time" size={12} color="#FF6B6B" />
                    <Text style={[styles.statusBadgeText, { color: "#FF6B6B" }]}>
                      {t("quickActions.statusInProgress", { percent: Math.round(item.playedPercentage) })}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, styles.statusUnplayedBadge]}>
                    <Ionicons name="radio-button-off-outline" size={12} color="rgba(255, 255, 255, 0.5)" />
                    <Text style={[styles.statusBadgeText, { color: "rgba(255, 255, 255, 0.6)" }]}>
                      {t("quickActions.statusUnplayed")}
                    </Text>
                  </View>
                )}

                {item.isFavorite && (
                  <View style={[styles.statusBadge, styles.favoriteBadge]}>
                    <Ionicons name="heart" size={11} color="#E50914" />
                    <Text style={[styles.statusBadgeText, { color: "#E50914" }]}>
                      {t("quickActions.statusFavorite")}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Progress bar preview if currently in progress */}
          {hasProgress && (
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, Math.max(5, item.playedPercentage))}%` }
                ]}
              />
            </View>
          )}

          {/* Glass divider */}
          <View style={styles.divider} />

          {/* Actions List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.actionsContent}
          >
            {/* Mark as Watched / Played */}
            {!isPlayed && onTogglePlayed && (
              <ActionRow
                icon="checkmark-circle-outline"
                iconColor="#4ADE80"
                iconBg="rgba(74, 222, 128, 0.16)"
                title={t("quickActions.markWatched")}
                description={
                  isSeries
                    ? t("quickActions.markWatchedSeriesDesc")
                    : isEpisode
                    ? t("quickActions.markWatchedEpisodeDesc")
                    : t("quickActions.markWatchedMovieDesc")
                }
                onPress={() => {
                  hapticService.impactMedium();
                  onTogglePlayed(item, true);
                  onClose();
                }}
              />
            )}

            {/* Mark as Unwatched / Reset */}
            {(isPlayed || hasProgress) && onTogglePlayed && (
              <ActionRow
                icon="eye-off-outline"
                iconColor="#FBBF24"
                iconBg="rgba(251, 191, 36, 0.16)"
                title={t("quickActions.markUnwatched")}
                description={
                  isSeries
                    ? t("quickActions.markUnwatchedSeriesDesc")
                    : t("quickActions.markUnwatchedDesc")
                }
                onPress={() => {
                  hapticService.impactMedium();
                  onTogglePlayed(item, false);
                  onClose();
                }}
              />
            )}

            {/* Remove from Continue Watching */}
            {(hasProgress || item.playbackPositionTicks > 0) && onRemoveFromResume && (
              <ActionRow
                icon="close-circle-outline"
                iconColor="#FF4D4D"
                iconBg="rgba(255, 77, 77, 0.16)"
                title={t("quickActions.removeFromResume")}
                description={t("quickActions.removeFromResumeDesc")}
                onPress={() => {
                  hapticService.impactMedium();
                  onRemoveFromResume(item);
                  onClose();
                }}
              />
            )}

            {/* Toggle Favorite */}
            {onToggleFavorite && (
              <ActionRow
                icon={item.isFavorite ? "heart-dislike-outline" : "heart-outline"}
                iconColor={item.isFavorite ? "#FF6B6B" : "#FFFFFF"}
                iconBg={
                  item.isFavorite
                    ? "rgba(229, 9, 20, 0.16)"
                    : "rgba(255, 255, 255, 0.08)"
                }
                title={item.isFavorite ? t("quickActions.removeFavorite") : t("quickActions.addFavorite")}
                description={t("quickActions.favoriteSyncDesc")}
                onPress={() => {
                  hapticService.impactMedium();
                  onToggleFavorite(item);
                  onClose();
                }}
              />
            )}

            {/* Play / Resume */}
            {onPlay && (
              <ActionRow
                icon="play-circle-outline"
                iconColor="#FFFFFF"
                iconBg="rgba(229, 9, 20, 0.3)"
                title={hasProgress ? t("quickActions.resume") : t("quickActions.watch")}
                description={
                  hasProgress
                    ? t("quickActions.resumeDesc", { percent: Math.round(item.playedPercentage) })
                    : t("quickActions.watchDesc")
                }
                onPress={() => {
                  hapticService.impactLight();
                  onPlay(item);
                  onClose();
                }}
              />
            )}

            {/* View Details */}
            {onViewDetails && (
              <ActionRow
                icon="information-circle-outline"
                iconColor="#FFFFFF"
                iconBg="rgba(255, 255, 255, 0.08)"
                title={t("quickActions.viewDetails")}
                description={t("quickActions.viewDetailsDesc")}
                onPress={() => {
                  hapticService.impactLight();
                  onViewDetails(item);
                  onClose();
                }}
              />
            )}
          </ScrollView>

          {/* Cancel / Close Button */}
          <View style={styles.footerContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.closeButtonPressed
              ]}
              onPress={() => {
                hapticService.impactLight();
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
            >
              <Text style={styles.closeButtonText}>{t("common.close")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "flex-start",
    alignItems: "center"
  },
  sheetContainer: {
    width: "92%",
    maxWidth: 440,
    maxHeight: "84%",
    backgroundColor: "#14141C",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#262636",
    paddingTop: 12,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 16,
    overflow: "hidden"
  },
  handle: {
    width: 36,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignSelf: "center",
    marginBottom: 14
  },
  mediaHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 12,
    gap: 14
  },
  posterContainer: {
    width: 58,
    height: 82,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#1E1E28",
    borderWidth: 1,
    borderColor: "#2A2A38"
  },
  posterImage: {
    width: "100%",
    height: "100%"
  },
  posterFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  headerInfo: {
    flex: 1,
    justifyContent: "center"
  },
  mainTitleText: {
    fontSize: 17,
    letterSpacing: -0.3,
    marginBottom: 2
  },
  subTitleText: {
    fontSize: 13,
    marginBottom: 6
  },
  statusBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1
  },
  statusPlayedBadge: {
    backgroundColor: "rgba(74, 222, 128, 0.15)",
    borderColor: "rgba(74, 222, 128, 0.35)"
  },
  statusProgressBadge: {
    backgroundColor: "rgba(255, 77, 77, 0.15)",
    borderColor: "rgba(255, 77, 77, 0.35)"
  },
  statusUnplayedBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: "rgba(255, 255, 255, 0.14)"
  },
  favoriteBadge: {
    backgroundColor: "rgba(229, 9, 20, 0.15)",
    borderColor: "rgba(229, 9, 20, 0.35)"
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700"
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginHorizontal: 18,
    marginBottom: 8,
    borderRadius: 2,
    overflow: "hidden"
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2
  },
  divider: {
    height: 1,
    backgroundColor: "#22222E",
    marginHorizontal: 18,
    marginBottom: 8
  },
  actionsContent: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 6
  },
  actionRow: {
    borderRadius: 16,
    overflow: "hidden"
  },
  actionRowPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.05)"
  },
  actionRowInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)"
  },
  actionTextContainer: {
    flex: 1
  },
  actionTitle: {
    fontSize: 14,
    marginBottom: 2
  },
  actionDesc: {
    fontSize: 11
  },
  footerContainer: {
    paddingHorizontal: 16,
    paddingTop: 10
  },
  closeButton: {
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    justifyContent: "center",
    alignItems: "center"
  },
  closeButtonPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.14)"
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2
  }
});
