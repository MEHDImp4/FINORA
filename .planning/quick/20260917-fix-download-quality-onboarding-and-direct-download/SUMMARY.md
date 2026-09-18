# Summary: Configure Download Quality in Onboarding and Direct One-Tap Download

## Overview
Successfully addressed the user's requirements regarding downloads:
1. **Download Quality In Onboarding**: Added interactive selection cards to Slide 2 ("Playback & Downloads") of the onboarding flow, with `1080p` recommended and pre-selected by default. User selections immediately update `playbackPreferencesStore`.
2. **Optimized 1080p Profile for 2–3 GB Target**: Adjusted download bitrates in `downloadQuality.ts`:
   - `1080p`: Bitrate set to 3.0 Mbps (`videoBitRate: 3000000`), yielding ~2.7–2.8 GB for a 2-hour movie or ~1 GB for a 45-minute episode (fitting the user's "not more than 2–3 GB" constraint). Marked with "Recommandé" badge.
   - `720p`: Bitrate set to 1.8 Mbps (`videoBitRate: 1800000`).
   - `480p`: Bitrate set to 1.0 Mbps (`videoBitRate: 1000000`).
   - Default store quality changed from `"original"` to `"1080p"`.
3. **One-Tap Direct Download**:
   - `MovieDetailsView.tsx`: Tapping the download button immediately starts downloading with the user's preferred quality (`defaultDownloadQuality`). Long-pressing opens `DownloadQualityModal` if the user wants to pick another quality on the fly.
   - `SeriesDetailsView.tsx` & `EpisodeCard.tsx`: Tapping an episode download button initiates direct download with `defaultDownloadQuality`. Long-pressing opens `DownloadQualityModal` for that specific episode.
4. **i18n & Tests**:
   - Added all necessary strings to `fr.ts`, `en.ts`, and `types.ts` (`downloadQualityTitle`, `quality1080pTitle`, `quality1080pDesc`, `quality1080pBadge`, etc.). Verified with 100% parity across 635 keys.
   - All tests passing (24/24 unit tests across `MovieDetails.test.tsx`, `SeriesDetails.test.tsx`, `EpisodeCard.test.tsx`, `downloadDefaultQuality.test.tsx`, and `OnboardingScreen.test.tsx`).
   - TypeScript check `tsc --noEmit` clean with 0 errors.

## Modified Files
- `src/features/offline/downloadQuality.ts`
- `src/stores/playbackPreferencesStore.ts`
- `src/i18n/types.ts`
- `src/i18n/locales/fr.ts`
- `src/i18n/locales/en.ts`
- `src/features/onboarding/components/OnboardingScreen.tsx`
- `src/features/onboarding/__tests__/OnboardingScreen.test.tsx`
- `src/features/details/components/MovieDetailsView.tsx`
- `src/features/details/__tests__/MovieDetails.test.tsx`
- `src/features/details/components/EpisodeCard.tsx`
- `src/features/details/__tests__/EpisodeCard.test.tsx`
- `src/features/details/components/SeriesDetailsView.tsx`
- `src/features/details/__tests__/SeriesDetails.test.tsx`
- `src/features/details/__tests__/downloadDefaultQuality.test.tsx`
