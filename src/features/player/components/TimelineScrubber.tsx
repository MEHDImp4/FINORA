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

export interface TimelineScrubberProps {
  currentTimeSeconds: number;
  durationSeconds: number;
  bufferedSeconds?: number;
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
  onSeek,
  onScrubbingChange,
  onScrubMove
}: TimelineScrubberProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(0);

  const isScrubbingRef = useRef(false);
  const trackWidthRef = useRef(0);
  const durationRef = useRef(durationSeconds);
  durationRef.current = durationSeconds;

  const effectiveSeconds = isScrubbing ? scrubPosition : currentTimeSeconds;
  const progressPercent = durationSeconds > 0 ? Math.min(1, Math.max(0, effectiveSeconds / durationSeconds)) : 0;
  const bufferPercent = durationSeconds > 0 ? Math.min(1, Math.max(0, bufferedSeconds / durationSeconds)) : 0;

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    setTrackWidth(width);
    trackWidthRef.current = width;
  };

  const calculateSecondsFromLocation = useCallback((locationX: number): { seconds: number; percent: number } => {
    const width = trackWidthRef.current;
    if (width <= 0) return { seconds: 0, percent: 0 };
    const percent = Math.min(1, Math.max(0, locationX / width));
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

        const { seconds, percent } = calculateSecondsFromLocation(evt.nativeEvent.locationX);
        setScrubPosition(seconds);
        onScrubMove?.(seconds, percent);
      },
      onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const { seconds, percent } = calculateSecondsFromLocation(evt.nativeEvent.locationX);
        setScrubPosition(seconds);
        onScrubMove?.(seconds, percent);
      },
      onPanResponderRelease: (evt: GestureResponderEvent) => {
        isScrubbingRef.current = false;
        setIsScrubbing(false);
        onScrubbingChange?.(false);

        const { seconds } = calculateSecondsFromLocation(evt.nativeEvent.locationX);
        onSeek(seconds);
      },
      onPanResponderTerminate: () => {
        isScrubbingRef.current = false;
        setIsScrubbing(false);
        onScrubbingChange?.(false);
      }
    })
  ).current;

  return (
    <View style={styles.container} testID="timeline-scrubber">
      {/* Time Labels */}
      <View style={styles.labelsRow}>
        <FinoraText variant="caption" style={styles.timeLabel} testID="current-time-label">
          {formatTime(effectiveSeconds)}
        </FinoraText>
        <FinoraText variant="caption" style={styles.timeLabel} testID="remaining-time-label">
          {formatRemainingTime(effectiveSeconds, durationSeconds)}
        </FinoraText>
      </View>

      {/* Progress Track Bar */}
      <View
        style={styles.touchArea}
        onLayout={handleLayout}
        {...panResponder.panHandlers}
        testID="scrubber-touch-area"
      >
        <View style={styles.trackBackground}>
          {/* Buffer Track */}
          <View
            style={[styles.bufferTrack, { width: `${bufferPercent * 100}%` }]}
            testID="scrubber-buffer"
          />
          {/* Played Progress Track */}
          <View
            style={[styles.progressTrack, { width: `${progressPercent * 100}%` }]}
            testID="scrubber-progress"
          />
        </View>

        {/* Scrubber Thumb */}
        {trackWidth > 0 && (
          <View
            style={[
              styles.thumb,
              {
                left: Math.max(0, Math.min(trackWidth - 14, trackWidth * progressPercent - 7)),
                transform: [{ scale: isScrubbing ? 1.4 : 1 }]
              }
            ]}
            testID="scrubber-thumb"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingVertical: spacing.xs
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs
  },
  timeLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "500"
  },
  touchArea: {
    height: 32,
    justifyContent: "center"
  },
  trackBackground: {
    height: 4,
    backgroundColor: "#2A2A38",
    borderRadius: 2,
    overflow: "hidden",
    position: "relative"
  },
  bufferTrack: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#5A5A6E",
    borderRadius: 2
  },
  progressTrack: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    borderRadius: 2
  },
  thumb: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 4
  }
});
