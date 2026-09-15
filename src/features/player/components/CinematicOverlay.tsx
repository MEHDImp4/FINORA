import React, { useEffect, useRef, useState } from "react";
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
import { VerticalSlider } from "./VerticalSlider";
import { colors, spacing } from "../../../design-system/tokens";

export type PlaybackModeLabel = "direct-play" | "direct-stream" | "transcode";

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
  onToggleOrientation?: () => void;
  isLandscape?: boolean;
  onScrubbingChange?: (isScrubbing: boolean) => void;
  onScrubMove?: (seconds: number, percent: number) => void;
  brightness: number;
  onBrightnessChange: (value: number) => void;
  volume: number;
  onVolumeChange: (value: number) => void;
  autoHideMs?: number;
  playbackMode?: PlaybackModeLabel;
  playbackRate?: number;
  onCycleSpeed?: () => void;
}

function playbackModeLabel(mode?: PlaybackModeLabel): string {
  switch (mode) {
    case "direct-play":
      return "Lecture directe";
    case "direct-stream":
      return "Flux direct";
    case "transcode":
      return "Transcodage";
    default:
      return "Lecture";
  }
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
  onToggleOrientation,
  isLandscape = false,
  onScrubbingChange,
  onScrubMove,
  brightness,
  onBrightnessChange,
  volume,
  onVolumeChange,
  autoHideMs = 4000,
  playbackMode,
  playbackRate,
  onCycleSpeed
}: CinematicOverlayProps) {
  const insets = useSafeAreaInsets();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isPlaying && visible && !moreOpen && autoHideMs > 0) {
      timerRef.current = setTimeout(() => {
        onToggleVisible();
      }, autoHideMs);
    }
  };

  useEffect(() => {
    resetTimer();
    if (!visible) {
      setMoreOpen(false);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [visible, isPlaying, moreOpen]);

  const handleBrightnessChange = (value: number) => {
    resetTimer();
    onBrightnessChange(value);
  };

  const handleVolumeChange = (value: number) => {
    resetTimer();
    onVolumeChange(value);
  };

  if (!visible) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.overlayContainer,
        {
          paddingTop: Math.max(insets.top, spacing.md) + 4,
          paddingBottom: Math.max(insets.bottom, spacing.md) + 4,
          paddingLeft: Math.max(insets.left, spacing.lg),
          paddingRight: Math.max(insets.right, spacing.lg)
        }
      ]}
      testID="cinematic-overlay"
    >
      <View style={styles.topBar} pointerEvents="box-none" testID="overlay-top-bar">
        <FinoraIconButton
          accessibilityLabel="Retour"
          onPress={onBack}
          size={40}
          backgroundColor="rgba(20, 20, 26, 0.68)"
          testID="overlay-back-button"
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </FinoraIconButton>

        <View style={styles.titleColumn} pointerEvents="none">
          {Boolean(seriesTitle) && (
            <FinoraText variant="caption" style={styles.seriesText} numberOfLines={1}>
              {seriesTitle}
            </FinoraText>
          )}
          <FinoraText variant="body" style={styles.titleText} numberOfLines={1}>
            {title}
          </FinoraText>
        </View>

        <View style={styles.headerActions} pointerEvents="box-none">
          {Boolean(onCycleSpeed) && (
            <FinoraIconButton
              accessibilityLabel={`Vitesse de lecture ${playbackRate || 1}x`}
              onPress={() => {
                resetTimer();
                onCycleSpeed?.();
              }}
              size={40}
              backgroundColor="rgba(20, 20, 26, 0.68)"
              testID="overlay-speed-button"
            >
              <FinoraText variant="caption" style={styles.speedText}>
                {playbackRate || 1}x
              </FinoraText>
            </FinoraIconButton>
          )}

          <FinoraIconButton
            accessibilityLabel="Audio, sous-titres et qualité"
            onPress={() => {
              resetTimer();
              setMoreOpen(false);
              onOpenTracks();
            }}
            size={40}
            backgroundColor="rgba(20, 20, 26, 0.68)"
            testID="overlay-tracks-button"
          >
            <Ionicons name="chatbubble-ellipses-outline" size={19} color="#FFFFFF" />
          </FinoraIconButton>

          {(onOpenStats || onToggleOrientation) && (
            <FinoraIconButton
              accessibilityLabel="Plus d'options"
              accessibilityState={{ expanded: moreOpen }}
              onPress={() => {
                if (timerRef.current) clearTimeout(timerRef.current);
                setMoreOpen((prev) => !prev);
              }}
              size={40}
              backgroundColor={moreOpen ? "rgba(255, 255, 255, 0.16)" : "rgba(20, 20, 26, 0.68)"}
              testID="overlay-more-button"
            >
              <Ionicons name="ellipsis-horizontal" size={21} color="#FFFFFF" />
            </FinoraIconButton>
          )}

          {moreOpen && (
            <View style={styles.moreMenu} testID="overlay-more-menu">
              <View style={styles.modeRow}>
                <View
                  style={[
                    styles.modeDot,
                    playbackMode === "transcode" && styles.modeDotTranscode
                  ]}
                />
                <FinoraText variant="caption" style={styles.modeText} numberOfLines={1}>
                  {playbackModeLabel(playbackMode)}
                </FinoraText>
              </View>

              {Boolean(onToggleOrientation) && (
                <Pressable
                  style={({ pressed }) => [styles.moreMenuRow, pressed && styles.moreMenuRowPressed]}
                  onPress={() => {
                    setMoreOpen(false);
                    onToggleOrientation?.();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={isLandscape ? "Passer en portrait" : "Passer en paysage"}
                  testID="overlay-orientation-button"
                >
                  <Ionicons
                    name={isLandscape ? "phone-portrait-outline" : "scan-outline"}
                    size={20}
                    color="#FFFFFF"
                  />
                  <FinoraText variant="body" style={styles.moreMenuLabel}>
                    {isLandscape ? "Mode portrait" : "Mode paysage"}
                  </FinoraText>
                </Pressable>
              )}

              {Boolean(onOpenStats) && (
                <Pressable
                  style={({ pressed }) => [styles.moreMenuRow, pressed && styles.moreMenuRowPressed]}
                  onPress={() => {
                    setMoreOpen(false);
                    onOpenStats?.();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Informations techniques"
                  testID="overlay-stats-button"
                >
                  <Ionicons name="information-circle-outline" size={20} color="#FFFFFF" />
                  <FinoraText variant="body" style={styles.moreMenuLabel}>
                    Infos techniques
                  </FinoraText>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>

      <View style={styles.centerControls} pointerEvents="box-none" testID="overlay-center-controls">
        <FinoraIconButton
          accessibilityLabel="Reculer de 10 secondes"
          onPress={() => {
            resetTimer();
            onSeekBy(-10);
          }}
          size={50}
          backgroundColor="rgba(20, 20, 26, 0.68)"
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
          accessibilityLabel={isPlaying ? "Pause" : "Lire"}
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
          accessibilityLabel="Avancer de 10 secondes"
          onPress={() => {
            resetTimer();
            onSeekBy(10);
          }}
          size={50}
          backgroundColor="rgba(20, 20, 26, 0.68)"
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

      <View style={styles.bottomBar} pointerEvents="box-none" testID="overlay-bottom-bar">
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

      <View
        style={[styles.sideRail, { left: Math.max(insets.left, spacing.sm) }]}
        pointerEvents="box-none"
      >
        <VerticalSlider
          value={brightness}
          onValueChange={handleBrightnessChange}
          iconName={brightness < 0.3 ? "sunny-outline" : "sunny"}
          label="Luminosité"
          accessibilityLabel="Luminosité"
          testID="brightness-slider"
        />
      </View>

      <View
        style={[styles.sideRail, { right: Math.max(insets.right, spacing.sm) }]}
        pointerEvents="box-none"
      >
        <VerticalSlider
          value={volume}
          onValueChange={handleVolumeChange}
          iconName={volume === 0 ? "volume-mute" : volume < 0.5 ? "volume-low" : "volume-high"}
          label="Son"
          accessibilityLabel="Volume"
          testID="volume-slider"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: "space-between",
    padding: spacing.lg,
    zIndex: 20
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    zIndex: 30
  },
  titleColumn: {
    flex: 1,
    minWidth: 0,
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
    alignItems: "center",
    gap: 6,
    position: "relative"
  },
  speedText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  },
  moreMenu: {
    position: "absolute",
    top: 48,
    right: 0,
    width: 190,
    padding: 8,
    borderRadius: 14,
    backgroundColor: "rgba(18, 18, 26, 0.97)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 20
  },
  modeRow: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 4
  },
  modeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#34C759",
    marginRight: 8
  },
  modeDotTranscode: {
    backgroundColor: "#FF9500"
  },
  modeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600"
  },
  moreMenuRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 9,
    paddingHorizontal: 10,
    gap: 10
  },
  moreMenuRowPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.08)"
  },
  moreMenuLabel: {
    color: "#FFFFFF",
    fontWeight: "600"
  },
  centerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  playPauseButton: {
    marginHorizontal: spacing.xl
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
  },
  sideRail: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center"
  }
});
