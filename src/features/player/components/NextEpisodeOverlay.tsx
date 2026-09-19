import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../../../design-system/tokens";
import { useTranslation } from "../../../i18n";

export interface NextEpisodeOverlayProps {
  visible: boolean;
  nextEpisodeName: string;
  nextEpisodeLabel: string;
  remainingSeconds?: number;
  onPlayNext: () => void;
}

function formatRemaining(seconds?: number): string | null {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return null;
  const whole = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function NextEpisodeOverlay({
  visible,
  nextEpisodeName,
  nextEpisodeLabel,
  remainingSeconds,
  onPlayNext
}: NextEpisodeOverlayProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const remainingLabel = formatRemaining(remainingSeconds);

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, spacing.lg) + 18,
          paddingRight: Math.max(insets.right, spacing.lg),
          paddingLeft: Math.max(insets.left, spacing.lg)
        }
      ]}
      pointerEvents="box-none"
      testID="next-episode-overlay"
    >
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.upNextPill}>
            <FinoraText variant="caption" style={styles.upNextLabel}>
              {t("player.upNext")}
            </FinoraText>
          </View>
          {remainingLabel ? (
            <FinoraText variant="caption" style={styles.remainingLabel} testID="next-episode-remaining">
              {remainingLabel}
            </FinoraText>
          ) : null}
        </View>

        <FinoraText variant="body" style={styles.episodeLabel} numberOfLines={1}>
          {nextEpisodeLabel}
        </FinoraText>
        <FinoraText variant="caption" style={styles.episodeTitle} numberOfLines={2}>
          {nextEpisodeName}
        </FinoraText>

        <View style={styles.footerRow}>
          <FinoraText variant="caption" style={styles.autoPlayHint}>
            {t("player.autoPlayAtEnd")}
          </FinoraText>

          <Pressable
            style={({ pressed }) => [styles.playButton, pressed && styles.playButtonPressed]}
            onPress={onPlayNext}
            testID="next-episode-play-button"
            accessibilityRole="button"
            accessibilityLabel={t("player.nextEpisodeA11y")}
          >
            <Ionicons name="play" size={17} color="#FFFFFF" />
            <FinoraText variant="caption" style={styles.playButtonText}>
              {t("player.playNextNow")}
            </FinoraText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    alignItems: "flex-end"
  },
  card: {
    width: "100%",
    maxWidth: 390,
    backgroundColor: "rgba(10, 10, 14, 0.97)",
    borderRadius: 18,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.65,
    shadowRadius: 20,
    elevation: 16
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm
  },
  upNextPill: {
    backgroundColor: "rgba(229, 9, 20, 0.16)",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4
  },
  upNextLabel: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2
  },
  remainingLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontVariant: ["tabular-nums"]
  },
  episodeLabel: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 17,
    marginBottom: 3
  },
  episodeTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  autoPlayHint: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 11
  },
  playButton: {
    minHeight: 38,
    borderRadius: 20,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  playButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }]
  },
  playButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800"
  }
});
