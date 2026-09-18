import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  PanResponderGestureState,
  Platform,
  Animated
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

  const rippleAnim = useRef(new Animated.Value(0)).current;

  const showRipple = (side: "left" | "right") => {
    setRippleSide(side);
    rippleAnim.setValue(0);
    Animated.timing(rippleAnim, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true
    }).start();

    if (rippleTimerRef.current) {
      clearTimeout(rippleTimerRef.current);
    }
    rippleTimerRef.current = setTimeout(() => {
      setRippleSide(null);
    }, 500);
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
        const newValue = Math.round(Math.min(1, Math.max(0, swipeStartValueRef.current + delta)) * 100) / 100;

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
      }, 190);
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
          <Animated.View
            style={[
              styles.seekWave,
              styles.seekWaveLeft,
              {
                opacity: rippleAnim.interpolate({
                  inputRange: [0, 0.2, 0.8, 1],
                  outputRange: [0, 1, 0.8, 0]
                }),
                transform: [
                  {
                    scale: rippleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1.05]
                    })
                  }
                ]
              }
            ]}
            testID="seek-indicator-left"
          >
            <View style={styles.seekContent}>
              <View style={styles.chevronRow}>
                <Ionicons name="play-back" size={24} color="#FFFFFF" />
              </View>
              <FinoraText variant="title" style={styles.seekText}>
                10s
              </FinoraText>
            </View>
          </Animated.View>
        )}

        {/* Double-tap Seek Right Indicator */}
        {rippleSide === "right" && (
          <Animated.View
            style={[
              styles.seekWave,
              styles.seekWaveRight,
              {
                opacity: rippleAnim.interpolate({
                  inputRange: [0, 0.2, 0.8, 1],
                  outputRange: [0, 1, 0.8, 0]
                }),
                transform: [
                  {
                    scale: rippleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1.05]
                    })
                  }
                ]
              }
            ]}
            testID="seek-indicator-right"
          >
            <View style={styles.seekContent}>
              <View style={styles.chevronRow}>
                <Ionicons name="play-forward" size={24} color="#FFFFFF" />
              </View>
              <FinoraText variant="title" style={styles.seekText}>
                10s
              </FinoraText>
            </View>
          </Animated.View>
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
  seekWave: {
    position: "absolute",
    top: "15%",
    bottom: "15%",
    width: "38%",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 16
  },
  seekWaveLeft: {
    left: 0,
    borderTopRightRadius: 180,
    borderBottomRightRadius: 180
  },
  seekWaveRight: {
    right: 0,
    borderTopLeftRadius: 180,
    borderBottomLeftRadius: 180
  },
  seekContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  chevronRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  seekText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 3
  },
  speedBadge: {
    position: "absolute",
    top: spacing.xl,
    alignSelf: "center",
    backgroundColor: "rgba(16, 16, 22, 0.88)",
    borderColor: colors.primary,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6
  },
  speedBadgeText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  swipeHUD: {
    position: "absolute",
    top: "28%",
    width: 68,
    backgroundColor: "rgba(16, 16, 24, 0.82)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10
  },
  swipeHUDLeft: {
    left: 24
  },
  swipeHUDRight: {
    right: 24
  },
  swipeHUDLabel: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 2,
    letterSpacing: 0.2
  },
  swipeHUDValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8
  },
  swipeBar: {
    width: 5,
    height: 64,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 2.5,
    overflow: "hidden",
    justifyContent: "flex-end"
  },
  swipeBarFill: {
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2.5
  }
});
