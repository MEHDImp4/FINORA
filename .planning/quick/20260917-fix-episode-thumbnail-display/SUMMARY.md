# Summary: Fix Episode Thumbnail Display in Series Details and Lists

## Overview
Resolved the issue where all episodes in a series displayed the entire TV show's poster image instead of each episode's own thumbnail image (still frame / capture d'écran).

### Key Changes
1. **`src/core/repositories/imageUrlBuilder.ts`**:
   - Updated `getMediaThumbnailUrls` for `Episode` items to prioritize the episode's own 16:9 still frame:
     - 1st: Episode's own Primary image with tag (`/Items/{episode.id}/Images/Primary?tag={primaryImageTag}`)
     - 2nd: Episode's own Thumb with tag (`/Items/{episode.id}/Images/Thumb?tag={thumbImageTag}`)
     - 3rd: Episode Primary without tag
     - 4th: Parent Series / Season Backdrop with tag (16:9 landscape fallback)
     - 5th: Parent Series Thumb with tag (16:9 landscape fallback)
     - 6th: Parent Backdrop without tag
     - 7th: Season Primary Poster
     - 8th: Parent Series Primary Poster with tag (vertical fallback)
     - 9th: Series Primary without tag
2. **`src/core/repositories/mediaMapper.ts`**:
   - Hardened `primaryImageTag` and `thumbImageTag` extraction to support both `dto.ImageTags?.Primary` and `dto.PrimaryImageTag`, as well as `dto.ThumbImageTag`.
3. **`src/features/details/components/EpisodeCard.tsx`**:
   - Added `primaryImageTag` and `thumbImageTag` equality checks to `React.memo` comparator so cards automatically re-render when image tags update.
4. **Tests updated**:
   - `src/core/repositories/__tests__/imageUrlBuilder.test.ts`: Verified that `getMediaThumbnailUrl` and `getMediaThumbnailUrls` prioritize the episode's own still frame.
   - `src/features/details/__tests__/EpisodeCard.test.tsx`: Verified that `EpisodeCard` requests and displays the episode's still frame and falls back appropriately on error.
   - `src/features/home/__tests__/MediaCard.test.tsx`: Updated assertion to match episode still prioritization.
   - `src/features/details/__tests__/DownloadQualityModal.test.tsx` & `DownloadSeriesModal.test.tsx`: Updated assertions to reflect the new default `"1080p"` quality.

### Verification Results
- All unit tests passing: 82/82 suites, 522/522 tests passed.
- TypeScript check: 0 errors (`npx tsc --noEmit`).
- i18n check: 635 keys with 100% parity (`node scripts/check-i18n.js`).
