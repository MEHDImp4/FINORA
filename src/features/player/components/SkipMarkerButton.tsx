import React from "react";
import { StyleSheet, Pressable } from "react-native";
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
      <Pressable
        style={[
          styles.container,
          {
            bottom: Math.max(insets.bottom, 20) + 75,
            right: Math.max(insets.right, spacing.lg)
          }
        ]}
        onPress={() => onSeek(targetSeconds)}
        testID="skip-intro-button"
      >
        <FinoraText variant="body" style={styles.buttonText}>
          {t("player.skipIntro")}
        </FinoraText>
        <Ionicons name="play-skip-forward" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
      </Pressable>
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
      <Pressable
        style={[
          styles.container,
          {
            bottom: Math.max(insets.bottom, 20) + 75,
            right: Math.max(insets.right, spacing.lg)
          }
        ]}
        onPress={() => onSeek(targetSeconds)}
        testID="skip-credits-button"
      >
        <FinoraText variant="body" style={styles.buttonText}>
          {t("player.skipOutro")}
        </FinoraText>
        <Ionicons name="play-skip-forward" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
      </Pressable>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 85,
    right: spacing.lg,
    backgroundColor: "rgba(16, 16, 24, 0.88)",
    borderColor: "rgba(255, 255, 255, 0.35)",
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 25
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3
  }
});
