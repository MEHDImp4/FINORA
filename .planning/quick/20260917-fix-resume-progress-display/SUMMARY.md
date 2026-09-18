---
task: fix-resume-progress-display
created: 2026-09-17
completed: 2026-09-17
status: complete
---

# Quick Task Summary: Fix Resume Button Progress Percentage Display & Layout Polish

## Problem
1. In `MovieDetailsView`, partially watched movies displayed raw un-interpolated template text on the action button (`Reprendre ({progress} %)` or `Resume ({progress}%)`) instead of showing the actual progress percentage.
2. The action button was excessively large (`size="lg"`, 52px+ height, disproportionate compared to adjacent 48px round icon buttons) and the entire percentage was formatted within the main label string in large bold text.

## Root Cause
- `MovieDetailsView.tsx` passed `{ percent: Math.round(...) }` to `t("details.resumeWithProgress", ...)`, whereas `en.ts` and `fr.ts` defined the translation string with `{progress}` instead of `{percent}`.
- `FinoraButton` did not have a dedicated `badge` prop for secondary metadata (like watch percentage), forcing the full string to occupy the main label in large typography.
- Button size was set to `"lg"` while neighbor icon buttons (`FinoraIconButton`) were 48px.

## Changes Made
1. **[fr.ts](file:///C:/Users/mehdi/Documents/GitHub/FINORA/src/i18n/locales/fr.ts) & [en.ts](file:///C:/Users/mehdi/Documents/GitHub/FINORA/src/i18n/locales/en.ts)**:
   - Updated `details.resumeWithProgress` to use `{percent}`.
2. **[FinoraButton.tsx](file:///C:/Users/mehdi/Documents/GitHub/FINORA/src/design-system/components/FinoraButton.tsx)**:
   - Added optional `badge?: string` prop with modern frosted pill styling (`rgba(255, 255, 255, 0.22)` background, 11px font weight 700) rendered cleanly beside the label.
3. **[MovieDetailsView.tsx](file:///C:/Users/mehdi/Documents/GitHub/FINORA/src/features/details/components/MovieDetailsView.tsx)**:
   - Used `t("details.resume")` ("Reprendre") as the concise primary label.
   - Passed `resumeBadge={`${Math.round(item.playedPercentage)}%`}` to display the percentage in the compact badge.
   - Preserved full accessibility narration via `accessibilityLabel={playA11yLabel}`.
   - Reduced button size to `size="md"` with `height: 48` / `minHeight: 48` to achieve perfect vertical symmetry with adjacent 48px icon buttons.
   - Scaled play icon to 18px for balanced proportions.
4. **Tests**:
   - Updated `MovieDetails.test.tsx` to assert `label: "Reprendre"`, `badge: "42%"`, and accessible label.
   - Added `FinoraButton` badge test in `primitives.test.tsx`.
   - Maintained strict i18n parity in `i18n.test.ts`.

## Verification
- `node scripts/check-i18n.js`: Passed with 100% key and placeholder parity.
- `npm test -- src/features/details/__tests__/MovieDetails.test.tsx src/i18n/__tests__/i18n.test.ts src/design-system/__tests__/primitives.test.tsx`: 22/22 tests passed.
- `npx tsc --noEmit`: 0 errors.
