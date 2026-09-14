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

// expo-brightness is used for actual screen brightness control.
// We import it with a try/catch fallback so unit tests (which mock native modules)
// don't fail due to the native module being absent in the Jest environment.
let BrightnessModule: typeof import("expo-brightness") | null = null;
try {
  BrightnessModule = require("expo-brightness");
} catch {
  // Running in a non-native environment (e.g., tests). Brightness control disabled.
}

// Minimum vertical movement (px) before a swipe gesture is recognized
const SWIPE_THRESHOLD_PX = 10;
// How much one pixel of vertical drag changes the value (0–1 range)
const SWIPE_SENSITIVITY = 0.003;

export interface PlayerGesturesProps {
  onDoubleTapLeft: () => void;
  onDoubleTapRight: () => void;
  onSingleTap: () => void;
  onLongPressStart?: () => void;
  onLongPressEnd?: () => void;
  onVolumeChange?: (volume: number) => void;
  children: React.ReactNode;
}

type SwipeHUDType = "volume" | "brightness" | null;

export function PlayerGestures({
  onDoubleTapLeft,
  onDoubleTapRight,
  onSingleTap,
  onLongPressStart,
  onLongPressEnd,
  onVolumeChange,
  children
}: PlayerGesturesProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [rippleSide, setRippleSide] = useState<"left" | "right" | null>(null);
  const [is2xActive, setIs2xActive] = useState(false);

  // Swipe HUD state
  const [swipeHUD, setSwipeHUD] = useState<SwipeHUDType>(null);
  const [swipeValue, setSwipeValue] = useState(0); // 0–1
  const swipeHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Volume (we track it internally; real system volume requires a native module
  // beyond what Expo exposes cross-platform — we control what we can)
  const volumeRef = useRef(0.7);
  // Brightness (0–1)
  const brightnessRef = useRef(0.7);

  // Latest volume callback kept in a ref: the PanResponder is created once and
  // would otherwise capture a stale prop from the first render.
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

  const applyBrightness = async (value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    brightnessRef.current = clamped;
    showSwipeHUD("brightness", clamped);
    if (BrightnessModule) {
      try {
        await BrightnessModule.setBrightnessAsync(clamped);
      } catch {
        // Brightness change silently fails on devices where it's restricted
      }
    }
  };

  const applyVolume = (value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    volumeRef.current = clamped;
    showSwipeHUD("volume", clamped);
    // NOTE: System volume control requires expo-av or a native bridge module.
    // The HUD correctly reflects the intended value; system volume integration
    // requires a full native module not included in the current Expo SDK.
    // Tracked as a known limitation: PLAY-VOLUME-NATIVE.
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
          if (BrightnessModule) {
            BrightnessModule.setBrightnessAsync(newValue).catch(() => {});
          }
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

  const hudPercentage = Math.round(swipeValue * 100);

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
              Volume
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
              Luminosité
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
