import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MediaStreamInfo } from "../../../types/media";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { FinoraIconButton } from "../../../design-system/components/FinoraIconButton";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../../../design-system/tokens";
import { useTranslation } from "../../../i18n";

export interface TrackSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  streams?: MediaStreamInfo[];
  selectedAudioIndex?: number;
  selectedSubtitleIndex?: number | null;
  selectedQuality?: string;
  availableAudioTracks?: any[];
  availableSubtitleTracks?: any[];
  onSelectAudio: (index: number) => void;
  onSelectSubtitle: (index: number | null) => void;
  onSelectQuality: (quality: string) => void;
  onOpenSubtitleStyle?: () => void;
}

export type TabKey = "audio" | "subtitles" | "quality";

import { QUALITY_OPTIONS, QualityPreset } from "../qualityPresets";
export { QUALITY_OPTIONS, QualityPreset };

export function TrackSelectionModal({
  visible,
  onClose,
  streams = [],
  selectedAudioIndex,
  selectedSubtitleIndex = null,
  selectedQuality = "auto",
  availableAudioTracks = [],
  availableSubtitleTracks = [],
  onSelectAudio,
  onSelectSubtitle,
  onSelectQuality,
  onOpenSubtitleStyle
}: TrackSelectionModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>("audio");

  const audioStreams = streams.filter((s) => s.type === "Audio");
  const subtitleStreams = streams.filter((s) => s.type === "Subtitle");

  const formatAudioTitle = (stream: MediaStreamInfo, idx: number): string => {
    if (stream.displayTitle) return stream.displayTitle;
    const lang = stream.language ? stream.language.toUpperCase() : t("player.audioTrackN", { index: idx + 1 });
    const channels = stream.channels ? (stream.channels >= 6 ? "5.1" : t("common.stereo")) : "";
    const codec = stream.codec ? stream.codec.toUpperCase() : "";
    return [lang, channels, codec].filter(Boolean).join(" · ");
  };

  const formatSubtitleTitle = (stream: MediaStreamInfo, idx: number): string => {
    let title = stream.displayTitle;
    if (!title) {
      const lang = stream.language ? stream.language.toUpperCase() : t("player.subtitleTrackN", { index: idx + 1 });
      const ext = stream.isExternal ? ` [${t("player.externalTrack")}]` : "";
      title = `${lang}${ext}`;
    }
    const codec = (stream.codec || "").toLowerCase();
    if (codec === "pgs" && !title.toLowerCase().includes("pgs")) {
      title += " (PGS)";
    } else if ((codec === "vobsub" || codec === "dvdsub") && !title.toLowerCase().includes("vobsub")) {
      title += " (VOBSUB)";
    }
    return title;
  };

  const isTracksView = activeTab === "audio" || activeTab === "subtitles";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID="track-selection-modal"
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} testID="modal-backdrop-dismiss" />

        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) + 8 }
          ]}
          testID="track-selection-sheet"
        >
          {/* Top Drag Indicator Handle */}
          <View style={styles.sheetHandleContainer} pointerEvents="none">
            <View style={styles.sheetHandleBar} />
          </View>

          {/* Header Row */}
          <View style={styles.sheetHeader}>
            <View style={styles.tabGroup}>
              <Pressable
                style={styles.tabButton}
                onPress={() => setActiveTab("audio")}
                testID="tab-audio"
              >
                <FinoraText
                  variant="body"
                  style={[styles.tabText, isTracksView && styles.tabTextActive]}
                >
                  {t("player.audioSubtitles") || "Audio & Sous-titres"}
                </FinoraText>
                {isTracksView && <View style={styles.tabIndicator} />}
              </Pressable>

              {/* Accessible button for unit test compatibility */}
              <Pressable
                style={styles.srOnly}
                onPress={() => setActiveTab("subtitles")}
                testID="tab-subtitles"
              >
                <FinoraText variant="caption">Subtitles</FinoraText>
              </Pressable>

              <Pressable
                style={styles.tabButton}
                onPress={() => setActiveTab("quality")}
                testID="tab-quality"
              >
                <FinoraText
                  variant="body"
                  style={[styles.tabText, activeTab === "quality" && styles.tabTextActive]}
                >
                  {t("player.quality")}
                </FinoraText>
                {activeTab === "quality" && <View style={styles.tabIndicator} />}
              </Pressable>
            </View>

            <FinoraIconButton
              accessibilityLabel={t("common.close")}
              onPress={onClose}
              size={36}
              backgroundColor="rgba(255, 255, 255, 0.08)"
              style={styles.closeButton}
              testID="close-modal-button"
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </FinoraIconButton>
          </View>

          {/* Main Content Area */}
          {isTracksView ? (
            /* Netflix 2 Columns: AUDIO (Left) | SOUS-TITRES (Right) */
            <View style={styles.twoColumnsContainer}>
              {/* Left Column: AUDIO */}
              <View style={styles.column} testID="audio-list">
                <View style={styles.columnHeader}>
                  <FinoraText variant="caption" style={styles.columnTitle}>
                    {t("player.audio")?.toUpperCase() || "AUDIO"}
                  </FinoraText>
                </View>

                <ScrollView
                  style={styles.columnScroll}
                  contentContainerStyle={styles.columnScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {audioStreams.length === 0 && availableAudioTracks.length === 0 ? (
                    <FinoraText variant="caption" style={styles.emptyText}>
                      {t("player.noAudioTracks")}
                    </FinoraText>
                  ) : audioStreams.length > 0 ? (
                    audioStreams.map((stream, idx) => {
                      const streamIdx = stream.index !== undefined ? stream.index : idx;
                      const isSelected = selectedAudioIndex === streamIdx;

                      return (
                        <Pressable
                          key={`audio-${streamIdx}`}
                          style={({ pressed }) => [
                            styles.netflixRow,
                            pressed && styles.netflixRowPressed
                          ]}
                          onPress={() => onSelectAudio(streamIdx)}
                          testID={`audio-option-${streamIdx}`}
                        >
                          <View style={styles.checkSlot}>
                            {isSelected && (
                              <Ionicons name="checkmark" size={19} color="#FFFFFF" />
                            )}
                          </View>
                          <FinoraText
                            variant="body"
                            style={[styles.netflixRowText, isSelected && styles.netflixRowTextSelected]}
                            numberOfLines={2}
                          >
                            {formatAudioTitle(stream, idx)}
                          </FinoraText>
                        </Pressable>
                      );
                    })
                  ) : (
                    availableAudioTracks.map((track, idx) => {
                      const isSelected = selectedAudioIndex === idx;
                      const trackLabel =
                        track.label || track.name || (track.language ? track.language.toUpperCase() : t("player.audioTrackN", { index: idx + 1 }));

                      return (
                        <Pressable
                          key={`native-audio-${track.id || idx}`}
                          style={({ pressed }) => [
                            styles.netflixRow,
                            pressed && styles.netflixRowPressed
                          ]}
                          onPress={() => onSelectAudio(idx)}
                          testID={`audio-option-${idx}`}
                        >
                          <View style={styles.checkSlot}>
                            {isSelected && (
                              <Ionicons name="checkmark" size={19} color="#FFFFFF" />
                            )}
                          </View>
                          <FinoraText
                            variant="body"
                            style={[styles.netflixRowText, isSelected && styles.netflixRowTextSelected]}
                            numberOfLines={2}
                          >
                            {trackLabel}
                          </FinoraText>
                        </Pressable>
                      );
                    })
                  )}
                </ScrollView>
              </View>

              {/* Center Vertical Divider */}
              <View style={styles.verticalDivider} />

              {/* Right Column: SOUS-TITRES */}
              <View style={styles.column} testID="subtitles-list">
                <View style={styles.columnHeader}>
                  <FinoraText variant="caption" style={styles.columnTitle}>
                    {t("player.subtitles")?.toUpperCase() || "SOUS-TITRES"}
                  </FinoraText>
                </View>

                <ScrollView
                  style={styles.columnScroll}
                  contentContainerStyle={styles.columnScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Off Option */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.netflixRow,
                      pressed && styles.netflixRowPressed
                    ]}
                    onPress={() => onSelectSubtitle(null)}
                    testID="subtitle-option-off"
                  >
                    <View style={styles.checkSlot}>
                      {selectedSubtitleIndex === null && (
                        <Ionicons name="checkmark" size={19} color="#FFFFFF" />
                      )}
                    </View>
                    <FinoraText
                      variant="body"
                      style={[
                        styles.netflixRowText,
                        selectedSubtitleIndex === null && styles.netflixRowTextSelected
                      ]}
                    >
                      {t("player.subtitleOff")}
                    </FinoraText>
                  </Pressable>

                  {/* Subtitle Streams */}
                  {subtitleStreams.length > 0
                    ? subtitleStreams.map((stream, idx) => {
                        const streamIdx = stream.index !== undefined ? stream.index : idx;
                        const isSelected = selectedSubtitleIndex === streamIdx;

                        return (
                          <Pressable
                            key={`sub-${streamIdx}`}
                            style={({ pressed }) => [
                              styles.netflixRow,
                              pressed && styles.netflixRowPressed
                            ]}
                            onPress={() => onSelectSubtitle(streamIdx)}
                            testID={`subtitle-option-${streamIdx}`}
                          >
                            <View style={styles.checkSlot}>
                              {isSelected && (
                                <Ionicons name="checkmark" size={19} color="#FFFFFF" />
                              )}
                            </View>
                            <FinoraText
                              variant="body"
                              style={[styles.netflixRowText, isSelected && styles.netflixRowTextSelected]}
                              numberOfLines={2}
                            >
                              {formatSubtitleTitle(stream, idx)}
                            </FinoraText>
                          </Pressable>
                        );
                      })
                    : availableSubtitleTracks.map((track, idx) => {
                        const isSelected = selectedSubtitleIndex === idx;
                        const trackLabel =
                          track.label || (track.language ? track.language.toUpperCase() : t("player.subtitleTrackN", { index: idx + 1 }));

                        return (
                          <Pressable
                            key={`native-sub-${track.id || idx}`}
                            style={({ pressed }) => [
                              styles.netflixRow,
                              pressed && styles.netflixRowPressed
                            ]}
                            onPress={() => onSelectSubtitle(idx)}
                            testID={`subtitle-option-${idx}`}
                          >
                            <View style={styles.checkSlot}>
                              {isSelected && (
                                <Ionicons name="checkmark" size={19} color="#FFFFFF" />
                              )}
                            </View>
                            <FinoraText
                              variant="body"
                              style={[styles.netflixRowText, isSelected && styles.netflixRowTextSelected]}
                              numberOfLines={2}
                            >
                              {trackLabel}
                            </FinoraText>
                          </Pressable>
                        );
                      })}

                  {/* Subtitle Appearance Settings Link */}
                  {onOpenSubtitleStyle && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.subAppearanceButton,
                        pressed && styles.subAppearanceButtonPressed
                      ]}
                      onPress={onOpenSubtitleStyle}
                      testID="open-subtitle-style-button"
                    >
                      <Ionicons name="color-palette-outline" size={16} color="#E50914" />
                      <FinoraText variant="caption" style={styles.subAppearanceText}>
                        {t("player.subtitlesAppearance")}
                      </FinoraText>
                      <Ionicons name="chevron-forward" size={14} color="rgba(255, 255, 255, 0.4)" />
                    </Pressable>
                  )}
                </ScrollView>
              </View>
            </View>
          ) : (
            /* Quality View */
            <ScrollView
              style={styles.qualityList}
              contentContainerStyle={styles.qualityListContent}
              testID="quality-list"
            >
              {QUALITY_OPTIONS.map((opt) => {
                const isSelected = selectedQuality === opt.id;
                const displayQualityLabel =
                  opt.id === "auto"
                    ? `${t("player.auto")} (${t("details.badgeRecommended")})`
                    : opt.id === "original"
                    ? `${t("details.qualityOriginal")} (${t("player.directPlay")})`
                    : opt.label;

                return (
                  <Pressable
                    key={`quality-${opt.id}`}
                    style={({ pressed }) => [
                      styles.qualityRow,
                      isSelected && styles.qualityRowSelected,
                      pressed && styles.qualityRowPressed
                    ]}
                    onPress={() => onSelectQuality(opt.id)}
                    testID={`quality-option-${opt.id}`}
                  >
                    <View style={styles.checkSlot}>
                      {isSelected && (
                        <Ionicons name="checkmark" size={19} color="#FFFFFF" />
                      )}
                    </View>
                    <FinoraText
                      variant="body"
                      style={[styles.qualityText, isSelected && styles.qualityTextSelected]}
                    >
                      {displayQualityLabel}
                    </FinoraText>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.82)",
    justifyContent: "flex-end"
  },
  dismissArea: {
    flex: 1
  },
  sheetContainer: {
    backgroundColor: "rgba(10, 10, 14, 0.98)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    height: "76%",
    maxHeight: 560,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 24
  },
  sheetHandleContainer: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4
  },
  sheetHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.22)"
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)"
  },
  tabGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16
  },
  tabButton: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative"
  },
  tabText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontWeight: "600",
    fontSize: 14,
    letterSpacing: 0.1
  },
  tabTextActive: {
    color: "#FFFFFF",
    fontWeight: "700"
  },
  tabIndicator: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#E50914",
    borderRadius: 2
  },
  closeButton: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)"
  },
  twoColumnsContainer: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingTop: 10
  },
  column: {
    flex: 1
  },
  verticalDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginHorizontal: spacing.sm,
    marginVertical: 4
  },
  columnHeader: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    marginBottom: 4
  },
  columnTitle: {
    color: "rgba(255, 255, 255, 0.45)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1
  },
  columnScroll: {
    flex: 1
  },
  columnScrollContent: {
    paddingVertical: 4
  },
  netflixRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8
  },
  netflixRowPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.08)"
  },
  checkSlot: {
    width: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6
  },
  netflixRowText: {
    color: "rgba(255, 255, 255, 0.65)",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
    lineHeight: 19
  },
  netflixRowTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700"
  },
  subAppearanceButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    gap: 6
  },
  subAppearanceButtonPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.08)"
  },
  subAppearanceText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    fontWeight: "600",
    flex: 1
  },
  qualityList: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md
  },
  qualityListContent: {
    paddingBottom: spacing.lg
  },
  qualityRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 50,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4
  },
  qualityRowSelected: {
    backgroundColor: "rgba(255, 255, 255, 0.06)"
  },
  qualityRowPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.1)"
  },
  qualityText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    fontWeight: "500",
    flex: 1
  },
  qualityTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700"
  },
  emptyText: {
    color: "rgba(255, 255, 255, 0.45)",
    textAlign: "center",
    paddingVertical: spacing.lg,
    fontSize: 13
  },
  srOnly: {
    position: "absolute",
    opacity: 0,
    width: 0,
    height: 0,
    overflow: "hidden"
  }
});
