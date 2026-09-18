# Quick Task Summary: Fix Series Rating Layout, Season Plural Translation, and Genre Tags

## Overview
- **User report**:
  1. In series details, rating star and score were vertically stacked instead of side-by-side.
  2. In series details, season count showed literal `"{plural}"` (e.g. `1 saison{plural}`).
  3. In hero banner and library filtering, genre tags were intermittently missing or failing to filter media items.
- **Root causes identified**:
  1. In `SeriesDetailsView.tsx` (and `MovieDetailsView.tsx`), `styles.ratingBadge` lacked `flexDirection: "row"` and `alignItems: "center"`.
  2. `details.seasonCount` template used `{plural}` placeholder (`{count} saison{plural}` / `{count} season{plural}`), but callers only passed `{ count }`.
  3. In `mediaRepository.ts`, `MEDIA_FIELDS` omitted `Genres,GenreItems,Tags`. Scoped `/Genres?ParentId={id}` query lacked `Recursive: true` and had no fallback to global genres if empty.
  4. In `HeroBanner.tsx`, only a single genre (`item.genres[0]`) was ever displayed.
  5. In `library.tsx`, `genres` from server query were not aggregated with genres found across loaded items, causing `LibraryFilterBar` to disappear or omit tags present in library items.

---

## Changes Made
1. **Series & Movie Details rating badge layout**:
   - `src/features/details/components/SeriesDetailsView.tsx` & `src/features/details/components/MovieDetailsView.tsx`:
     - Added `flexDirection: "row"`, `alignItems: "center"`, `gap: spacing.xs` to `ratingBadge`.
     - Explicitly passed `{ count: seasons.length, plural: seasons.length > 1 ? "s" : "" }`.
2. **Plural translation handling**:
   - `src/i18n/index.ts`: Enhanced `translate()` to automatically inject `effectiveParams.plural = num > 1 ? "s" : ""` whenever `{count}` is provided and `plural` is omitted.
   - `src/i18n/__tests__/i18n.test.ts`: Added test assertions verifying singular (1) and plural (2/4) outputs in both French and English.
3. **Genre & Tag ingestion & Scoped queries**:
   - `src/core/repositories/mediaRepository.ts`: Added `Genres,GenreItems,Tags` to `MEDIA_FIELDS`. Added `Recursive: true` and a fallback to global `/Genres` if a scoped `ParentId` query returns no items.
   - `src/core/repositories/mediaMapper.ts`: Multi-source genre extraction merging `Genres`, `GenreItems`, and `Tags`.
4. **HeroBanner Multi-tag rendering**:
   - `src/features/home/components/HeroBanner.tsx`: Display up to 3 genre chips from `item.genres.slice(0, 3)` instead of only one.
5. **Library Filter Chips & Watchlist support**:
   - `src/app/(tabs)/library.tsx`: Aggregates server genres with discovered genres from loaded items (`displayGenres`), ensuring filter chips never vanish.
   - Added genre filtering support to `watchlistItems`.

---

## Verification
- `npm test`: All 5 targeted test suites (26 tests) passed.
- `node scripts/check-i18n.js`: 100% key parity and placeholder validity across EN and FR.
- `npx tsc --noEmit`: 0 TypeScript errors.
