# Quick Task: Configure Download Quality in Onboarding and Direct One-Tap Download

## Overview
- **User request**:
  1. Fix the repeated prompt: currently, tapping download always opens `DownloadQualityModal`, asking for quality every single time even though a preference exists.
  2. Configure download quality in the onboarding flow, with `1080p` recommended as the default.
  3. Optimize 1080p transcoding profile so downloads don't exceed 2–3 GB per movie (around 3 Mbps bitrate instead of 7.5 Mbps).
  4. One-tap download using the configured default quality, with long-press allowing custom quality selection when desired.

---

## Tasks
1. **Optimize Bitrates in `downloadQuality.ts`**:
   - `1080p`: Set `videoBitRate: 3000000` (3.0 Mbps) -> ~2.7–2.8 GB for 2h movie, ~1 GB for 45m episode.
   - Set `badge: "Recommandé"` on `1080p` instead of `original`.
   - `720p`: Set `videoBitRate: 1800000` (1.8 Mbps).
   - `480p`: Set `videoBitRate: 1000000` (1.0 Mbps).
2. **Update Store Defaults in `playbackPreferencesStore.ts`**:
   - Change `defaultDownloadQuality` default from `"original"` to `"1080p"`.
3. **Add Quality Selection to Onboarding in `OnboardingScreen.tsx`**:
   - In Slide 2 ("Playback & Downloads"), add interactive quality cards (`1080p` pre-selected by default).
   - Calling `setDefaultDownloadQuality` updates the user preference in real time.
4. **Direct Download on Tap in `MovieDetailsView.tsx` & `SeriesDetailsView.tsx` & `EpisodeCard.tsx`**:
   - Tapping the download button immediately triggers download with `defaultDownloadQuality`.
   - Long-pressing the download button opens `DownloadQualityModal` for on-the-fly quality changes.
5. **Update i18n & Tests**:
   - Add any missing keys to `fr.ts`, `en.ts`, `types.ts`.
   - Update tests in `EpisodeCard.test.tsx`, `MovieDetails.test.tsx`, `SeriesDetails.test.tsx`, `OnboardingScreen.test.tsx`, and `downloadDefaultQuality.test.tsx`.
   - Run `npm test`, `node scripts/check-i18n.js`, and `npx tsc --noEmit`.
