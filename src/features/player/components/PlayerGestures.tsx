import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  PanResponderGestureState,
  Platform
} from "react-native";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../../../design-system/tokens";
import { useTranslation } from "../../../i18n";

// Minimum vertical movement (px) before a swipe gesture is recognized
const SWIPE_THRESHOLD_PX = 10;
// How much one pixel of vertical drag changes the value (0–1 range)
const SWIPE_SENSITIVITY = 0.003;
// Dead zone around the center to prevent mis-detection when tapping near the midpoint
const CENTER_DEAD_ZONE_PX = 30;

export interface PlayerGesturesProps {
  onDoubleTapLeft: () => void;
  onDoubleTapRight: () => void;
  onSingleTap: () => void;
  onLongPressStart?: () => void;
  onLongPressEnd?: () => void;
  brightness?: number;
  onBrightnessChange?: (brightness: number) => void;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

type SwipeHUDType = "volume" | "brightness" | null;

export function PlayerGestures({
  onDoubleTapLeft,
  onDoubleTapRight,
  onSingleTap,
  onLongPressStart,
  onLongPressEnd,
  brightness,
  onBrightnessChange,
  volume,
  onVolumeChange,
  disabled = false,
  children
}: PlayerGesturesProps) {
  const { t } = useTranslation();
  const [containerWidth, setContainerWidth] = useState(0);
  const [rippleSide, setRippleSide] = useState<"left" | "right" | null>(null);
  const [is2xActive, setIs2xActive] = useState(false);

  // Swipe HUD state
  const [swipeHUD, setSwipeHUD] = useState<SwipeHUDType>(null);
  const [swipeValue, setSwipeValue] = useState(0); // 0–1
  const swipeHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Current brightness / volume (0–1), seeded from the controlled props and kept
  // in refs so the once-created PanResponder never reads a stale closure.
  const brightnessRef = useRef(brightness ?? 0.7);
  const volumeRef = useRef(volume ?? 0.7);
  useEffect(() => {
    if (brightness !== undefined) brightnessRef.current = brightness;
  }, [brightness]);
  useEffect(() => {
    if (volume !== undefined) volumeRef.current = volume;
  }, [volume]);

  // Latest callbacks kept in refs for the same reason as above.
  const onBrightnessChangeRef = useRef(onBrightnessChange);
  useEffect(() => {
    onBrightnessChangeRef.current = onBrightnessChange;
  }, [onBrightnessChange]);

  const onVolumeChangeRef = useRef(onVolumeChange);
  useEffect(() => {
    onVolumeChangeRef.current = onVolumeChange;
  }, [onVolumeChange]);

  const lastTapTimeRef = useRef(0);
  const lastTapSideRef = useRef<"left" | "right" | null>(null);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rippleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressingRef = useRef(false);

  // Swipe tracking refs
  const swipeActiveRef = useRef(false);
  const swipeSideRef = useRef<"left" | "right" | null>(null);
  const swipeStartYRef = useRef(0);
  const swipeStartValueRef = useRef(0);

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

  const showSwipeHUD = (type: SwipeHUDType, value: number) => {
    setSwipeHUD(type);
    setSwipeValue(value);
    if (swipeHideTimerRef.current) {
      clearTimeout(swipeHideTimerRef.current);
    }
    swipeHideTimerRef.current = setTimeout(() => {
      setSwipeHUD(null);
    }, 1200);
  };

  // PanResponder for vertical swipe detection (volume / brightness)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState: PanResponderGestureState) => {
        // Only capture vertical swipes that exceed the threshold
        const isVertical = Math.abs(gestureState.dy) > SWIPE_THRESHOLD_PX &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5;
        return isVertical;
      },
      onPanResponderGrant: (evt, gestureState) => {
        if (isLongPressingRef.current) return;

        const locationX = evt.nativeEvent.locationX;
        const mid = containerWidth > 0 ? containerWidth / 2 : 200;

        swipeActiveRef.current = true;
        swipeSideRef.current = locationX < mid ? "left" : "right";
        swipeStartYRef.current = gestureState.y0;
        swipeStartValueRef.current =
          swipeSideRef.current === "left"
            ? brightnessRef.current
            : volumeRef.current;
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (!swipeActiveRef.current || isLongPressingRef.current) return;

        // Upward drag = increase value (negative dy)
        const delta = -gestureState.dy * SWIPE_SENSITIVITY;
        const newValue = Math.min(1, Math.max(0, swipeStartValueRef.current + delta));

        if (swipeSideRef.current === "left") {
          brightnessRef.current = newValue;
          showSwipeHUD("brightness", newValue);
          onBrightnessChangeRef.current?.(newValue);
        } else {
          volumeRef.current = newValue;
          showSwipeHUD("volume", newValue);
          onVolumeChangeRef.current?.(newValue);
        }
      },
      onPanResponderRelease: () => {
        swipeActiveRef.current = false;
        swipeSideRef.current = null;
      },
      onPanResponderTerminate: () => {
        swipeActiveRef.current = false;
        swipeSideRef.current = null;
      }
    })
  ).current;

  const handlePress = (evt: GestureResponderEvent) => {
    if (isLongPressingRef.current) {
      return;
    }
    // Ignore taps that were part of a swipe gesture
    if (swipeActiveRef.current) {
      return;
    }

    const now = Date.now();
    const locationX = evt.nativeEvent.locationX;
    const midPoint = containerWidth > 0 ? containerWidth / 2 : 200;

    // Determine side with dead zone to prevent flicker near the center boundary
    let side: "left" | "right";
    if (locationX < midPoint - CENTER_DEAD_ZONE_PX) {
      side = "left";
    } else if (locationX > midPoint + CENTER_DEAD_ZONE_PX) {
      side = "right";
    } else {
      // In the dead zone: use the last tap's side if available, otherwise default to right
      side = lastTapSideRef.current || "right";
    }

    const timeDiff = now - lastTapTimeRef.current;
    const isDoubleTap = timeDiff < 350 && lastTapSideRef.current === side;

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

  const hudPercentage = Math.round(swipeValue * 100);

  if (disabled) {
    return (
      <View style={styles.container} testID="player-gestures">
        {children}
      </View>
    );
  }

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
        {...panResponder.panHandlers}
      >
        {/* Double-tap Seek Left Indicator */}
        {rippleSide === "left" && (
          <View style={[styles.seekRipple, styles.seekRippleLeft]} testID="seek-indicator-left">
            <Ionicons name="play-back" size={24} color="#FFFFFF" style={{ marginRight: 6 }} />
            <FinoraText variant="title" style={styles.seekText}>
              10s
            </FinoraText>
          </View>
        )}

        {/* Double-tap Seek Right Indicator */}
        {rippleSide === "right" && (
          <View style={[styles.seekRipple, styles.seekRippleRight]} testID="seek-indicator-right">
            <FinoraText variant="title" style={styles.seekText}>
              10s
            </FinoraText>
            <Ionicons name="play-forward" size={24} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </View>
        )}

        {/* 2x Speed Hold Badge */}
        {is2xActive && (
          <View style={styles.speedBadge} testID="speed-2x-badge">
            <FinoraText variant="caption" style={styles.speedBadgeText}>
              2.0x
            </FinoraText>
            <Ionicons name="play-forward" size={13} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </View>
        )}

        {/* Swipe HUD — Volume (right side) */}
        {swipeHUD === "volume" && (
          <View style={[styles.swipeHUD, styles.swipeHUDRight]} testID="hud-volume">
            <Ionicons
              name={hudPercentage === 0 ? "volume-mute" : hudPercentage < 50 ? "volume-low" : "volume-high"}
              size={20}
              color="#FFFFFF"
              style={{ marginBottom: 6 }}
            />
            <FinoraText variant="caption" style={styles.swipeHUDLabel}>
              {t("player.volume")}
            </FinoraText>
            <FinoraText variant="title" style={styles.swipeHUDValue}>
              {hudPercentage}%
            </FinoraText>
            <View style={styles.swipeBar}>
              <View style={[styles.swipeBarFill, { height: `${hudPercentage}%` as any }]} />
            </View>
          </View>
        )}

        {/* Swipe HUD — Brightness (left side) */}
        {swipeHUD === "brightness" && (
          <View style={[styles.swipeHUD, styles.swipeHUDLeft]} testID="hud-brightness">
            <Ionicons
              name={hudPercentage < 30 ? "sunny-outline" : "sunny"}
              size={20}
              color="#FFFFFF"
              style={{ marginBottom: 6 }}
            />
            <FinoraText variant="caption" style={styles.swipeHUDLabel}>
              {t("player.brightness")}
            </FinoraText>
            <FinoraText variant="title" style={styles.swipeHUDValue}>
              {hudPercentage}%
            </FinoraText>
            <View style={styles.swipeBar}>
              <View style={[styles.swipeBarFill, { height: `${hudPercentage}%` as any }]} />
            </View>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000000"
  },
  gestureOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "transparent",
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
  },
  swipeHUD: {
    position: "absolute",
    top: "25%",
    width: 70,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center"
  },
  swipeHUDLeft: {
    left: 24
  },
  swipeHUDRight: {
    right: 24
  },
  swipeHUDLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    textAlign: "center",
    marginBottom: 2
  },
  swipeHUDValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8
  },
  swipeBar: {
    width: 6,
    height: 60,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
    overflow: "hidden",
    justifyContent: "flex-end"
  },
  swipeBarFill: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 3
  }
});
