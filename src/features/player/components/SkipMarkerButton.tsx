import React from "react";
import { StyleSheet, Pressable } from "react-native";
import { ChapterMarker } from "../../../types/media";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";

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
  if (!chapters || chapters.length === 0) {
    return null;
  }

  const currentTicks = Math.round(currentTimeSeconds * 10000000);

  // Check for intro range
  // Either explicitly marked by IntroStart & IntroEnd markers, or a chapter named "Intro"
  let introStartTicks: number | null = null;
  let introEndTicks: number | null = null;

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    if (ch.markerType === "IntroStart" || ch.name.toLowerCase().includes("intro")) {
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
        style={styles.container}
        onPress={() => onSeek(targetSeconds)}
        testID="skip-intro-button"
      >
        <FinoraText variant="body" style={styles.buttonText}>
          Skip Intro ⇥
        </FinoraText>
      </Pressable>
    );
  }

  // Check for credits range (CreditsStart or chapter named "Credits" / "End Credits")
  let creditsStartTicks: number | null = null;
  for (const ch of chapters) {
    if (ch.markerType === "CreditsStart" || ch.name.toLowerCase().includes("credit")) {
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
        style={styles.container}
        onPress={() => onSeek(targetSeconds)}
        testID="skip-credits-button"
      >
        <FinoraText variant="body" style={styles.buttonText}>
          Skip Credits ⇥
        </FinoraText>
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
    backgroundColor: "rgba(20, 20, 26, 0.88)",
    borderColor: "#FFFFFF",
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 25
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  }
});
