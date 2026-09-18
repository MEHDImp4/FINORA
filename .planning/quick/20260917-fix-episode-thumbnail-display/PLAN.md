# Quick Task: Fix Episode Thumbnail Display in Series Details and Episode Lists

## Overview
In series details and episode lists (`EpisodeCard`, `MediaCard` with `variant="thumbnail"`), all episodes currently display the entire TV show's poster image instead of each episode's own thumbnail image (still frame / capture d'écran).

### Root Cause
In `src/core/repositories/imageUrlBuilder.ts`, `getMediaThumbnailUrls` previously prioritized `seriesPrimaryImageTag` (the 2:3 vertical poster of the series) as candidate #1 for episodes, relegating the episode's own `primaryImageTag` (the 16:9 episode screenshot) to the end of the candidate list.
Since `seriesPrimaryImageTag` / `seriesId` is almost always present for episodes in Jellyfin, the episode still was never displayed, and every episode rendered the identical series poster.

### Solution
1. In `src/core/repositories/imageUrlBuilder.ts`:
   - Reorder candidate resolution in `getMediaThumbnailUrls` for `Episode`:
     1. Episode Primary still frame with tag (`/Items/{episode.id}/Images/Primary?tag={item.primaryImageTag}`)
     2. Episode Thumb with tag (`/Items/{episode.id}/Images/Thumb?tag={item.thumbImageTag}`)
     3. Episode Primary without tag (`/Items/{episode.id}/Images/Primary`)
     4. Parent Series / Season Backdrop with tag (16:9 landscape fallback)
     5. Parent Series Thumb with tag (16:9 landscape fallback)
     6. Parent Series Backdrop without tag
     7. Season Primary Poster
     8. Series Primary Poster fallback
2. In `src/core/repositories/mediaMapper.ts`:
   - Ensure `primaryImageTag` and `thumbImageTag` mapping handles both `dto.ImageTags?.Primary` and `dto.PrimaryImageTag` safely.
3. In `src/features/details/components/EpisodeCard.tsx`:
   - Include `primaryImageTag` and `thumbImageTag` in `React.memo` comparator so cards update when image tags change.
4. Update unit tests:
   - `src/core/repositories/__tests__/imageUrlBuilder.test.ts`
   - `src/features/details/__tests__/EpisodeCard.test.tsx`
   - `src/features/home/__tests__/MediaCard.test.tsx`
5. Verification:
   - `npm test`
   - `npx tsc --noEmit`
   - `node scripts/check-i18n.js`
