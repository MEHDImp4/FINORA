import React from "react";
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable
} from "react-native";
import { MediaItem } from "../../../types/media";
import { PlaybackPlan, getSanitizedPlaybackUrl } from "../playbackPlanner";
import { FinoraPlayerSnapshot } from "../types";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { FinoraIconButton } from "../../../design-system/components/FinoraIconButton";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../../../design-system/tokens";

export interface StatsForNerdsModalProps {
  visible: boolean;
  onClose: () => void;
  item: MediaItem;
  plan: PlaybackPlan;
  snapshot: FinoraPlayerSnapshot;
}

export function StatsForNerdsModal({
  visible,
  onClose,
  item,
  plan,
  snapshot
}: StatsForNerdsModalProps) {
  if (!visible) return null;

  const videoStream = item.mediaStreams?.find((s) => s.type === "Video");
  const audioStream = item.mediaStreams?.find((s) => s.type === "Audio");

  const sanitizedUrl = getSanitizedPlaybackUrl(plan.url);

  const stats = [
    { label: "Item ID", value: item.id },
    { label: "Item Name", value: item.name },
    { label: "Playback Mode", value: plan.mode.toUpperCase() },
    {
      label: "Video Codec / Res",
      value: `${videoStream?.codec || plan.videoCodec || "unknown"} (${videoStream?.width || "N/A"}x${videoStream?.height || "N/A"})`
    },
    {
      label: "Audio Codec / Channels",
      value: `${audioStream?.codec || plan.audioCodec || "unknown"} (${audioStream?.channels ? (audioStream.channels >= 6 ? "5.1" : "Stereo") : "N/A"})`
    },
    { label: "Container", value: plan.container || "mp4" },
    { label: "Player State", value: snapshot.state },
    {
      label: "Current Position",
      value: `${snapshot.currentTimeSeconds.toFixed(1)}s / ${snapshot.durationSeconds.toFixed(1)}s`
    },
    {
      label: "Buffered Position",
      value: `${snapshot.bufferedPositionSeconds.toFixed(1)}s`
    },
    { label: "Playback Rate", value: `${snapshot.playbackRate}x` },
    { label: "Decision Reason", value: plan.reason },
    { label: "Stream URL", value: sanitizedUrl }
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID="stats-for-nerds-modal"
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} />

        <View style={styles.card} testID="stats-card">
          <View style={styles.header}>
            <FinoraText variant="title" style={styles.title}>
              Stats for Nerds
            </FinoraText>
            <FinoraIconButton
              accessibilityLabel="Close stats"
              onPress={onClose}
              size={32}
              backgroundColor={colors.surface}
              testID="close-stats-button"
            >
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </FinoraIconButton>
          </View>

          <ScrollView style={styles.statsScroll}>
            {stats.map((stat, i) => (
              <View key={i} style={styles.row}>
                <FinoraText variant="caption" style={styles.label}>
                  {stat.label}:
                </FinoraText>
                <FinoraText
                  variant="caption"
                  style={styles.value}
                  testID={`stat-val-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {stat.value}
                </FinoraText>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md
  },
  dismissArea: {
    ...StyleSheet.absoluteFill
  },
  card: {
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
    backgroundColor: "rgba(20, 20, 26, 0.95)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A2A38",
    padding: spacing.md,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 12
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderColor: "#2A2A38",
    paddingBottom: spacing.xs
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "bold"
  },
  closeGlyph: {
    color: colors.textSecondary,
    fontSize: 12
  },
  statsScroll: {
    maxHeight: 400
  },
  row: {
    marginBottom: spacing.xs
  },
  label: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700"
  },
  value: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: "monospace"
  }
});
