import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { FinoraIconButton } from "../../../design-system/components/FinoraIconButton";
import { Ionicons } from "@expo/vector-icons";
import { TimelineScrubber } from "./TimelineScrubber";
import { VerticalSlider } from "./VerticalSlider";
import { colors, spacing } from "../../../design-system/tokens";
import { useTranslation } from "../../../i18n";
import { ChapterMarker } from "../../../types/media";

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
  chapters?: ChapterMarker[];
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
  onTogglePiP?: () => void;
  hasNextEpisode?: boolean;
  onPlayNextEpisode?: () => void;
  nextEpisodeLabel?: string;
}

function getPlaybackModeLabel(mode: PlaybackModeLabel | undefined, t: (key: string) => string): string {
  switch (mode) {
    case "direct-play":
      return t("player.playbackModeDirectPlay");
    case "direct-stream":
      return t("player.playbackModeDirectStream");
    case "transcode":
      return t("player.playbackModeTranscode");
    default:
      return t("player.directPlay");
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
  chapters,
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
  onCycleSpeed,
  onTogglePiP,
  hasNextEpisode,
  onPlayNextEpisode,
  nextEpisodeLabel
}: CinematicOverlayProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const isAdjustingSliderRef = useRef(false);

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isPlaying && visible && !moreOpen && !isAdjustingSliderRef.current && autoHideMs > 0) {
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

  const handleSlidingChange = (isSliding: boolean) => {
    isAdjustingSliderRef.current = isSliding;
    if (isSliding) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    } else {
      resetTimer();
    }
  };

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
      style={styles.overlayContainer}
      testID="cinematic-overlay"
    >
      {/* Top Vignette Gradient */}
      <LinearGradient
        colors={["rgba(6, 6, 10, 0.88)", "rgba(8, 8, 12, 0.65)", "rgba(8, 8, 12, 0.0)"]}
        locations={[0, 0.6, 1]}
        style={[
          styles.topGradient,
          { height: Math.max(insets.top, spacing.md) + 80 }
        ]}
        pointerEvents="none"
      />

      {/* Bottom Vignette Gradient */}
      <LinearGradient
        colors={["rgba(8, 8, 12, 0.0)", "rgba(8, 8, 12, 0.65)", "rgba(6, 6, 10, 0.92)"]}
        locations={[0, 0.45, 1]}
        style={[
          styles.bottomGradient,
          { height: Math.max(insets.bottom, spacing.md) + 110 }
        ]}
        pointerEvents="none"
      />

      {/* ZONE HAUTE : Header Top Bar */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top, spacing.md) + 2,
            paddingLeft: Math.max(insets.left, spacing.lg),
            paddingRight: Math.max(insets.right, spacing.lg)
          }
        ]}
        pointerEvents="box-none"
        testID="overlay-top-bar"
      >
        <FinoraIconButton
          accessibilityLabel={t("player.backA11y")}
          onPress={onBack}
          size={42}
          backgroundColor="rgba(18, 18, 24, 0.65)"
          style={styles.glassButton}
          testID="overlay-back-button"
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </FinoraIconButton>

        <View style={styles.titleColumn} pointerEvents="none">
          {Boolean(seriesTitle) && (
            <View style={styles.seriesRow}>
              <View style={styles.seriesDot} />
              <FinoraText variant="caption" style={styles.seriesText} numberOfLines={1}>
                {seriesTitle}
              </FinoraText>
            </View>
          )}
          <FinoraText variant="body" style={styles.titleText} numberOfLines={1}>
            {title}
          </FinoraText>
        </View>

        <View style={styles.headerActions} pointerEvents="box-none">
          {Boolean(onCycleSpeed) && (
            <FinoraIconButton
              accessibilityLabel={t("player.playbackSpeedA11y", { speed: `${playbackRate || 1}x` })}
              onPress={() => {
                resetTimer();
                onCycleSpeed?.();
              }}
              size={42}
              backgroundColor="rgba(18, 18, 24, 0.65)"
              style={styles.glassButton}
              testID="overlay-speed-button"
            >
              <View style={styles.speedBadge}>
                <FinoraText variant="caption" style={styles.speedText}>
                  {playbackRate || 1}x
                </FinoraText>
              </View>
            </FinoraIconButton>
          )}

          {Boolean(hasNextEpisode && onPlayNextEpisode) && (
            <FinoraIconButton
              accessibilityLabel={t("player.nextEpisodeA11y")}
              onPress={() => {
                resetTimer();
                onPlayNextEpisode?.();
              }}
              size={42}
              backgroundColor="rgba(18, 18, 24, 0.65)"
              style={styles.glassButton}
              testID="overlay-next-episode-button"
            >
              <Ionicons name="play-skip-forward" size={20} color="#FFFFFF" />
            </FinoraIconButton>
          )}

          <FinoraIconButton
            accessibilityLabel={t("player.tracksA11y")}
            onPress={() => {
              resetTimer();
              setMoreOpen(false);
              onOpenTracks();
            }}
            size={42}
            backgroundColor="rgba(18, 18, 24, 0.65)"
            style={styles.glassButton}
            testID="overlay-tracks-button"
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFFFFF" />
          </FinoraIconButton>

          {Boolean(onTogglePiP) && (
            <FinoraIconButton
              accessibilityLabel={t("player.pipA11y")}
              onPress={() => {
                resetTimer();
                setMoreOpen(false);
                onTogglePiP?.();
              }}
              size={42}
              backgroundColor="rgba(18, 18, 24, 0.65)"
              style={styles.glassButton}
              testID="overlay-pip-button"
            >
              <Ionicons name="copy-outline" size={20} color="#FFFFFF" />
            </FinoraIconButton>
          )}

          {(onOpenStats || onToggleOrientation) && (
            <FinoraIconButton
              accessibilityLabel={t("player.moreOptionsA11y")}
              accessibilityState={{ expanded: moreOpen }}
              onPress={() => {
                if (timerRef.current) clearTimeout(timerRef.current);
                setMoreOpen((prev) => !prev);
              }}
              size={42}
              backgroundColor={moreOpen ? "rgba(255, 255, 255, 0.22)" : "rgba(18, 18, 24, 0.65)"}
              style={styles.glassButton}
              testID="overlay-more-button"
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
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
                  {getPlaybackModeLabel(playbackMode, t)}
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
                  accessibilityLabel={isLandscape ? t("player.portraitMode") : t("player.landscapeMode")}
                  testID="overlay-orientation-button"
                >
                  <Ionicons
                    name={isLandscape ? "phone-portrait-outline" : "scan-outline"}
                    size={20}
                    color="#FFFFFF"
                  />
                  <FinoraText variant="body" style={styles.moreMenuLabel}>
                    {isLandscape ? t("player.portraitMode") : t("player.landscapeMode")}
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
                  accessibilityLabel={t("player.technicalInfo")}
                  testID="overlay-stats-button"
                >
                  <Ionicons name="information-circle-outline" size={20} color="#FFFFFF" />
                  <FinoraText variant="body" style={styles.moreMenuLabel}>
                    {t("player.technicalInfo")}
                  </FinoraText>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>

      {/* ZONE CENTRALE : Hero Controls Triad */}
      <View style={styles.centerControls} pointerEvents="box-none" testID="overlay-center-controls">
        {/* Seek Backward 10s */}
        <FinoraIconButton
          accessibilityLabel={t("player.seekBackA11y")}
          onPress={() => {
            resetTimer();
            onSeekBy(-10);
          }}
          size={56}
          backgroundColor="rgba(16, 16, 24, 0.65)"
          style={styles.heroSecondaryButton}
          testID="overlay-seek-back-button"
        >
          <View style={styles.skipContainer}>
            <Ionicons name="arrow-undo" size={20} color="#FFFFFF" />
            <FinoraText variant="caption" style={styles.skipNumber}>
              10
            </FinoraText>
          </View>
        </FinoraIconButton>

        {/* Hero Play / Pause with Glow Aura */}
        <View style={styles.heroPlayPauseWrapper}>
          <View style={[styles.heroPlayPauseGlow, !isPlaying && styles.heroPlayPauseGlowPaused]} pointerEvents="none" />
          <FinoraIconButton
            accessibilityLabel={isPlaying ? t("player.pauseA11y") : t("player.playA11y")}
            onPress={() => {
              resetTimer();
              onPlayPause();
            }}
            size={74}
            backgroundColor={colors.primary}
            style={styles.playPauseButton}
            testID="overlay-play-pause-button"
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={36}
              color="#FFFFFF"
              style={!isPlaying ? { marginLeft: 4 } : undefined}
            />
          </FinoraIconButton>
        </View>

        {/* Seek Forward 10s */}
        <FinoraIconButton
          accessibilityLabel={t("player.seekForwardA11y")}
          onPress={() => {
            resetTimer();
            onSeekBy(10);
          }}
          size={56}
          backgroundColor="rgba(16, 16, 24, 0.65)"
          style={styles.heroSecondaryButton}
          testID="overlay-seek-forward-button"
        >
          <View style={styles.skipContainer}>
            <Ionicons name="arrow-redo" size={20} color="#FFFFFF" />
            <FinoraText variant="caption" style={styles.skipNumber}>
              10
            </FinoraText>
          </View>
        </FinoraIconButton>
      </View>

      {/* ZONE BASSE : Timeline & Actions */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, spacing.md) + 2,
            paddingLeft: Math.max(insets.left, spacing.lg) + 72,
            paddingRight: Math.max(insets.right, spacing.lg) + 72
          }
        ]}
        pointerEvents="box-none"
        testID="overlay-bottom-bar"
      >
        <TimelineScrubber
          currentTimeSeconds={currentTimeSeconds}
          durationSeconds={durationSeconds}
          bufferedSeconds={bufferedSeconds}
          chapters={chapters}
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

      {/* Rails latéraux : Luminosité & Volume tactiles */}
      <View
        style={[styles.sideRail, { left: Math.max(insets.left + spacing.md, 24) }]}
        pointerEvents="box-none"
      >
        <VerticalSlider
          value={brightness}
          onValueChange={handleBrightnessChange}
          onSlidingChange={handleSlidingChange}
          iconName={brightness < 0.3 ? "sunny-outline" : "sunny"}
          label={t("player.brightness")}
          accessibilityLabel={t("player.brightnessA11y")}
          testID="brightness-slider"
        />
      </View>

      <View
        style={[styles.sideRail, { right: Math.max(insets.right + spacing.md, 24) }]}
        pointerEvents="box-none"
      >
        <VerticalSlider
          value={volume}
          onValueChange={handleVolumeChange}
          onSlidingChange={handleSlidingChange}
          iconName={volume === 0 ? "volume-mute" : volume < 0.5 ? "volume-low" : "volume-high"}
          label={t("player.volume")}
          accessibilityLabel={t("player.volumeA11y")}
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
    zIndex: 20
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    zIndex: 30
  },
  glassButton: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3
  },
  titleColumn: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: spacing.md
  },
  seriesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2
  },
  seriesDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
    marginRight: 6
  },
  seriesText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2
  },
  titleText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    position: "relative"
  },
  speedBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4
  },
  speedText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  },
  moreMenu: {
    position: "absolute",
    top: 50,
    right: 0,
    width: 204,
    padding: 8,
    borderRadius: 16,
    backgroundColor: "rgba(16, 16, 22, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 20
  },
  modeRow: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 6
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
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 12
  },
  moreMenuRowPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.08)"
  },
  moreMenuLabel: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13
  },
  centerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 25
  },
  heroSecondaryButton: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6
  },
  heroPlayPauseWrapper: {
    marginHorizontal: spacing.xl,
    justifyContent: "center",
    alignItems: "center"
  },
  heroPlayPauseGlow: {
    position: "absolute",
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: colors.primary,
    opacity: 0.25,
    transform: [{ scale: 1.08 }]
  },
  heroPlayPauseGlowPaused: {
    opacity: 0.15
  },
  playPauseButton: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10
  },
  skipContainer: {
    alignItems: "center",
    justifyContent: "center"
  },
  skipNumber: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 1
  },
  bottomBar: {
    width: "100%",
    zIndex: 30
  },
  sideRail: {
    position: "absolute",
    top: 95,
    bottom: 95,
    justifyContent: "center",
    zIndex: 28
  }
});
