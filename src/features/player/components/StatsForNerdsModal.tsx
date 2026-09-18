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
import { useTranslation } from "../../../i18n";

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
  const { t } = useTranslation();
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
              {t("player.statsForNerds")}
            </FinoraText>
            <FinoraIconButton
              accessibilityLabel={t("player.closeStatsA11y")}
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
    backgroundColor: "rgba(0, 0, 0, 0.78)",
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
    maxHeight: "82%",
    backgroundColor: "rgba(16, 16, 24, 0.96)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: spacing.lg,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 16
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingBottom: spacing.sm
  },
  title: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3
  },
  statsScroll: {
    maxHeight: 400
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)"
  },
  label: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700"
  },
  value: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 12,
    fontFamily: "monospace",
    maxWidth: "60%",
    textAlign: "right"
  }
});
