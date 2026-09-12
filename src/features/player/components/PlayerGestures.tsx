import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  GestureResponderEvent,
  LayoutChangeEvent
} from "react-native";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";

export interface PlayerGesturesProps {
  onDoubleTapLeft: () => void;
  onDoubleTapRight: () => void;
  onSingleTap: () => void;
  onLongPressStart?: () => void;
  onLongPressEnd?: () => void;
  children: React.ReactNode;
}

export function PlayerGestures({
  onDoubleTapLeft,
  onDoubleTapRight,
  onSingleTap,
  onLongPressStart,
  onLongPressEnd,
  children
}: PlayerGesturesProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [rippleSide, setRippleSide] = useState<"left" | "right" | null>(null);
  const [is2xActive, setIs2xActive] = useState(false);

  const lastTapTimeRef = useRef(0);
  const lastTapSideRef = useRef<"left" | "right" | null>(null);
  const singleTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rippleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressingRef = useRef(false);

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const showRipple = (side: "left" | "right") => {
    setRippleSide(side);
    if (rippleTimerRef.current) {
      clearTimeout(rippleTimerRef.current);
    }
    rippleTimerRef.current = setTimeout(() => {
      setRippleSide(null);
    }, 600);
  };

  const handlePress = (evt: GestureResponderEvent) => {
    if (isLongPressingRef.current) {
      return;
    }

    const now = Date.now();
    const locationX = evt.nativeEvent.locationX;
    const midPoint = containerWidth > 0 ? containerWidth / 2 : 200;
    const side: "left" | "right" = locationX < midPoint ? "left" : "right";

    const timeDiff = now - lastTapTimeRef.current;
    const isDoubleTap = timeDiff < 300 && lastTapSideRef.current === side;

    if (isDoubleTap) {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapTimeRef.current = 0;
      lastTapSideRef.current = null;

      if (side === "left") {
        showRipple("left");
        onDoubleTapLeft();
      } else {
        showRipple("right");
        onDoubleTapRight();
      }
    } else {
      lastTapTimeRef.current = now;
      lastTapSideRef.current = side;

      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
      singleTapTimerRef.current = setTimeout(() => {
        singleTapTimerRef.current = null;
        lastTapTimeRef.current = 0;
        lastTapSideRef.current = null;
        onSingleTap();
      }, 300);
    }
  };

  const handleLongPress = () => {
    if (singleTapTimerRef.current) {
      clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }
    isLongPressingRef.current = true;
    setIs2xActive(true);
    onLongPressStart?.();
  };

  const handlePressOut = () => {
    if (isLongPressingRef.current) {
      isLongPressingRef.current = false;
      setIs2xActive(false);
      onLongPressEnd?.();
    }
  };

  return (
    <View style={styles.container} onLayout={handleLayout} testID="player-gestures">
      {children}

      <Pressable
        style={styles.gestureOverlay}
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressOut={handlePressOut}
        delayLongPress={500}
        testID="gesture-touch-surface"
      >
        {/* Double-tap Seek Left Indicator */}
        {rippleSide === "left" && (
          <View style={[styles.seekRipple, styles.seekRippleLeft]} testID="seek-indicator-left">
            <FinoraText variant="title" style={styles.seekText}>
              ◀◀ 10s
            </FinoraText>
          </View>
        )}

        {/* Double-tap Seek Right Indicator */}
        {rippleSide === "right" && (
          <View style={[styles.seekRipple, styles.seekRippleRight]} testID="seek-indicator-right">
            <FinoraText variant="title" style={styles.seekText}>
              10s ▶▶
            </FinoraText>
          </View>
        )}

        {/* 2x Speed Hold Badge */}
        {is2xActive && (
          <View style={styles.speedBadge} testID="speed-2x-badge">
            <FinoraText variant="caption" style={styles.speedBadgeText}>
              2.0x »
            </FinoraText>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill
  },
  gestureOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 15
  },
  seekRipple: {
    position: "absolute",
    top: "35%",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center"
  },
  seekRippleLeft: {
    left: "15%"
  },
  seekRippleRight: {
    right: "15%"
  },
  seekText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold"
  },
  speedBadge: {
    position: "absolute",
    top: spacing.xl,
    alignSelf: "center",
    backgroundColor: "rgba(20, 20, 26, 0.85)",
    borderColor: colors.primary,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20
  },
  speedBadgeText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "bold"
  }
});
