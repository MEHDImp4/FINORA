import { MediaItem } from "../../types/media";

export interface RecommendedItem {
  item: MediaItem;
  matchScore: number;
}

export interface BecauseYouWatchedSection {
  sourceItem: MediaItem;
  items: RecommendedItem[];
}

/**
 * Normalizes a score between 75 and 99 (Netflix style),
 * based on user genre affinity, community rating, and favorite status.
 */
export function calculateMatchPercentage(
  item: MediaItem,
  userGenres: Map<string, number>,
  totalUserGenreCount: number
): number {
  let genreScore = 0;
  if (item.genres && item.genres.length > 0 && totalUserGenreCount > 0) {
    let matchedWeight = 0;
    for (const g of item.genres) {
      matchedWeight += userGenres.get(g) || 0;
    }
    const ratio = Math.min(matchedWeight / Math.max(totalUserGenreCount * 0.4, 1), 1);
    genreScore = ratio * 50;
  } else {
    genreScore = 20;
  }

  const rating = item.communityRating ?? 7.0;
  const ratingScore = Math.min(Math.max((rating / 10) * 30, 10), 30);

  const bonusScore = item.isFavorite ? 18 : 10;

  const rawScore = genreScore + ratingScore + bonusScore;

  const finalMatch = Math.round(Math.min(Math.max(rawScore, 75), 99));
  return finalMatch;
}

/**
 * Extracts a weighted map of user genre preferences from resume, watchlist, and recent items.
 */
export function extractUserGenreProfile(
  resumeItems: MediaItem[] = [],
  watchlistItems: MediaItem[] = [],
  recentItems: MediaItem[] = []
): { genreWeights: Map<string, number>; totalWeight: number } {
  const genreWeights = new Map<string, number>();
  let totalWeight = 0;

  const processItems = (items: MediaItem[], weightMultiplier: number) => {
    for (const item of items) {
      if (item.genres && Array.isArray(item.genres)) {
        for (const genre of item.genres) {
          const current = genreWeights.get(genre) || 0;
          genreWeights.set(genre, current + weightMultiplier);
          totalWeight += weightMultiplier;
        }
      }
    }
  };

  processItems(resumeItems, 3);
  processItems(watchlistItems, 2);
  processItems(recentItems.slice(0, 10), 1);

  return { genreWeights, totalWeight };
}

/**
 * Builds "Recommandé pour vous" list sorted by match percentage.
 * Excludes items currently in resumeItems to avoid redundancy.
 */
export function getRecommendedForYou(
  catalog: MediaItem[],
  resumeItems: MediaItem[] = [],
  watchlistItems: MediaItem[] = [],
  limit: number = 16
): RecommendedItem[] {
  if (!catalog || catalog.length === 0) return [];

  const resumeIds = new Set(resumeItems.map((i) => i.id));
  const { genreWeights, totalWeight } = extractUserGenreProfile(
    resumeItems,
    watchlistItems,
    catalog
  );

  const candidates = catalog.filter(
    (item) =>
      !resumeIds.has(item.id) &&
      (item.type === "Movie" || item.type === "Series" || item.type === "BoxSet")
  );

  const scored: RecommendedItem[] = candidates.map((item) => ({
    item,
    matchScore: calculateMatchPercentage(item, genreWeights, totalWeight)
  }));

  scored.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    return (b.item.communityRating ?? 0) - (a.item.communityRating ?? 0);
  });

  return scored.slice(0, limit);
}

/**
 * Builds "Parce que vous avez regardé [Titre]" recommendation section.
 * Takes the most recently watched/resumed item, finds items sharing genres.
 */
export function getBecauseYouWatched(
  resumeItems: MediaItem[],
  catalog: MediaItem[],
  limit: number = 12
): BecauseYouWatchedSection | null {
  if (!resumeItems || resumeItems.length === 0 || !catalog || catalog.length === 0) {
    return null;
  }

  const sourceItem = resumeItems.find(
    (item) => item.genres && item.genres.length > 0
  ) || resumeItems[0];

  if (!sourceItem) return null;

  const sourceGenres = new Set(sourceItem.genres || []);
  const sourceId = sourceItem.id;
  const sourceSeriesId = sourceItem.seriesId;

  const sourceGenreWeights = new Map<string, number>();
  sourceGenres.forEach((g) => sourceGenreWeights.set(g, 5));

  const candidates = catalog.filter((item) => {
    if (item.id === sourceId) return false;
    if (sourceSeriesId && item.id === sourceSeriesId) return false;
    if (item.seriesId && item.seriesId === sourceSeriesId) return false;
    if (item.type !== "Movie" && item.type !== "Series" && item.type !== "BoxSet") return false;

    if (sourceGenres.size > 0) {
      return item.genres && item.genres.some((g) => sourceGenres.has(g));
    }
    return true;
  });

  if (candidates.length === 0) return null;

  const scored: RecommendedItem[] = candidates.map((item) => ({
    item,
    matchScore: calculateMatchPercentage(item, sourceGenreWeights, sourceGenres.size * 5)
  }));

  scored.sort((a, b) => b.matchScore - a.matchScore);

  return {
    sourceItem,
    items: scored.slice(0, limit)
  };
}
