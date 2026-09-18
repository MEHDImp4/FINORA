import React, { useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  LayoutChangeEvent
} from "react-native";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";
import { hapticService } from "../../../core/feedback/hapticService";
import { useTranslation } from "../../../i18n";
import { ChapterMarker } from "../../../types/media";

export interface TimelineScrubberProps {
  currentTimeSeconds: number;
  durationSeconds: number;
  bufferedSeconds?: number;
  chapters?: ChapterMarker[];
  onSeek: (seconds: number) => void;
  onScrubbingChange?: (isScrubbing: boolean) => void;
  onScrubMove?: (seconds: number, percent: number) => void;
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) {
    return "0:00";
  }

  const s = Math.floor(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  const paddedSecs = secs < 10 ? `0${secs}` : `${secs}`;

  if (hrs > 0) {
    const paddedMins = mins < 10 ? `0${mins}` : `${mins}`;
    return `${hrs}:${paddedMins}:${paddedSecs}`;
  }

  return `${mins}:${paddedSecs}`;
}

export function formatRemainingTime(currentSeconds: number, durationSeconds: number): string {
  if (durationSeconds <= 0 || currentSeconds > durationSeconds) {
    return "-0:00";
  }
  const remaining = durationSeconds - currentSeconds;
  return `-${formatTime(remaining)}`;
}

