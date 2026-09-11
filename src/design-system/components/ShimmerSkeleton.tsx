import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  ViewStyle,
  StyleSheet,
  AccessibilityInfo
} from "react-native";

export interface ShimmerSkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export function ShimmerSkeleton({
  width = "100%",
  height = 20,
  borderRadius = 8,
  style
}: ShimmerSkeletonProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const opacityAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isMounted) {
        setReduceMotion(enabled);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      opacityAnim.setValue(0.5);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.75,
          duration: 800,
          useNativeDriver: true
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true
        })
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [reduceMotion, opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height: height as any,
          borderRadius,
          opacity: opacityAnim
        },
        style
      ]}
      accessibilityRole="none"
      accessibilityLabel="Loading content"
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "#1F1F2C"
  }
});
