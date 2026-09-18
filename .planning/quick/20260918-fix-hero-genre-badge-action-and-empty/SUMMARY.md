# Quick Task Summary: Fix Hero Genre Badge "Action &" Empty Space Glitch

## Root Cause
1. **Android Line Break Glitch**: `<FinoraText>` badge elements in `HeroBanner.tsx` lacked `numberOfLines={1}`. When rendering compound genres containing spaces and ampersands (e.g., `"Action & Adventure"`), the layout engine sized the badge container for the full width (~230px), but broke the line after `"Action & "`. The second line (`"Adventure"`) wrapped downward and was hidden beneath the adjacent action buttons, leaving the right half of the badge empty ("Action &" + empty space).
2. **Missing Genre Localization**: Jellyfin genres are stored in English (`Action & Adventure`, `Comedy`, `Animation`), whereas the user UI is French, with no dictionary to normalize or localize genres.

## Changes Made
1. **`src/features/library/libraryLocalization.ts`**:
   - Added and exported `getLocalizedGenre(genre?: string | null, language?: string): string`.
   - Normalizes compound genres (`"action & adventure"` / `"Action &"`) to `"Action & Aventure"` (French) or `"Action & Adventure"` (English).
   - Localizes common TMDB/Jellyfin genres (Action, Adventure, Animation, Comedy, Crime, Documentary, Drama, Family, Fantasy, History, Horror, Music, Mystery, Romance, Sci-Fi & Fantasy, Thriller, War, Western, Anime).
2. **`src/features/home/components/HeroBanner.tsx`**:
   - Added `numberOfLines={1}` to all metadata badges (`communityRating`, `officialRating`, `year`, `runtimeString`, `bannerGenres`, `typeLabel`, `HD`).
   - Integrated `getLocalizedGenre` with current active language from `useTranslation()`.
   - Updated `styles.badgeText` with `includeFontPadding: false`, `fontSize: 12`, `lineHeight: 16`, and added `flexShrink: 0` to `styles.badge`.
3. **`src/features/details/components/MovieDetailsView.tsx`**:
   - Applied `numberOfLines={1}` and `getLocalizedGenre` to movie details genre chips.
4. **`src/features/library/__tests__/libraryLocalization.test.ts`**:
   - Added unit test coverage for compound genre translation, truncated `"Action &"` metadata handling, fallback for unknown genres, and French/English switching.

## Verification
- `npm test -- src/features/library/__tests__/libraryLocalization.test.ts src/features/home/__tests__/HeroBanner.test.tsx`: 13/13 tests passed.
- `npx tsc --noEmit`: 0 TypeScript errors.
