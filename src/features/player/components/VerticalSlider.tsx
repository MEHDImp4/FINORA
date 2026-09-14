import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  LayoutChangeEvent
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { spacing } from "../../../design-system/tokens";

const DEFAULT_TRACK_HEIGHT = 180;
const THUMB_SIZE = 14;

export interface VerticalSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  accessibilityLabel: string;
  testID?: string;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function VerticalSlider({
  value,
  onValueChange,
  iconName,
  label,
  accessibilityLabel,
  testID
}: VerticalSliderProps) {
  const trackHeightRef = useRef(DEFAULT_TRACK_HEIGHT);
  const currentValueRef = useRef(clamp01(value));
  const dragStartValueRef = useRef(clamp01(value));

  const onValueChangeRef = useRef(onValueChange);
  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  }, [onValueChange]);

  useEffect(() => {
    currentValueRef.current = clamp01(value);
  }, [value]);

  const handleTrackLayout = (e: LayoutChangeEvent) => {
    const height = e.nativeEvent.layout.height;
    if (height > 0) {
      trackHeightRef.current = height;
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Grab semantics: adjust relative to the current value instead of jumping
        // to the touch position, so a light touch can't slam the value to 0.
        dragStartValueRef.current = currentValueRef.current;
      },
      onPanResponderMove: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const height = trackHeightRef.current || DEFAULT_TRACK_HEIGHT;
        const next = clamp01(dragStartValueRef.current - gestureState.dy / height);
        onValueChangeRef.current(next);
      }
    })
  ).current;

  const percent = Math.round(clamp01(value) * 100);

  return (
    <View
      style={styles.container}
      testID={testID}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: percent, text: `${percent}%` }}
    >
      <Ionicons name={iconName} size={18} color="#FFFFFF" />

      <View
        style={styles.trackTouchArea}
        onLayout={handleTrackLayout}
        {...panResponder.panHandlers}
        testID={testID ? `${testID}-track` : undefined}
      >
        <View style={styles.track} pointerEvents="none">
          <View style={[styles.fill, { height: `${percent}%` }]} testID={testID ? `${testID}-fill` : undefined} />
        </View>
        <View
          style={[styles.thumb, { bottom: `${percent}%`, marginBottom: -THUMB_SIZE / 2 }]}
          pointerEvents="none"
          testID={testID ? `${testID}-thumb` : undefined}
        />
      </View>

      <FinoraText variant="caption" style={styles.label}>
        {label}
      </FinoraText>
      <FinoraText variant="caption" style={styles.valueLabel} testID={testID ? `${testID}-value` : undefined}>
        {percent}%
      </FinoraText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 64,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderRadius: 18,
    alignItems: "center"
  },
  trackTouchArea: {
    height: DEFAULT_TRACK_HEIGHT,
    width: "100%",
    marginTop: spacing.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  track: {
    width: 6,
    height: "100%",
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    overflow: "hidden",
    justifyContent: "flex-end"
  },
  fill: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 3
  },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: "#FFFFFF",
    left: "50%",
    marginLeft: -THUMB_SIZE / 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 4
  },
  label: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 10,
    textAlign: "center",
    marginTop: spacing.sm
  },
  valueLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginTop: spacing.xxs
  }
});
