import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SubtitleCue, getActiveCue } from "../subtitleParser";
import {
  useSubtitleSettingsStore,
  SUBTITLE_SIZE_VALUES,
  SubtitleSettings
} from "../../../stores/subtitleSettingsStore";

interface FinoraSubtitleOverlayProps {
  cues: SubtitleCue[];
  currentTimeSeconds: number;
  visible?: boolean;
  extraBottomOffset?: number;
  overrideSettings?: SubtitleSettings;
  testID?: string;
}

export function FinoraSubtitleOverlay({
  cues,
  currentTimeSeconds,
  visible = true,
  extraBottomOffset = 0,
  overrideSettings,
  testID = "finora-subtitle-overlay"
}: FinoraSubtitleOverlayProps) {
  const storeSettings = useSubtitleSettingsStore((state) => state.settings);
  const settings = overrideSettings || storeSettings;

  // Find active cue
  const activeCue = useMemo(() => {
    if (!visible || cues.length === 0) return null;
    return getActiveCue(cues, currentTimeSeconds);
  }, [cues, currentTimeSeconds, visible]);

  // Background Box styling
  const boxStyle = useMemo(() => {
    switch (settings.background) {
      case "semi_black":
        return styles.boxSemiBlack;
      case "solid_black":
        return styles.boxSolidBlack;
      case "pill":
        return styles.boxPill;
      case "none":
      default:
        return styles.boxNone;
    }
  }, [settings.background]);

  // Text Shadow styling
  const shadowStyle = useMemo(() => {
    switch (settings.shadow) {
      case "netflix_shadow":
        return styles.shadowNetflix;
      case "thick_outline":
        return styles.shadowThick;
      case "none":
      default:
        return styles.shadowNone;
    }
  }, [settings.shadow]);

  if (!activeCue || !activeCue.text) {
    return null;
  }

  // Base font size & line height
  const fontSize = SUBTITLE_SIZE_VALUES[settings.size] || 20;
  const lineHeight = Math.round(fontSize * 1.35);

  // Vertical position
  const baseBottom = settings.position === "elevated" ? 82 : 42;
  const computedBottom = baseBottom + extraBottomOffset;

  return (
    <View
      style={[styles.container, { bottom: computedBottom }]}
      pointerEvents="none"
      testID={testID}
    >
      <View style={[styles.boxBase, boxStyle]}>
        <Text
          style={[
            styles.textBase,
            {
              fontSize,
              lineHeight,
              color: settings.textColor
            },
            shadowStyle
          ]}
          testID={`${testID}-text`}
        >
          {activeCue.text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 24,
    right: 24,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 40
  },
  boxBase: {
    maxWidth: "92%",
    alignItems: "center",
    justifyContent: "center"
  },
  boxNone: {
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  boxSemiBlack: {
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5
  },
  boxSolidBlack: {
    backgroundColor: "rgba(4, 4, 6, 0.95)",
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 5
  },
  boxPill: {
    backgroundColor: "rgba(18, 18, 24, 0.88)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.15)"
  },
  textBase: {
    fontWeight: "700",
    textAlign: "center",
    includeFontPadding: false
  },
  shadowNetflix: {
    textShadowColor: "rgba(0, 0, 0, 0.95)",
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 3.5
  },
  shadowThick: {
    textShadowColor: "#000000",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 1
  },
  shadowNone: {
    textShadowColor: "transparent",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0
  }
});
