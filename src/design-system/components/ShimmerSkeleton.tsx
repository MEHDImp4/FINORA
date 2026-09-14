import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  View,
  ViewStyle,
  LayoutChangeEvent,
  StyleSheet,
  AccessibilityInfo
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export interface ShimmerSkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

const BASE_BACKGROUND = "#1B1B26";
const SWEEP_DURATION_MS = 1200;
const SWEEP_HIGHLIGHT = [
  "rgba(255, 255, 255, 0)",
  "rgba(255, 255, 255, 0.07)",
  "rgba(255, 255, 255, 0)"
] as const;

export function ShimmerSkeleton({
  width = "100%",
  height = 20,
  borderRadius = 8,
  style
}: ShimmerSkeletonProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isMounted) {
          setReduceMotion(enabled);
        }
      })
      .catch(() => {
        // Accessibility query unavailable — keep the shimmer running.
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const sweepWidth = measuredWidth > 0 ? Math.max(measuredWidth * 0.45, 48) : 0;

  useEffect(() => {
    if (reduceMotion || measuredWidth <= 0) {
      return;
    }

    progress.setValue(0);
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: SWEEP_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true
      })
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [reduceMotion, measuredWidth, progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-sweepWidth, measuredWidth + sweepWidth]
  });

  const handleLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next > 0 && Math.abs(next - measuredWidth) > 0.5) {
      setMeasuredWidth(next);
    }
  };

  return (
    <View
      style={[
        styles.skeleton,
        { width: width as any, height: height as any, borderRadius },
        style
      ]}
      onLayout={handleLayout}
      accessibilityRole="none"
      accessibilityLabel="Loading content"
    >
      {!reduceMotion && measuredWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.sweep, { width: sweepWidth, transform: [{ translateX }] }]}
        >
          <LinearGradient
            colors={SWEEP_HIGHLIGHT}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: BASE_BACKGROUND,
    overflow: "hidden"
  },
  sweep: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0
  }
});
