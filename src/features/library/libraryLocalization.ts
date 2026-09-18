/**
 * Normalizes and localizes Jellyfin library names so standard categories
 * (Movies, TV Shows, Collections) always display in the user's selected language
 * regardless of whether the server library was named in French, English, or another language.
 */
export function getLocalizedLibraryName(
  lib: { name?: string | null; collectionType?: string | null },
  t: (key: string) => string
): string {
  const rawName = (lib.name || "").trim().toLowerCase();
  const type = (lib.collectionType || "").trim().toLowerCase();

  // Match Movies / Films
  if (
    type === "movies" ||
    rawName === "films" ||
    rawName === "film" ||
    rawName === "movies" ||
    rawName === "movie"
  ) {
    return t("home.moviesCategory");
  }

  // Match Series / TV Shows
  if (
    type === "tvshows" ||
    rawName === "séries" ||
    rawName === "series" ||
    rawName === "séries tv" ||
    rawName === "serie" ||
    rawName === "série" ||
    rawName === "tv shows" ||
    rawName === "tv show" ||
    rawName === "émissions" ||
    rawName === "emissions"
  ) {
    return t("home.seriesCategory");
  }

  // Match Collections / Boxsets
  if (
    type === "boxsets" ||
    rawName === "collections" ||
    rawName === "collection" ||
    rawName === "boxsets" ||
    rawName === "boxset"
  ) {
    return t("home.collectionsCategory");
  }

  // Keep custom user library names as is (e.g., "Anime", "Documentaires 4K")
  return lib.name || "";
}

/**
 * Standard genre translations between English (TMDB / Jellyfin default) and French.
 */
const GENRE_TRANSLATIONS: Record<string, { fr: string; en: string }> = {
  action: { fr: "Action", en: "Action" },
  "action & adventure": { fr: "Action & Aventure", en: "Action & Adventure" },
  "action &": { fr: "Action & Aventure", en: "Action & Adventure" },
  adventure: { fr: "Aventure", en: "Adventure" },
  animation: { fr: "Animation", en: "Animation" },
  comedy: { fr: "Comédie", en: "Comedy" },
  comedie: { fr: "Comédie", en: "Comedy" },
  crime: { fr: "Crime", en: "Crime" },
  documentary: { fr: "Documentaire", en: "Documentary" },
  documentaire: { fr: "Documentaire", en: "Documentary" },
  drama: { fr: "Drame", en: "Drama" },
  drame: { fr: "Drame", en: "Drama" },
  family: { fr: "Famille", en: "Family" },
  famille: { fr: "Famille", en: "Family" },
  fantasy: { fr: "Fantastique", en: "Fantasy" },
  fantastique: { fr: "Fantastique", en: "Fantasy" },
  history: { fr: "Histoire", en: "History" },
  histoire: { fr: "Histoire", en: "History" },
  horror: { fr: "Horreur", en: "Horror" },
  horreur: { fr: "Horreur", en: "Horror" },
  music: { fr: "Musique", en: "Music" },
  musique: { fr: "Musique", en: "Music" },
  mystery: { fr: "Mystère", en: "Mystery" },
  mystere: { fr: "Mystère", en: "Mystery" },
  romance: { fr: "Romance", en: "Romance" },
  "sci-fi & fantasy": { fr: "Science-Fiction & Fantastique", en: "Sci-Fi & Fantasy" },
  "science fiction": { fr: "Science-Fiction", en: "Science Fiction" },
  "science-fiction": { fr: "Science-Fiction", en: "Science Fiction" },
  "tv movie": { fr: "Téléfilm", en: "TV Movie" },
  telefilm: { fr: "Téléfilm", en: "TV Movie" },
  thriller: { fr: "Thriller", en: "Thriller" },
  war: { fr: "Guerre", en: "War" },
  guerre: { fr: "Guerre", en: "War" },
  "war & politics": { fr: "Guerre & Politique", en: "War & Politics" },
  western: { fr: "Western", en: "Western" },
  anime: { fr: "Anime", en: "Anime" }
};

/**
 * Normalizes and localizes genre names so they display correctly and cleanly in the UI.
 * Handles compound genres, removes broken trailing ampersands, and localizes TMDB genres to French or English.
 */
export function getLocalizedGenre(genre?: string | null, language?: string): string {
  if (!genre) return "";
  const trimmed = genre.trim();
  if (!trimmed) return "";

  const lower = trimmed.toLowerCase();
  const matched = GENRE_TRANSLATIONS[lower];

  if (matched) {
    return language === "fr" ? matched.fr : matched.en;
  }

  // Fallback cleanup if metadata was cut off with a trailing ampersand (e.g. "Action &")
  if (lower.endsWith("&")) {
    const cleaned = lower.slice(0, -1).trim();
    const cleanedMatch = GENRE_TRANSLATIONS[cleaned];
    if (cleanedMatch) {
      return language === "fr" ? cleanedMatch.fr : cleanedMatch.en;
    }
  }

  return trimmed;
}

