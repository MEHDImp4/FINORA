import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../../../design-system/tokens";

export interface NextEpisodeOverlayProps {
  visible: boolean;
  nextEpisodeName: string;
  nextEpisodeLabel: string;
  countdownSeconds?: number;
  onPlayNext: () => void;
  onCancel: () => void;
}

export function NextEpisodeOverlay({
  visible,
  nextEpisodeName,
  nextEpisodeLabel,
  countdownSeconds = 8,
  onPlayNext,
  onCancel
}: NextEpisodeOverlayProps) {
  const insets = useSafeAreaInsets();
  const [remaining, setRemaining] = useState(countdownSeconds);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!visible) {
      setRemaining(countdownSeconds);
      return;
    }

    setRemaining(countdownSeconds);

    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          onPlayNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible, countdownSeconds, onPlayNext]);

  if (!visible) return null;

  const progress = 1 - remaining / countdownSeconds;

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, spacing.xl) + 20,
          paddingRight: Math.max(insets.right, spacing.lg)
        }
      ]}
      pointerEvents="box-none"
      testID="next-episode-overlay"
    >
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <View style={styles.textColumn}>
            <FinoraText variant="caption" style={styles.upNextLabel}>
              SUIVANT
            </FinoraText>
            <FinoraText variant="body" style={styles.episodeName} numberOfLines={1}>
              {nextEpisodeLabel}
            </FinoraText>
            <FinoraText variant="caption" style={styles.episodeTitle} numberOfLines={1}>
              {nextEpisodeName}
            </FinoraText>
          </View>

          <Pressable
            style={styles.playButton}
            onPress={onPlayNext}
            testID="next-episode-play-button"
          >
            <Ionicons name="play" size={28} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Countdown progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
        </View>

        <Pressable onPress={onCancel} style={styles.cancelButton} testID="next-episode-cancel">
          <FinoraText variant="caption" style={styles.cancelText}>
            Annuler ({remaining}s)
          </FinoraText>
        </Pressable>
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
    paddingHorizontal: spacing.lg
  },
  card: {
    backgroundColor: "rgba(20, 20, 26, 0.92)",
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)"
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  textColumn: {
    flex: 1,
    marginRight: spacing.md
  },
  upNextLabel: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 4
  },
  episodeName: {
    color: colors.textPrimary,
    fontWeight: "600",
    marginBottom: 2
  },
  episodeTitle: {
    color: colors.textSecondary,
    fontSize: 12
  },
  playButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center"
  },
  progressTrack: {
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 2,
    marginTop: spacing.sm,
    overflow: "hidden"
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2
  },
  cancelButton: {
    alignSelf: "flex-end",
    marginTop: spacing.xs,
    paddingVertical: 4,
    paddingHorizontal: 8
  },
  cancelText: {
    color: colors.textMuted,
    fontSize: 11
  }
});
