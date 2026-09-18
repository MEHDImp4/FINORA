---
task: fix-series-rating-season-plural-and-genre-tags
created: 2026-09-17
status: in-progress
---

# Quick Plan: Fix Series Rating Layout, Season Plural Translation & Genre Tags Display/Filtering

## Problems Identified
1. **Series Rating Layout**: In `SeriesDetailsView.tsx`, the rating badge displays the star on top and the score below instead of side-by-side because `styles.ratingBadge` lacked `flexDirection: "row"` and `alignItems: "center"`.
2. **Season Count Translation**: `details.seasonCount` template string is `"{count} saison{plural}"`, but caller only passed `{ count: seasons.length }` without `plural`, rendering raw literal `"1 saison{plural}"` on screen.
3. **Genre Tags in HeroBanner & Library**:
   - `MEDIA_FIELDS` lacked `GenreItems,Tags`, and `mediaMapper.ts` only read `dto.Genres`, ignoring `dto.GenreItems` and `dto.Tags` returned by modern Jellyfin versions.
   - `HeroBanner.tsx` only rendered a single genre (`item.genres[0]`), leaving items without genre badges if that single slot was empty or unmapped.
   - `mediaRepository.getGenres` lacked `Recursive: true`, causing `/Genres` with `ParentId` to return incomplete or empty genres for nested libraries.
   - `library.tsx` did not fallback to genres present on loaded media items when `/Genres` was empty, and watchlist filtering didn't apply `selectedGenre` in client memoization.

## Steps
1. Update `SeriesDetailsView.tsx` and `MovieDetailsView.tsx` `styles.ratingBadge` to have `flexDirection: "row"` and `alignItems: "center"`.
2. Update `src/i18n/index.ts` to automatically populate `plural: count > 1 ? "s" : ""` when `{count}` is passed and `{plural}` is not specified, and pass `plural` explicitly in `SeriesDetailsView.tsx`.
3. Update `src/core/repositories/mediaRepository.ts`:
   - Add `GenreItems,Tags` to `MEDIA_FIELDS`.
   - Add `Recursive: true` and `SortBy: "SortName"` to `getGenres()`.
4. Update `src/core/repositories/mediaMapper.ts` to extract genres from `dto.Genres`, `dto.GenreItems`, and `dto.Tags`.
5. Update `HeroBanner.tsx` to render all available genres (up to 3 badges).
6. Update `src/app/(tabs)/library.tsx` to build `displayGenres` combining server genres with loaded items genres, and handle watchlist genre filtering.
7. Run all tests and verify.
