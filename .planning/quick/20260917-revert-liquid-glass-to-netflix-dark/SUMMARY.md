---
task: revert-liquid-glass-to-netflix-dark
created: 2026-09-17
completed: 2026-09-17
status: complete
---

# Quick Task Summary: Revert Liquid Glass to Simple Netflix-style Dark UI

## Problem
The "Apple Liquid Glass" aesthetic (translucent glassy backgrounds with bright white `borderTopColor` highlights, glossy glows, and frosted pills) did not feel cohesive or pleasant, and deviated from the cinematic, immersive dark experience expected of a Netflix-like streaming client.

## Solution
Replaced all faux-glass and liquid glass styling across the entire app with a clean, understated, cinematic Netflix-style OLED dark design.

## Changes Made
1. **[(tabs)/_layout.tsx](file:///C:/Users/mehdi/Documents/GitHub/FINORA/src/app/(tabs)/_layout.tsx)**:
   - Replaced floating glassy tab bar with a clean dark bar (`#121216`, subtle `#22222E` border).
   - Removed shiny white top borders (`borderTopColor`) and excessive drop shadows.
   - Simplified active tab styling (no frosted white border on active tab items).
2. **[(tabs)/index.tsx](file:///C:/Users/mehdi/Documents/GitHub/FINORA/src/app/(tabs)/index.tsx)**:
   - Simplified category filter chips to clean flat dark pills (`#181822`, border `#282836`).
   - Removed drop shadows and glossy border highlights.
3. **[HeroBanner.tsx](file:///C:/Users/mehdi/Documents/GitHub/FINORA/src/features/home/components/HeroBanner.tsx)**:
   - Replaced glassy badge backgrounds and borders with clean dark containers (`rgba(20, 20, 26, 0.85)`, border `#2A2A38`).
   - Removed artificial white top borders and neon red drop shadow on the play button.
   - Cleaned up the watchlist button with dark grey secondary styling.
4. **[MediaQuickActionsModal.tsx](file:///C:/Users/mehdi/Documents/GitHub/FINORA/src/features/home/components/MediaQuickActionsModal.tsx)**:
   - Cleaned modal bottom sheet container (`#14141C`, border `#262636`, clean 20px radius).
   - Replaced faux-glass dividers with clean `#22222E` dark borders.
5. **[NotificationsModal.tsx](file:///C:/Users/mehdi/Documents/GitHub/FINORA/src/features/notifications/components/NotificationsModal.tsx)**:
   - Converted translucent notification cards to solid, clean Netflix dark cards (`#14141C`, border `#22222E`).
   - Styled active filter pills with Netflix red (`#E50914`).
6. **[SettingsComponents.tsx](file:///C:/Users/mehdi/Documents/GitHub/FINORA/src/features/settings/components/SettingsComponents.tsx)**:
   - Converted translucent settings cards to solid dark cards (`colors.card`, border `colors.border`).
7. **[glass.ts](file:///C:/Users/mehdi/Documents/GitHub/FINORA/src/design-system/tokens/glass.ts) & Documentation**:
   - Aligned tokens with dark design.
   - Updated `README.md` and `README.fr.md` to reference the "Cinematic Dark Theme".

## Verification
- Full test suite: 81 passed, 81 total (509 tests passed).
- TypeScript check: 0 errors (`tsc --noEmit`).
- i18n check: 100% parity (`check-i18n.js`).
