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

export const QUALITY_OPTIONS = [
  { id: "auto", label: "Auto (Direct Play)", bitrate: 0 },
  { id: "1080p", label: "1080p - 10 Mbps", bitrate: 10000000 },
  { id: "720p", label: "720p - 4 Mbps", bitrate: 4000000 },
  { id: "480p", label: "480p - 1.5 Mbps", bitrate: 1500000 }
];

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
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>("audio");

  const audioStreams = streams.filter((s) => s.type === "Audio");
  const subtitleStreams = streams.filter((s) => s.type === "Subtitle");

  const formatAudioTitle = (stream: MediaStreamInfo, idx: number): string => {
    if (stream.displayTitle) return stream.displayTitle;
    const lang = stream.language ? stream.language.toUpperCase() : `Audio ${idx + 1}`;
    const channels = stream.channels ? (stream.channels >= 6 ? "5.1" : "Stereo") : "";
    const codec = stream.codec ? stream.codec.toUpperCase() : "";
    return [lang, channels, codec].filter(Boolean).join(" · ");
  };

  const formatSubtitleTitle = (stream: MediaStreamInfo, idx: number): string => {
    if (stream.displayTitle) return stream.displayTitle;
    const lang = stream.language ? stream.language.toUpperCase() : `Subtitle ${idx + 1}`;
    const ext = stream.isExternal ? " [External]" : "";
    return `${lang}${ext}`;
  };

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
            { paddingBottom: Math.max(insets.bottom, spacing.xl) }
          ]}
          testID="track-selection-sheet"
        >
          {/* Header Row */}
          <View style={styles.sheetHeader}>
            <FinoraText variant="title" style={styles.sheetTitle}>
              Playback Settings
            </FinoraText>
            <FinoraIconButton
              accessibilityLabel="Close"
              onPress={onClose}
              size={36}
              backgroundColor={colors.surface}
              testID="close-modal-button"
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </FinoraIconButton>
          </View>

          {/* Segmented Tab Bar */}
          <View style={styles.tabBar}>
            <Pressable
              style={[styles.tabButton, activeTab === "audio" && styles.tabButtonActive]}
              onPress={() => setActiveTab("audio")}
              testID="tab-audio"
            >
              <FinoraText
                variant="caption"
                style={[styles.tabText, activeTab === "audio" && styles.tabTextActive]}
              >
                Audio ({audioStreams.length || availableAudioTracks.length})
              </FinoraText>
            </Pressable>

            <Pressable
              style={[styles.tabButton, activeTab === "subtitles" && styles.tabButtonActive]}
              onPress={() => setActiveTab("subtitles")}
              testID="tab-subtitles"
            >
              <FinoraText
                variant="caption"
                style={[styles.tabText, activeTab === "subtitles" && styles.tabTextActive]}
              >
                Subtitles ({subtitleStreams.length || availableSubtitleTracks.length})
              </FinoraText>
            </Pressable>

            <Pressable
              style={[styles.tabButton, activeTab === "quality" && styles.tabButtonActive]}
              onPress={() => setActiveTab("quality")}
              testID="tab-quality"
            >
              <FinoraText
                variant="caption"
                style={[styles.tabText, activeTab === "quality" && styles.tabTextActive]}
              >
                Quality
              </FinoraText>
            </Pressable>
          </View>

          {/* Tab Content List */}
          <ScrollView style={styles.scrollList} contentContainerStyle={styles.scrollContent}>
            {/* Audio Tab */}
            {activeTab === "audio" && (
              <View testID="audio-list">
                {audioStreams.length === 0 && availableAudioTracks.length === 0 ? (
                  <FinoraText variant="caption" style={styles.emptyText}>
                    No audio tracks available
                  </FinoraText>
                ) : audioStreams.length > 0 ? (
                  audioStreams.map((stream, idx) => {
                    const streamIdx = stream.index !== undefined ? stream.index : idx;
                    const isSelected = selectedAudioIndex === streamIdx;

                    return (
                      <Pressable
                        key={`audio-${streamIdx}`}
                        style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                        onPress={() => onSelectAudio(streamIdx)}
                        testID={`audio-option-${streamIdx}`}
                      >
                        <FinoraText
                          variant="body"
                          style={[styles.optionText, isSelected && styles.optionTextSelected]}
                        >
                          {formatAudioTitle(stream, idx)}
                        </FinoraText>
                        {isSelected && (
                          <Ionicons name="checkmark" size={18} color={colors.primary} />
                        )}
                      </Pressable>
                    );
                  })
                ) : (
                  availableAudioTracks.map((track, idx) => {
                    const isSelected = selectedAudioIndex === idx;
                    const trackLabel =
                      track.label || track.name || (track.language ? track.language.toUpperCase() : `Audio ${idx + 1}`);

                    return (
                      <Pressable
                        key={`native-audio-${track.id || idx}`}
                        style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                        onPress={() => onSelectAudio(idx)}
                        testID={`audio-option-${idx}`}
                      >
                        <FinoraText
                          variant="body"
                          style={[styles.optionText, isSelected && styles.optionTextSelected]}
                        >
                          {trackLabel}
                        </FinoraText>
                        {isSelected && (
                          <Ionicons name="checkmark" size={18} color={colors.primary} />
                        )}
                      </Pressable>
                    );
                  })
                )}
              </View>
            )}

            {/* Subtitles Tab */}
            {activeTab === "subtitles" && (
              <View testID="subtitles-list">
                {onOpenSubtitleStyle && (
                  <Pressable
                    style={styles.subtitleStyleButton}
                    onPress={onOpenSubtitleStyle}
                    testID="open-subtitle-style-button"
                  >
                    <Ionicons name="color-palette-outline" size={18} color={colors.primary} />
                    <FinoraText variant="body" weight="700" color="primary" style={{ marginLeft: 8 }}>
                      Personnaliser l'apparence des sous-titres
                    </FinoraText>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.primary}
                      style={{ marginLeft: "auto" }}
                    />
                  </Pressable>
                )}

                {/* Off Option */}
                <Pressable
                  style={[
                    styles.optionRow,
                    selectedSubtitleIndex === null && styles.optionRowSelected
                  ]}
                  onPress={() => onSelectSubtitle(null)}
                  testID="subtitle-option-off"
                >
                  <FinoraText
                    variant="body"
                    style={[
                      styles.optionText,
                      selectedSubtitleIndex === null && styles.optionTextSelected
                    ]}
                  >
                    Off
                  </FinoraText>
                  {selectedSubtitleIndex === null && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </Pressable>

                {subtitleStreams.length > 0
                  ? subtitleStreams.map((stream, idx) => {
                      const streamIdx = stream.index !== undefined ? stream.index : idx;
                      const isSelected = selectedSubtitleIndex === streamIdx;

                      return (
                        <Pressable
                          key={`sub-${streamIdx}`}
                          style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                          onPress={() => onSelectSubtitle(streamIdx)}
                          testID={`subtitle-option-${streamIdx}`}
                        >
                          <FinoraText
                            variant="body"
                            style={[styles.optionText, isSelected && styles.optionTextSelected]}
                          >
                            {formatSubtitleTitle(stream, idx)}
                          </FinoraText>
                          {isSelected && (
                            <Ionicons name="checkmark" size={18} color={colors.primary} />
                          )}
                        </Pressable>
                      );
                    })
                  : availableSubtitleTracks.map((track, idx) => {
                      const isSelected = selectedSubtitleIndex === idx;
                      const trackLabel =
                        track.label || (track.language ? track.language.toUpperCase() : `Subtitle ${idx + 1}`);

                      return (
                        <Pressable
                          key={`native-sub-${track.id || idx}`}
                          style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                          onPress={() => onSelectSubtitle(idx)}
                          testID={`subtitle-option-${idx}`}
                        >
                          <FinoraText
                            variant="body"
                            style={[styles.optionText, isSelected && styles.optionTextSelected]}
                          >
                            {trackLabel}
                          </FinoraText>
                          {isSelected && (
                            <Ionicons name="checkmark" size={18} color={colors.primary} />
                          )}
                        </Pressable>
                      );
                    })}
              </View>
            )}

            {/* Quality Tab */}
            {activeTab === "quality" && (
              <View testID="quality-list">
                {QUALITY_OPTIONS.map((opt) => {
                  const isSelected = selectedQuality === opt.id;
                  return (
                    <Pressable
                      key={`quality-${opt.id}`}
                      style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                      onPress={() => onSelectQuality(opt.id)}
                      testID={`quality-option-${opt.id}`}
                    >
                      <FinoraText
                        variant="body"
                        style={[styles.optionText, isSelected && styles.optionTextSelected]}
                      >
                        {opt.label}
                      </FinoraText>
                      {isSelected && (
                        <Ionicons name="checkmark" size={18} color={colors.primary} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end"
  },
  dismissArea: {
    flex: 1
  },
  sheetContainer: {
    backgroundColor: "#14141A",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: "#2A2A38",
    maxHeight: "75%",
    paddingBottom: spacing.xl
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderColor: "#2A2A38"
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700"
  },
  closeIcon: {
    color: colors.textSecondary,
    fontSize: 14
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#0A0A0C",
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: 8,
    padding: 3
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: "center",
    borderRadius: 6
  },
  tabButtonActive: {
    backgroundColor: colors.surface
  },
  tabText: {
    color: colors.textMuted,
    fontWeight: "600"
  },
  tabTextActive: {
    color: colors.textPrimary
  },
  scrollList: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg
  },
  scrollContent: {
    paddingVertical: spacing.xs
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderColor: "#1C1C26"
  },
  optionRowSelected: {
    backgroundColor: "rgba(229, 9, 20, 0.08)",
    borderRadius: 8
  },
  optionText: {
    color: colors.textSecondary,
    fontSize: 15
  },
  optionTextSelected: {
    color: colors.textPrimary,
    fontWeight: "600"
  },
  checkIcon: {
    color: colors.primary,
    fontWeight: "bold",
    fontSize: 16
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.xl
  },
  subtitleStyleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "rgba(229, 9, 20, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(229, 9, 20, 0.3)",
    marginBottom: 12
  }
});