export function TimelineScrubber({
  currentTimeSeconds,
  durationSeconds,
  bufferedSeconds = 0,
  chapters = [],
  onSeek,
  onScrubbingChange,
  onScrubMove
}: TimelineScrubberProps) {
  const { t } = useTranslation();
  const [trackWidth, setTrackWidth] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(0);

  const isScrubbingRef = useRef(false);
  const trackWidthRef = useRef(0);
  const durationRef = useRef(durationSeconds);
  durationRef.current = durationSeconds;

  const initialTouchXRef = useRef(0);
  const scrubPositionRef = useRef(0);

  const effectiveSeconds = isScrubbing ? scrubPosition : currentTimeSeconds;
  const progressPercent = durationSeconds > 0 ? Math.min(1, Math.max(0, effectiveSeconds / durationSeconds)) : 0;
  const bufferPercent = durationSeconds > 0 ? Math.min(1, Math.max(0, bufferedSeconds / durationSeconds)) : 0;

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    setTrackWidth(width);
    trackWidthRef.current = width;
  };

  const calculateSecondsFromTouch = useCallback((touchX: number): { seconds: number; percent: number } => {
    const width = trackWidthRef.current;
    if (width <= 0) return { seconds: 0, percent: 0 };
    const clampedX = Math.max(0, Math.min(width, touchX));
    const percent = clampedX / width;
    const seconds = percent * durationRef.current;
    return { seconds, percent };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        isScrubbingRef.current = true;
        setIsScrubbing(true);
        onScrubbingChange?.(true);

        const startX = evt.nativeEvent.locationX;
        initialTouchXRef.current = startX;

        const { seconds, percent } = calculateSecondsFromTouch(startX);
        scrubPositionRef.current = seconds;
        setScrubPosition(seconds);
        onScrubMove?.(seconds, percent);
        hapticService.selection();
      },
      onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const currentX = initialTouchXRef.current + gestureState.dx;
        const { seconds, percent } = calculateSecondsFromTouch(currentX);

        scrubPositionRef.current = seconds;
        setScrubPosition(seconds);
        onScrubMove?.(seconds, percent);
      },
      onPanResponderRelease: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        isScrubbingRef.current = false;
        setIsScrubbing(false);
        onScrubbingChange?.(false);

        const currentX = initialTouchXRef.current + gestureState.dx;
        const { seconds } = calculateSecondsFromTouch(currentX);

        hapticService.impactLight();
        onSeek(seconds);
      },
      onPanResponderTerminate: () => {
        isScrubbingRef.current = false;
        setIsScrubbing(false);
        onScrubbingChange?.(false);
      }
    })
  ).current;

  // Compute chapter notch positions (excluding start at 0)
  const chapterNotches = React.useMemo(() => {
    if (!chapters || chapters.length === 0 || durationSeconds <= 0) return [];
    return chapters
      .map((ch) => {
        const sec = ch.startPositionTicks / 10000000;
        const ratio = sec / durationSeconds;
        return {
          name: ch.name,
          ratio,
          isIntro: ch.markerType === "IntroStart" || ch.name.toLowerCase().includes("intro")
        };
      })
      .filter((n) => n.ratio > 0.01 && n.ratio < 0.99);
  }, [chapters, durationSeconds]);

  return (
    <View
      style={styles.container}
      testID="timeline-scrubber"
      accessibilityRole="adjustable"
      accessibilityLabel={t("player.scrubberA11y")}
      accessibilityValue={{
        min: 0,
        max: Math.round(durationSeconds),
        now: Math.round(effectiveSeconds),
        text: t("player.scrubberValueText", {
          current: Math.round(effectiveSeconds),
          total: Math.round(durationSeconds)
        })
      }}
    >
      {/* Floating scrubbing time bubble if user is dragging */}
      {isScrubbing && (
        <View style={styles.floatingScrubBubble}>
          <FinoraText variant="caption" style={styles.floatingScrubText}>
            {formatTime(effectiveSeconds)}
          </FinoraText>
        </View>
      )}

      {/* Main Scrubber Line: Track Bar + Remaining Time inline (Netflix style) */}
      <View style={styles.scrubberRow}>
        {/* Progress Track Bar */}
        <View
          style={styles.touchArea}
          onLayout={handleLayout}
          {...panResponder.panHandlers}
          testID="scrubber-touch-area"
        >
          <View style={[styles.trackBackground, isScrubbing && styles.trackBackgroundScrubbing]} pointerEvents="none">
            {/* Buffer Track */}
            <View
              style={[styles.bufferTrack, { width: `${bufferPercent * 100}%` }]}
              testID="scrubber-buffer"
            />
            {/* Played Progress Track (Netflix red) */}
            <View
              style={[styles.progressTrack, { width: `${progressPercent * 100}%` }]}
              testID="scrubber-progress"
            />

            {/* Chapter markers along track */}
            {chapterNotches.map((notch, idx) => (
              <View
                key={`chapter-notch-${idx}`}
                style={[
                  styles.chapterNotch,
                  { left: `${notch.ratio * 100}%` },
                  notch.isIntro && styles.chapterNotchIntro
                ]}
              />
            ))}
          </View>

          {/* Scrubber Thumb (Netflix solid red circle) */}
          {trackWidth > 0 && (
            <View
              style={[
                styles.thumbWrapper,
                {
                  left: Math.max(0, Math.min(trackWidth - 16, trackWidth * progressPercent - 8)),
                  transform: [{ scale: isScrubbing ? 1.3 : 1 }]
                }
              ]}
              pointerEvents="none"
              testID="scrubber-thumb"
            >
              <View style={styles.thumbRedCore} />
            </View>
          )}
        </View>

        {/* Right Remaining Time label */}
        <View style={styles.remainingTimeWrapper}>
          <FinoraText variant="caption" style={styles.remainingTimeText} testID="remaining-time-label">
            {formatRemainingTime(effectiveSeconds, durationSeconds)}
          </FinoraText>
        </View>
      </View>

      {/* Accessible current-time element for screen readers & tests */}
      <View style={styles.srOnly} pointerEvents="none">
        <FinoraText variant="caption" style={styles.srText} testID="current-time-label">
          {formatTime(effectiveSeconds)}
        </FinoraText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingVertical: 2
  },
  floatingScrubBubble: {
    alignSelf: "center",
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(18, 18, 24, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)"
  },
  floatingScrubText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700"
  },
  scrubberRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%"
  },
  touchArea: {
    flex: 1,
    height: 36,
    justifyContent: "center"
  },
  trackBackground: {
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.28)",
    borderRadius: 1.5,
    overflow: "hidden",
    position: "relative"
  },
  trackBackgroundScrubbing: {
    height: 5,
    borderRadius: 2.5
  },
  bufferTrack: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.40)",
    borderRadius: 2
  },
  progressTrack: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#E50914",
    borderRadius: 2
  },
  chapterNotch: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    zIndex: 2
  },
  chapterNotchIntro: {
    backgroundColor: "rgba(255, 184, 0, 0.8)"
  },
  thumbWrapper: {
    position: "absolute",
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center"
  },
  thumbRedCore: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#E50914",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 4
  },
  remainingTimeWrapper: {
    marginLeft: 12,
    justifyContent: "center"
  },
  remainingTimeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3
  },
  srOnly: {
    position: "absolute",
    opacity: 0,
    width: 0,
    height: 0,
    overflow: "hidden"
  },
  srText: {
    color: "#FFFFFF",
    fontSize: 1
  }
});
