# Quick Task: Fix Hero Genre Badge "Action &" Empty Space Glitch

## Problem
In the Home screen Hero banner, the genre badge displays `"Action &"` followed by an empty void inside the badge, rather than the complete genre name (`Action & Aventure` / `Action & Adventure`).
Root causes:
1. React Native Android Text wrapping glitch: `<FinoraText>` badges inside `styles.badge` omitted `numberOfLines={1}`. When rendering compound genres containing spaces and ampersands (e.g., `"Action & Adventure"`), Android's text layout engine broke the line after `"Action & "`. Line 2 (`"Adventure"`) wrapped downward and was hidden/obscured under the adjacent action buttons, leaving the badge sized for the full string but displaying only `"Action &"` followed by empty background.
2. Missing genre localization / normalization: Jellyfin stores TMDB/TVDB genres in English (e.g., `"Action & Adventure"`), which was not localized for French UI users (`"Action & Aventure"`) or cleaned if metadata contained truncated `"Action &"`.

## Changes
1. **Genre Localization Helper (`src/features/library/libraryLocalization.ts`)**:
   - Add `getLocalizedGenre(genre: string, language?: string): string`.
   - Maps standard TMDB/Jellyfin genres (including `"Action & Adventure"`, `"Action &"`, `"Animation"`, `"Comedy"`, `"Sci-Fi & Fantasy"`, etc.) into localized French and English equivalents.
2. **HeroBanner Badge Fix (`src/features/home/components/HeroBanner.tsx`)**:
   - Apply `numberOfLines={1}` to all badge text elements (`communityRating`, `officialRating`, `year`, `runtimeString`, `bannerGenres`, `typeLabel`, `HD`).
   - Use `getLocalizedGenre(genre, language)` for genre chips.
   - Adjust `styles.badgeText` with `includeFontPadding: false`, `fontSize: 12`, and `lineHeight: 16`.
   - Add `flexShrink: 0` to `styles.badge`.
3. **MovieDetailsView Fix (`src/features/details/components/MovieDetailsView.tsx`)**:
   - Apply `numberOfLines={1}` and `getLocalizedGenre` to movie detail genre chips.
4. **Verification**:
   - Unit tests for `getLocalizedGenre`.
   - Run existing test suites and TypeScript check.
