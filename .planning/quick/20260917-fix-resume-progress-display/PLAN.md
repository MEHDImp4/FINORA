---
task: fix-resume-progress-display
created: 2026-09-17
status: in-progress
---

# Quick Plan: Fix Resume Button Progress Percentage Display

## Problem
When viewing a partially watched movie (e.g. from "Continue Watching"), the play/resume button in `MovieDetailsView` displays literal text `Reprendre ({progress} %)` instead of replacing the placeholder with the actual watched percentage (e.g. `Reprendre (42%)`).

## Root Cause
`src/features/details/components/MovieDetailsView.tsx` calls `t("details.resumeWithProgress", { percent: Math.round(item.playedPercentage) })`.
However, `src/i18n/locales/fr.ts` defined `resumeWithProgress: "Reprendre ({progress} %)"` and `src/i18n/locales/en.ts` defined `resumeWithProgress: "Resume ({progress}%)"`.
Because the placeholder name was `{progress}` in translation dictionaries but the caller passed `{percent}`, the `translate()` regex failed to match and left the raw un-interpolated string.

## Steps
1. Update `src/i18n/locales/fr.ts` and `src/i18n/locales/en.ts` to use `{percent}` for `details.resumeWithProgress`.
2. Update `src/features/details/components/MovieDetailsView.tsx` to provide both `percent` and `progress` to `t("details.resumeWithProgress", ...)` for resilience.
3. Update `src/features/details/__tests__/MovieDetails.test.tsx` and `src/i18n/__tests__/i18n.test.ts` to verify exact string interpolation with numeric percentage.
4. Run test suites (`npm test` on touched files and `scripts/check-i18n.js`).
