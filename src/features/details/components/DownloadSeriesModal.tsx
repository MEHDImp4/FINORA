import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MediaItem } from "../../../types/media";
import { mediaRepository } from "../../../core/repositories/mediaRepository";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { FinoraButton } from "../../../design-system/components/FinoraButton";
import { colors, spacing } from "../../../design-system/tokens";
import { hapticService } from "../../../core/feedback/hapticService";
import {
  DownloadQuality,
  DOWNLOAD_QUALITIES
} from "../../offline/downloadQuality";
import { usePlaybackPreferencesStore } from "../../../stores/playbackPreferencesStore";

export interface DownloadSeriesModalProps {
  visible: boolean;
  onClose: () => void;
  series: MediaItem;
  seasons: MediaItem[];
  userId: string;
  onConfirmDownload: (episodes: MediaItem[], quality: DownloadQuality) => void;
}

type SelectionMode = "seasons" | "count";

export const DownloadSeriesModal: React.FC<DownloadSeriesModalProps> = ({
  visible,
  onClose,
  series,
  seasons,
  userId,
  onConfirmDownload
}) => {
  const defaultDownloadQuality =
    usePlaybackPreferencesStore((s) => s.preferences.defaultDownloadQuality) || "original";
  const [mode, setMode] = useState<SelectionMode>("seasons");
  const [selectedQuality, setSelectedQuality] = useState<DownloadQuality>(defaultDownloadQuality);

  useEffect(() => {
    if (visible) {
      setSelectedQuality(defaultDownloadQuality);
    }
  }, [visible, defaultDownloadQuality]);
  const [selectedSeasonIds, setSelectedSeasonIds] = useState<Set<string>>(new Set());
  const [episodeCountLimit, setEpisodeCountLimit] = useState<number>(3);
  const [allEpisodes, setAllEpisodes] = useState<MediaItem[]>([]);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);

  // Load all episodes for the series when modal opens
  useEffect(() => {
    let isMounted = true;
    if (visible && series.id && userId) {
      setIsLoadingEpisodes(true);
      mediaRepository
        .getEpisodes(userId, series.id)
        .then((eps) => {
          if (isMounted) {
            setAllEpisodes(eps);
            setIsLoadingEpisodes(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setIsLoadingEpisodes(false);
          }
        });

      // Default select all seasons initially
      if (seasons.length > 0) {
        setSelectedSeasonIds(new Set(seasons.map((s) => s.id)));
      }
    }
    return () => {
      isMounted = false;
    };
  }, [visible, series.id, seasons, userId]);

  // Group unplayed episodes per season
  const episodesBySeason = useMemo(() => {
    const map = new Map<string, { total: MediaItem[]; unplayed: MediaItem[] }>();
    seasons.forEach((season) => {
      map.set(season.id, { total: [], unplayed: [] });
    });

    allEpisodes.forEach((ep) => {
      const seasonId = ep.seasonId || "";
      const group = map.get(seasonId);
      if (group) {
        group.total.push(ep);
        if (!ep.isPlayed) {
          group.unplayed.push(ep);
        }
      } else {
        // If not in known season map, register dynamically
        const unplayed = !ep.isPlayed ? [ep] : [];
        map.set(seasonId, { total: [ep], unplayed });
      }
    });

    return map;
  }, [seasons, allEpisodes]);

  // Chronologically sorted list of unplayed episodes across the whole series
  const allUnplayedEpisodes = useMemo(() => {
    return allEpisodes
      .filter((ep) => !ep.isPlayed)
      .sort((a, b) => {
        const seasonA = a.seasonIndex ?? 0;
        const seasonB = b.seasonIndex ?? 0;
        if (seasonA !== seasonB) return seasonA - seasonB;
        return (a.episodeIndex ?? 0) - (b.episodeIndex ?? 0);
      });
  }, [allEpisodes]);

  // Selected episodes based on current mode (STRICTLY non-visionnés)
  const episodesToDownload = useMemo(() => {
    if (mode === "seasons") {
      const result: MediaItem[] = [];
      selectedSeasonIds.forEach((sId) => {
        const group = episodesBySeason.get(sId);
        if (group) {
          result.push(...group.unplayed);
        }
      });
      return result;
    } else {
      // mode === 'count'
      if (episodeCountLimit === 0) {
        return allUnplayedEpisodes;
      }
      return allUnplayedEpisodes.slice(0, episodeCountLimit);
    }
  }, [mode, selectedSeasonIds, episodesBySeason, episodeCountLimit, allUnplayedEpisodes]);

  const toggleSeasonSelection = (seasonId: string) => {
    hapticService.selection();
    setSelectedSeasonIds((prev) => {
      const next = new Set(prev);
      if (next.has(seasonId)) {
        next.delete(seasonId);
      } else {
        next.add(seasonId);
      }
      return next;
    });
  };

  const selectAllSeasons = () => {
    hapticService.selection();
    setSelectedSeasonIds(new Set(seasons.map((s) => s.id)));
  };

  const clearSeasonSelection = () => {
    hapticService.selection();
    setSelectedSeasonIds(new Set());
  };

  const handleConfirm = () => {
    if (episodesToDownload.length === 0) return;
    hapticService.impactMedium();
    onConfirmDownload(episodesToDownload, selectedQuality);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />

        <View style={styles.dialogContainer} testID="download-series-modal">
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <FinoraText variant="title" style={styles.title}>
                Télécharger la série
              </FinoraText>
              <FinoraText variant="caption" style={styles.subtitle} numberOfLines={1}>
                {series.name}
              </FinoraText>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={styles.tabsContainer}>
            <Pressable
              style={[styles.tabButton, mode === "seasons" && styles.activeTabButton]}
              onPress={() => {
                hapticService.selection();
                setMode("seasons");
              }}
            >
              <Ionicons
                name="albums-outline"
                size={16}
                color={mode === "seasons" ? "#FFFFFF" : colors.textSecondary}
              />
              <FinoraText
                variant="body"
                style={[styles.tabText, mode === "seasons" && styles.activeTabText]}
              >
                Par saisons
              </FinoraText>
            </Pressable>

            <Pressable
              style={[styles.tabButton, mode === "count" && styles.activeTabButton]}
              onPress={() => {
                hapticService.selection();
                setMode("count");
              }}
            >
              <Ionicons
                name="list-outline"
                size={16}
                color={mode === "count" ? "#FFFFFF" : colors.textSecondary}
              />
              <FinoraText
                variant="body"
                style={[styles.tabText, mode === "count" && styles.activeTabText]}
              >
                Nombre d'épisodes
              </FinoraText>
            </Pressable>
          </View>

          {/* Content Area */}
          {isLoadingEpisodes ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <FinoraText variant="caption" style={styles.loadingText}>
                Vérification des épisodes non visionnés...
              </FinoraText>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollContent}
              contentContainerStyle={{ paddingBottom: spacing.sm }}
              showsVerticalScrollIndicator={false}
            >
              {mode === "seasons" ? (
                <View>
                  <View style={styles.seasonActionsBar}>
                    <Pressable onPress={selectAllSeasons} hitSlop={6}>
                      <FinoraText variant="caption" color={colors.primary}>
                        Tout sélectionner
                      </FinoraText>
                    </Pressable>
                    <Pressable onPress={clearSeasonSelection} hitSlop={6}>
                      <FinoraText variant="caption" color={colors.textSecondary}>
                        Tout désélectionner
                      </FinoraText>
                    </Pressable>
                  </View>

                  {seasons.map((season) => {
                    const stats = episodesBySeason.get(season.id) || {
                      total: [],
                      unplayed: []
                    };
                    const isSelected = selectedSeasonIds.has(season.id);
                    const allWatched = stats.total.length > 0 && stats.unplayed.length === 0;

                    return (
                      <Pressable
                        key={season.id}
                        style={[
                          styles.seasonRow,
                          isSelected && styles.seasonRowSelected,
                          allWatched && styles.seasonRowDisabled
                        ]}
                        onPress={() => !allWatched && toggleSeasonSelection(season.id)}
                        disabled={allWatched}
                      >
                        <View style={styles.seasonInfo}>
                          <FinoraText variant="body" style={styles.seasonName}>
                            {season.name}
                          </FinoraText>
                          <FinoraText variant="caption" style={styles.seasonCount}>
                            {allWatched
                              ? "Tous les épisodes ont été visionnés"
                              : `${stats.unplayed.length} non visionné${
                                  stats.unplayed.length > 1 ? "s" : ""
                                } sur ${stats.total.length || 0}`}
                          </FinoraText>
                        </View>

                        <Ionicons
                          name={
                            allWatched
                              ? "checkmark-circle"
                              : isSelected
                              ? "checkbox"
                              : "square-outline"
                          }
                          size={24}
                          color={
                            allWatched
                              ? "#2ECC71"
                              : isSelected
                              ? colors.primary
                              : colors.textSecondary
                          }
                        />
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.countModeContainer}>
                  <FinoraText variant="caption" style={styles.countHelperText}>
                    Choisissez combien de prochains épisodes non visionnés télécharger :
                  </FinoraText>

                  <View style={styles.countOptionsGrid}>
                    {[
                      { label: "3 épisodes", value: 3 },
                      { label: "5 épisodes", value: 5 },
                      { label: "10 épisodes", value: 10 },
                      {
                        label: `Tous les non vus (${allUnplayedEpisodes.length})`,
                        value: 0
                      }
                    ].map((opt) => {
                      const isChosen = episodeCountLimit === opt.value;
                      return (
                        <Pressable
                          key={opt.label}
                          style={[
                            styles.countChip,
                            isChosen && styles.countChipActive
                          ]}
                          onPress={() => {
                            hapticService.selection();
                            setEpisodeCountLimit(opt.value);
                          }}
                        >
                          <FinoraText
                            variant="body"
                            style={[
                              styles.countChipText,
                              isChosen && styles.countChipTextActive
                            ]}
                          >
                            {opt.label}
                          </FinoraText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          {/* Footer & Summary */}
          <View style={styles.footer}>
            {/* Quality Selector */}
            <View style={styles.qualitySelectorRow}>
              <FinoraText variant="caption" style={styles.qualityLabelText}>
                Qualité vidéo :
              </FinoraText>
              <View style={styles.qualityChipsContainer}>
                {DOWNLOAD_QUALITIES.map((q) => {
                  const isSelected = selectedQuality === q.id;
                  return (
                    <Pressable
                      key={q.id}
                      style={[
                        styles.qualityMiniChip,
                        isSelected && styles.qualityMiniChipSelected
                      ]}
                      onPress={() => {
                        hapticService.selection();
                        setSelectedQuality(q.id);
                      }}
                    >
                      <FinoraText
                        variant="caption"
                        style={[
                          styles.qualityMiniChipText,
                          isSelected && styles.qualityMiniChipTextSelected
                        ]}
                      >
                        {q.id === "original" ? "Source" : q.id}
                      </FinoraText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.summaryBadge}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={colors.primary}
                style={{ marginRight: 6 }}
              />
              <FinoraText variant="caption" style={styles.summaryText}>
                {episodesToDownload.length > 0
                  ? `${episodesToDownload.length} épisode${
                      episodesToDownload.length > 1 ? "s" : ""
                    } non visionné${episodesToDownload.length > 1 ? "s" : ""} prêt${
                      episodesToDownload.length > 1 ? "s" : ""
                    }`
                  : "Aucun épisode non visionné sélectionné"}
              </FinoraText>
            </View>

            <View style={styles.footerActions}>
              <FinoraButton
                label="Annuler"
                variant="secondary"
                size="md"
                onPress={onClose}
                style={styles.cancelBtn}
              />
              <FinoraButton
                testID="confirm-download-button"
                label={
                  episodesToDownload.length > 0
                    ? `Télécharger (${episodesToDownload.length})`
                    : "Télécharger"
                }
                variant="primary"
                size="md"
                onPress={handleConfirm}
                disabled={episodesToDownload.length === 0 || isLoadingEpisodes}
                leftIcon={<Ionicons name="download-outline" size={18} color="#FFFFFF" />}
                style={styles.downloadBtn}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md
  },
  backdropPressable: {
    ...StyleSheet.absoluteFill
  },
  dialogContainer: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    backgroundColor: "#14141E",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#262638",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#1F1F2E"
  },
  title: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 18
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 2
  },
  closeButton: {
    padding: 6
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: "#0D0D14"
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    backgroundColor: "#1A1A28"
  },
  activeTabButton: {
    backgroundColor: colors.primary
  },
  tabText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "600"
  },
  activeTabText: {
    color: "#FFFFFF"
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    maxHeight: 300
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center"
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: spacing.sm
  },
  seasonActionsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs
  },
  seasonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#1A1A28",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "transparent"
  },
  seasonRowSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(229, 9, 20, 0.08)"
  },
  seasonRowDisabled: {
    opacity: 0.5
  },
  seasonInfo: {
    flex: 1,
    marginRight: spacing.sm
  },
  seasonName: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 14
  },
  seasonCount: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2
  },
  countModeContainer: {
    paddingVertical: spacing.sm
  },
  countHelperText: {
    color: colors.textSecondary,
    marginBottom: spacing.sm
  },
  countOptionsGrid: {
    gap: 8
  },
  countChip: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#1A1A28",
    borderWidth: 1,
    borderColor: "#2B2B3E",
    alignItems: "center"
  },
  countChipActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(229, 9, 20, 0.12)"
  },
  countChipText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 14
  },
  countChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700"
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#1F1F2E",
    backgroundColor: "#101018"
  },
  qualitySelectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  qualityLabelText: {
    color: colors.textSecondary,
    fontWeight: "600"
  },
  qualityChipsContainer: {
    flexDirection: "row",
    gap: 6
  },
  qualityMiniChip: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#1C1C2A",
    borderWidth: 1,
    borderColor: "#2B2B3E"
  },
  qualityMiniChipSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(229, 9, 20, 0.15)"
  },
  qualityMiniChipText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600"
  },
  qualityMiniChipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700"
  },
  summaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm
  },
  summaryText: {
    color: colors.textPrimary,
    fontWeight: "500"
  },
  footerActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  cancelBtn: {
    flex: 1
  },
  downloadBtn: {
    flex: 2
  }
});
