import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { FinoraIconButton } from "../../../design-system/components/FinoraIconButton";
import { Ionicons } from "@expo/vector-icons";
import { TimelineScrubber } from "./TimelineScrubber";
import { colors, spacing } from "../../../design-system/tokens";

export interface CinematicOverlayProps {
  visible: boolean;
  onToggleVisible: () => void;
  title: string;
  seriesTitle?: string;
  isPlaying: boolean;
  currentTimeSeconds: number;
  durationSeconds: number;
  bufferedSeconds: number;
  onPlayPause: () => void;
  onSeekBy: (deltaSeconds: number) => void;
  onSeekTo: (seconds: number) => void;
  onBack: () => void;
  onOpenTracks: () => void;
  onOpenStats?: () => void;
  onScrubbingChange?: (isScrubbing: boolean) => void;
  onScrubMove?: (seconds: number, percent: number) => void;
  autoHideMs?: number;
}

export function CinematicOverlay({
  visible,
  onToggleVisible,
  title,
  seriesTitle,
  isPlaying,
  currentTimeSeconds,
  durationSeconds,
  bufferedSeconds,
  onPlayPause,
  onSeekBy,
  onSeekTo,
  onBack,
  onOpenTracks,
  onOpenStats,
  onScrubbingChange,
  onScrubMove,
  autoHideMs = 4000
}: CinematicOverlayProps) {
  const insets = useSafeAreaInsets();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isPlaying && visible && autoHideMs > 0) {
      timerRef.current = setTimeout(() => {
        onToggleVisible();
      }, autoHideMs);
    }
  };

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [visible, isPlaying]);

  const handleInteraction = () => {
    resetTimer();
  };

  if (!visible) {
    return (
      <Pressable
        style={styles.hiddenSurfaceTouch}
        onPress={onToggleVisible}
        testID="overlay-surface-touch"
      />
    );
  }

  return (
    <Pressable
      style={[
        styles.overlayContainer,
        {
          paddingTop: Math.max(insets.top, spacing.md) + 4,
          paddingBottom: Math.max(insets.bottom, spacing.md) + 4,
          paddingLeft: Math.max(insets.left, spacing.lg),
          paddingRight: Math.max(insets.right, spacing.lg)
        }
      ]}
      onPress={handleInteraction}
      testID="cinematic-overlay"
    >
      {/* Top Bar (Back, Title, Actions) */}
      <View style={styles.topBar} testID="overlay-top-bar">
        <FinoraIconButton
          accessibilityLabel="Go back"
          onPress={onBack}
          size={40}
          backgroundColor="rgba(20, 20, 26, 0.6)"
          testID="overlay-back-button"
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </FinoraIconButton>

        <View style={styles.titleColumn}>
          {Boolean(seriesTitle) && (
            <FinoraText variant="caption" style={styles.seriesText} numberOfLines={1}>
              {seriesTitle}
            </FinoraText>
          )}
          <FinoraText variant="body" style={styles.titleText} numberOfLines={1}>
            {title}
          </FinoraText>
        </View>

        <View style={styles.headerActions}>
          {Boolean(onOpenStats) && (
            <FinoraIconButton
              accessibilityLabel="Stats"
              onPress={() => {
                resetTimer();
                onOpenStats?.();
              }}
              size={36}
              backgroundColor="rgba(20, 20, 26, 0.6)"
              style={styles.actionButton}
              testID="overlay-stats-button"
            >
              <Ionicons name="information-circle-outline" size={20} color="#FFFFFF" />
            </FinoraIconButton>
          )}

          <FinoraIconButton
            accessibilityLabel="Audio and Subtitles"
            onPress={() => {
              resetTimer();
              onOpenTracks();
            }}
            size={36}
            backgroundColor="rgba(20, 20, 26, 0.6)"
            testID="overlay-tracks-button"
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#FFFFFF" />
          </FinoraIconButton>
        </View>
      </View>

      {/* Center Controls (Seek -10, Play/Pause, Seek +10) */}
      <View style={styles.centerControls} testID="overlay-center-controls">
        <FinoraIconButton
          accessibilityLabel="Seek backward 10 seconds"
          onPress={() => {
            resetTimer();
            onSeekBy(-10);
          }}
          size={50}
          backgroundColor="rgba(20, 20, 26, 0.6)"
          testID="overlay-seek-back-button"
        >
          <View style={styles.skipContainer}>
            <Ionicons name="arrow-undo" size={18} color="#FFFFFF" />
            <FinoraText variant="caption" style={styles.skipNumber}>
              10
            </FinoraText>
          </View>
        </FinoraIconButton>

        <FinoraIconButton
          accessibilityLabel={isPlaying ? "Pause" : "Play"}
          onPress={() => {
            resetTimer();
            onPlayPause();
          }}
          size={68}
          backgroundColor={colors.primary}
          style={styles.playPauseButton}
          testID="overlay-play-pause-button"
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={32}
            color="#FFFFFF"
            style={!isPlaying ? { marginLeft: 3 } : undefined}
          />
        </FinoraIconButton>

        <FinoraIconButton
          accessibilityLabel="Seek forward 10 seconds"
          onPress={() => {
            resetTimer();
            onSeekBy(10);
          }}
          size={50}
          backgroundColor="rgba(20, 20, 26, 0.6)"
          testID="overlay-seek-forward-button"
        >
          <View style={styles.skipContainer}>
            <Ionicons name="arrow-redo" size={18} color="#FFFFFF" />
            <FinoraText variant="caption" style={styles.skipNumber}>
              10
            </FinoraText>
          </View>
        </FinoraIconButton>
      </View>

      {/* Bottom Scrubber */}
      <View style={styles.bottomBar} testID="overlay-bottom-bar">
        <TimelineScrubber
          currentTimeSeconds={currentTimeSeconds}
          durationSeconds={durationSeconds}
          bufferedSeconds={bufferedSeconds}
          onSeek={(seconds) => {
            resetTimer();
            onSeekTo(seconds);
          }}
          onScrubbingChange={(isScrubbing) => {
            if (isScrubbing && timerRef.current) {
              clearTimeout(timerRef.current);
            } else {
              resetTimer();
            }
            onScrubbingChange?.(isScrubbing);
          }}
          onScrubMove={onScrubMove}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hiddenSurfaceTouch: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "transparent"
  },
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "space-between",
    padding: spacing.lg,
    zIndex: 20
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center"
  },
  titleColumn: {
    flex: 1,
    marginHorizontal: spacing.md
  },
  seriesText: {
    color: colors.textSecondary,
    fontSize: 12
  },
  titleText: {
    color: colors.textPrimary,
    fontWeight: "700"
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center"
  },
  actionButton: {
    marginRight: spacing.sm
  },
  iconGlyph: {
    fontSize: 28,
    lineHeight: 32,
    color: colors.textPrimary,
    textAlign: "center"
  },
  actionGlyph: {
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: "center"
  },
  centerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  playPauseButton: {
    marginHorizontal: spacing.xl
  },
  playPauseGlyph: {
    fontSize: 24,
    color: "#FFFFFF",
    textAlign: "center"
  },
  skipGlyph: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "center"
  },
  skipContainer: {
    alignItems: "center",
    justifyContent: "center"
  },
  skipNumber: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 1
  },
  bottomBar: {
    width: "100%",
    paddingBottom: spacing.sm
  }
});
