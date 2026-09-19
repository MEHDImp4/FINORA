import { ChapterMarker } from "../../types/media";

export const NEXT_EPISODE_FALLBACK_SECONDS = 10;

function isCreditsMarker(chapter: ChapterMarker): boolean {
  if (chapter.markerType === "CreditsStart") return true;

  const name = chapter.name.toLowerCase();
  return (
    name.includes("credit") ||
    name.includes("générique de fin") ||
    name.includes("generique de fin") ||
    name.includes("outro") ||
    name.includes("ending")
  );
}

export function getCreditsStartSeconds(chapters?: ChapterMarker[]): number | null {
  if (!chapters || chapters.length === 0) return null;

  const marker = chapters.find(isCreditsMarker);
  if (!marker || marker.startPositionTicks < 0) return null;
  return marker.startPositionTicks / 10_000_000;
}

export function getNextEpisodePromptStartSeconds(
  chapters: ChapterMarker[] | undefined,
  durationSeconds: number
): number | null {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return null;

  const creditsStart = getCreditsStartSeconds(chapters);
  if (creditsStart !== null && creditsStart >= 0 && creditsStart < durationSeconds) {
    return creditsStart;
  }

  return Math.max(0, durationSeconds - NEXT_EPISODE_FALLBACK_SECONDS);
}
