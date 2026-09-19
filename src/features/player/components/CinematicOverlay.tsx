import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  Modal
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

  const opacityAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: visible ? 1 : 0,
      duration: 180,
      useNativeDriver: true
    }).start();
  }, [visible]);

  const formattedHeaderTitle = seriesTitle ? `${seriesTitle} "${title}"` : title;

  return (
    <Animated.View
      pointerEvents={visible ? "box-none" : "none"}
      style={[styles.overlayContainer, { opacity: opacityAnim }]}
      testID="cinematic-overlay"
    >
      {/* Global Fullscreen Dimming Scrim (Netflix style: smooth dimming to make all buttons pop) */}
      <View style={styles.backdropScrim} pointerEvents="none" />

      {/* Top Vignette Gradient */}
      <LinearGradient
        colors={["rgba(4, 4, 8, 0.75)", "rgba(6, 6, 10, 0.35)", "rgba(6, 6, 10, 0.0)"]}
        locations={[0, 0.6, 1]}
        style={[
          styles.topGradient,
          { height: Math.max(insets.top, spacing.md) + 90 }
        ]}
        pointerEvents="none"
      />

      {/* Bottom Vignette Gradient */}
      <LinearGradient
        colors={["rgba(6, 6, 10, 0.0)", "rgba(6, 6, 10, 0.45)", "rgba(4, 4, 8, 0.85)"]}
        locations={[0, 0.4, 1]}
        style={[
          styles.bottomGradient,
          { height: Math.max(insets.bottom, spacing.md) + 130 }
        ]}
        pointerEvents="none"
      />

      {/* ZONE HAUTE : Header Top Bar (Netflix style: Back left, Centered Title, Symmetric right spacer) */}
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
          backgroundColor="transparent"
          style={styles.topTransparentButton}
          testID="overlay-back-button"
        >
          <Ionicons name="arrow-back" size={26} color="#FFFFFF" style={styles.iconShadow} />
        </FinoraIconButton>

        {/* Centered Title */}
        <View style={styles.titleColumn} pointerEvents="none">
          <FinoraText variant="body" style={styles.netflixTitleText} numberOfLines={1}>
            {formattedHeaderTitle}
          </FinoraText>
        </View>

        {/* Right Symmetric Spacer to keep Title perfectly centered */}
        <View style={styles.topBarSpacer} pointerEvents="none" />
      </View>

      {/* ZONE CENTRALE : Hero Controls Triad (Clean, transparent, Netflix spacing) */}
      <View style={styles.centerControls} pointerEvents="box-none" testID="overlay-center-controls">
        {/* Seek Backward 10s */}
        <FinoraIconButton
          accessibilityLabel={t("player.seekBackA11y")}
          onPress={() => {
            resetTimer();
            onSeekBy(-10);
          }}
          size={64}
          backgroundColor="transparent"
          style={styles.heroTransparentButton}
          testID="overlay-seek-back-button"
        >
          <View style={styles.skipContainer}>
            <Ionicons name="arrow-undo" size={26} color="#FFFFFF" style={styles.iconShadow} />
            <FinoraText variant="caption" style={styles.skipNumber}>
              10
            </FinoraText>
          </View>
        </FinoraIconButton>

        {/* Hero Play / Pause */}
        <FinoraIconButton
          accessibilityLabel={isPlaying ? t("player.pauseA11y") : t("player.playA11y")}
          onPress={() => {
            resetTimer();
            onPlayPause();
          }}
          size={80}
          backgroundColor="transparent"
          style={styles.heroTransparentButton}
          testID="overlay-play-pause-button"
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={52}
            color="#FFFFFF"
            style={[styles.iconShadow, !isPlaying ? { marginLeft: 6 } : undefined]}
          />
        </FinoraIconButton>

        {/* Seek Forward 10s */}
        <FinoraIconButton
          accessibilityLabel={t("player.seekForwardA11y")}
          onPress={() => {
            resetTimer();
            onSeekBy(10);
          }}
          size={64}
          backgroundColor="transparent"
          style={styles.heroTransparentButton}
          testID="overlay-seek-forward-button"
        >
          <View style={styles.skipContainer}>
            <Ionicons name="arrow-redo" size={26} color="#FFFFFF" style={styles.iconShadow} />
            <FinoraText variant="caption" style={styles.skipNumber}>
              10
            </FinoraText>
          </View>
        </FinoraIconButton>
      </View>

      {/* ZONE BASSE : Timeline & Netflix Bottom Action Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, spacing.sm) + (isLandscape ? 4 : 10),
            paddingLeft: Math.max(insets.left, isLandscape ? spacing.lg + 16 : spacing.md),
            paddingRight: Math.max(insets.right, isLandscape ? spacing.lg + 16 : spacing.md)
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

        {/* Bottom Actions Bar (Adaptive Portrait / Landscape Netflix layout) */}
        <View style={styles.bottomActionsRow} pointerEvents="box-none">
          {Boolean(onCycleSpeed) && (
            <Pressable
              style={({ pressed }) => [
                styles.bottomActionItem,
                !isLandscape && styles.bottomActionItemPortrait,
                pressed && styles.actionItemPressed
              ]}
              onPress={() => {
                resetTimer();
                onCycleSpeed?.();
              }}
              accessibilityLabel={t("player.playbackSpeedA11y", { speed: `${playbackRate || 1}x` })}
              testID="overlay-speed-button"
            >
              <Ionicons name="speedometer-outline" size={19} color="#FFFFFF" style={styles.iconShadow} />
              <FinoraText
                variant="caption"
                style={isLandscape ? styles.bottomActionText : styles.bottomActionTextPortrait}
              >
                {playbackRate || 1}x
              </FinoraText>
            </Pressable>
          )}

          {Boolean(hasNextEpisode && onPlayNextEpisode) && (
            <Pressable
              style={({ pressed }) => [
                styles.bottomActionItem,
                !isLandscape && styles.bottomActionItemPortrait,
                pressed && styles.actionItemPressed
              ]}
              onPress={() => {
                resetTimer();
                onPlayNextEpisode?.();
              }}
              accessibilityLabel={t("player.nextEpisodeA11y")}
              testID="overlay-next-episode-button"
            >
              <Ionicons name="play-skip-forward-outline" size={20} color="#FFFFFF" style={styles.iconShadow} />
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.bottomActionItem,
              !isLandscape && styles.bottomActionItemPortrait,
              pressed && styles.actionItemPressed
            ]}
            onPress={() => {
              resetTimer();
              setMoreOpen(false);
              onOpenTracks();
            }}
            accessibilityLabel={t("player.tracksA11y")}
            testID="overlay-tracks-button"
          >
            <Ionicons name="chatbubble-ellipses-outline" size={19} color="#FFFFFF" style={styles.iconShadow} />
            <FinoraText
              variant="caption"
              style={isLandscape ? styles.bottomActionText : styles.bottomActionTextPortrait}
              numberOfLines={2}
            >
              {t("player.audioSubtitles") || "Audio & Sous-titres"}
            </FinoraText>
          </Pressable>

          {Boolean(onTogglePiP) && (
            <Pressable
              style={({ pressed }) => [
                styles.bottomActionItem,
                !isLandscape && styles.bottomActionItemPortrait,
                pressed && styles.actionItemPressed
              ]}
              onPress={() => {
                resetTimer();
                setMoreOpen(false);
                onTogglePiP?.();
              }}
              accessibilityLabel={t("player.pipA11y")}
              testID="overlay-pip-button"
            >
              <Ionicons name="copy-outline" size={19} color="#FFFFFF" style={styles.iconShadow} />
              <FinoraText
                variant="caption"
                style={isLandscape ? styles.bottomActionText : styles.bottomActionTextPortrait}
              >
                PiP
              </FinoraText>
            </Pressable>
          )}

          {Boolean(onOpenStats) && (
            <Pressable
              style={({ pressed }) => [
                styles.bottomActionItem,
                !isLandscape && styles.bottomActionItemPortrait,
                pressed && styles.actionItemPressed
              ]}
              onPress={() => {
                if (timerRef.current) clearTimeout(timerRef.current);
                setMoreOpen(true);
              }}
              accessibilityLabel={t("player.moreOptionsA11y")}
              testID="overlay-more-button"
            >
              <Ionicons name="options-outline" size={19} color="#FFFFFF" style={styles.iconShadow} />
              <FinoraText
                variant="caption"
                style={isLandscape ? styles.bottomActionText : styles.bottomActionTextPortrait}
              >
                {t("player.moreOptions") || "Plus"}
              </FinoraText>
            </Pressable>
          )}
        </View>
      </View>

      {/* Cinematic More Options Modal */}
      <Modal
        visible={moreOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMoreOpen(false)}
        testID="more-options-modal"
      >
        <View style={styles.moreModalBackdrop}>
          <Pressable
            style={styles.moreModalDismiss}
            onPress={() => setMoreOpen(false)}
            testID="more-modal-backdrop-dismiss"
          />

          <View
            style={[
              styles.moreSheetContainer,
              { paddingBottom: Math.max(insets.bottom, spacing.lg) + 8 }
            ]}
          >
            <View style={styles.moreHandleContainer} pointerEvents="none">
              <View style={styles.moreHandleBar} />
            </View>

            <View style={styles.moreSheetHeader}>
              <FinoraText variant="title" style={styles.moreSheetTitle}>
                {t("player.moreOptionsTitle") || "Plus d'options"}
              </FinoraText>
              <FinoraIconButton
                accessibilityLabel={t("common.close")}
                onPress={() => setMoreOpen(false)}
                size={36}
                backgroundColor="rgba(255, 255, 255, 0.08)"
                style={styles.moreCloseButton}
                testID="close-more-modal-button"
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </FinoraIconButton>
            </View>

            {/* Playback Mode Stream Info Card */}
            <View style={styles.modeCard}>
              <View style={[styles.modeDot, playbackMode === "transcode" && styles.modeDotTranscode]} />
              <View style={styles.modeTextCol}>
                <FinoraText variant="body" weight="700" style={styles.modeCardTitle}>
                  {getPlaybackModeLabel(playbackMode, t)}
                </FinoraText>
                <FinoraText variant="caption" style={styles.modeCardDesc}>
                  {playbackMode === "direct-play"
                    ? t("player.directPlayDesc")
                    : playbackMode === "direct-stream"
                    ? t("player.directStreamDesc")
                    : t("player.transcodeDesc")}
                </FinoraText>
              </View>
            </View>

            {/* Options List */}
            <View style={styles.moreActionsList}>
              {Boolean(onOpenStats) && (
                <Pressable
                  style={({ pressed }) => [
                    styles.moreActionRow,
                    pressed && styles.moreActionRowPressed
                  ]}
                  onPress={() => {
                    setMoreOpen(false);
                    onOpenStats?.();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t("player.technicalInfo")}
                  testID="overlay-stats-button"
                >
                  <View style={styles.moreIconBox}>
                    <Ionicons name="information-circle-outline" size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.moreActionTextCol}>
                    <FinoraText variant="body" style={styles.moreActionLabel}>
                      {t("player.technicalInfo")}
                    </FinoraText>
                    <FinoraText variant="caption" style={styles.moreActionSub}>
                      {t("player.technicalInfoDesc")}
                    </FinoraText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.3)" />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Rails latéraux décalés en hauteur : Luminosité (gauche) & Son (droite) */}
      <View
        style={[
          styles.leftRail,
          { left: Math.max(insets.left, isLandscape ? spacing.md + 8 : spacing.xs + 2) }
        ]}
        pointerEvents="box-none"
      >
        <VerticalSlider
          value={brightness}
          onValueChange={handleBrightnessChange}
          onSlidingChange={handleSlidingChange}
          iconName="sunny"
          label={t("player.brightness")}
          accessibilityLabel={t("player.brightnessA11y")}
          testID="brightness-slider"
        />
      </View>

      <View
        style={[
          styles.rightRail,
          { right: Math.max(insets.right, isLandscape ? spacing.md + 8 : spacing.xs + 2) }
        ]}
        pointerEvents="box-none"
      >
        <VerticalSlider
          value={volume}
          onValueChange={handleVolumeChange}
          onSlidingChange={handleSlidingChange}
          iconName="volume-high"
          label={t("player.volume")}
          accessibilityLabel={t("player.volumeA11y")}
          testID="volume-slider"
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: "space-between",
    zIndex: 20
  },
  backdropScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.42)",
    zIndex: 0
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
    justifyContent: "space-between",
    position: "relative",
    zIndex: 30
  },
  topTransparentButton: {
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center"
  },
  topBarSpacer: {
    width: 42,
    height: 42
  },
  titleColumn: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center"
  },
  netflixTitleText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 3
  },
  iconShadow: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.7,
    shadowRadius: 3
  },
  centerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 40,
    zIndex: 25
  },
  heroTransparentButton: {
    justifyContent: "center",
    alignItems: "center"
  },
  skipContainer: {
    alignItems: "center",
    justifyContent: "center"
  },
  skipNumber: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: -2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2
  },
  bottomBar: {
    width: "100%",
    zIndex: 30
  },
  bottomActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: 8,
    paddingTop: 4,
    width: "100%"
  },
  bottomActionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6
  },
  bottomActionItemPortrait: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 4,
    gap: 3,
    minWidth: 44,
    maxWidth: 86
  },
  actionItemPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.12)"
  },
  bottomActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2
  },
  bottomActionTextPortrait: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.1,
    textAlign: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2
  },
  leftRail: {
    position: "absolute",
    top: 100,
    bottom: 110,
    justifyContent: "center",
    zIndex: 28
  },
  rightRail: {
    position: "absolute",
    top: 100,
    bottom: 110,
    justifyContent: "center",
    zIndex: 28
  },
  moreModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    justifyContent: "flex-end"
  },
  moreModalDismiss: {
    flex: 1
  },
  moreSheetContainer: {
    backgroundColor: "rgba(12, 12, 16, 0.98)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: spacing.lg,
    paddingTop: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 24
  },
  moreHandleContainer: {
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 6
  },
  moreHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.22)"
  },
  moreSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    marginBottom: spacing.md
  },
  moreSheetTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.2
  },
  moreCloseButton: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)"
  },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: spacing.md
  },
  modeDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#34C759",
    marginRight: 12
  },
  modeDotTranscode: {
    backgroundColor: "#FF9500"
  },
  modeTextCol: {
    flex: 1
  },
  modeCardTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700"
  },
  modeCardDesc: {
    color: "rgba(255, 255, 255, 0.55)",
    fontSize: 12,
    marginTop: 2
  },
  moreActionsList: {
    gap: 8,
    paddingBottom: spacing.sm
  },
  moreActionRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)"
  },
  moreActionRowPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.1)"
  },
  moreIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14
  },
  moreActionTextCol: {
    flex: 1
  },
  moreActionLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600"
  },
  moreActionSub: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 12,
    marginTop: 2
  }
});
