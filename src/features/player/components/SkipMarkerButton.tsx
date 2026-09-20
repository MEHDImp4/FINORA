import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ChapterMarker } from "../../../types/media";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";
import { useTranslation } from "../../../i18n";

export interface SkipMarkerButtonProps {
  chapters?: ChapterMarker[];
  currentTimeSeconds: number;
  durationSeconds?: number;
  onSeek: (seconds: number) => void;
}

interface SkipActionProps {
  label: string;
  testID: string;
  bottom: number;
  right: number;
  onPress: () => void;
}

function SkipAction({ label, testID, bottom, right, onPress }: SkipActionProps) {
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    entrance.setValue(0);
    Animated.spring(entrance, {
      toValue: 1,
      friction: 8,
      tension: 120,
      useNativeDriver: true
    }).start();
  }, [entrance, testID]);

  return (
    <Animated.View
      style={[
        styles.animatedContainer,
        {
          bottom,
          right,
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [8, 0]
              })
            },
            {
              scale: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [0.96, 1]
              })
            }
          ]
        }
      ]}
    >
      <Pressable
        style={({ pressed }) => [styles.container, pressed && styles.containerPressed]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        testID={testID}
      >
        <FinoraText variant="caption" style={styles.buttonText}>
          {label}
        </FinoraText>
        <Ionicons name="chevron-forward" size={13} color="rgba(255, 255, 255, 0.82)" />
      </Pressable>
    </Animated.View>
  );
}


export function SkipMarkerButton({
  chapters = [],
  currentTimeSeconds,
  durationSeconds = 0,
  onSeek
}: SkipMarkerButtonProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  if (!chapters || chapters.length === 0) {
    return null;
  }

  const currentTicks = Math.round(currentTimeSeconds * 10000000);

  // Check for intro range
  // Either explicitly marked by IntroStart & IntroEnd markers, or a chapter named "Intro" / "Générique"
  let introStartTicks: number | null = null;
  let introEndTicks: number | null = null;

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const nameLower = ch.name.toLowerCase();
    const isIntroChapter =
      ch.markerType === "IntroStart" ||
      nameLower.includes("intro") ||
      nameLower.includes("générique") ||
      nameLower.includes("generique");

    if (isIntroChapter) {
      introStartTicks = ch.startPositionTicks;
      // End of intro is either IntroEnd marker or the next chapter's start
      const next = chapters[i + 1];
      if (next) {
        introEndTicks = next.startPositionTicks;
      }
    } else if (ch.markerType === "IntroEnd") {
      introEndTicks = ch.startPositionTicks;
    }
  }

  const isInsideIntro =
    introStartTicks !== null &&
    introEndTicks !== null &&
    currentTicks >= introStartTicks &&
    currentTicks < introEndTicks;

  if (isInsideIntro && introEndTicks !== null) {
    const targetSeconds = introEndTicks / 10000000;
    return (
      <SkipAction
        label={t("player.skipIntro")}
        testID="skip-intro-button"
        bottom={Math.max(insets.bottom, 20) + 72}
        right={Math.max(insets.right, spacing.lg)}
        onPress={() => onSeek(targetSeconds)}
      />
    );
  }

  // Check for credits range (CreditsStart or chapter named "Credits" / "Fin")
  let creditsStartTicks: number | null = null;
  for (const ch of chapters) {
    const nameLower = ch.name.toLowerCase();
    if (
      ch.markerType === "CreditsStart" ||
      nameLower.includes("credit") ||
      nameLower.includes("générique de fin")
    ) {
      creditsStartTicks = ch.startPositionTicks;
      break;
    }
  }

  const isInsideCredits =
    creditsStartTicks !== null && currentTicks >= creditsStartTicks;

  if (isInsideCredits) {
    const targetSeconds = durationSeconds > 0 ? durationSeconds : currentTimeSeconds + 30;
    return (
      <SkipAction
        label={t("player.skipOutro")}
        testID="skip-credits-button"
        bottom={Math.max(insets.bottom, 20) + 72}
        right={Math.max(insets.right, spacing.lg)}
        onPress={() => onSeek(targetSeconds)}
      />
    );
  }

  return null;
}

const styles = StyleSheet.create({
  animatedContainer: {
    position: "absolute",
    zIndex: 25
  },
  container: {
    minHeight: 34,
    backgroundColor: "rgba(8, 8, 10, 0.62)",
    borderColor: "rgba(255, 255, 255, 0.16)",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  containerPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }]
  },
  buttonText: {
    color: "rgba(255, 255, 255, 0.96)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.15
  }
});
