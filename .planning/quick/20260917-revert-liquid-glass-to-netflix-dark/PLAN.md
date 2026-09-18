---
task: revert-liquid-glass-to-netflix-dark
created: 2026-09-17
status: in-progress
---

# Quick Plan: Replace Apple Liquid Glass Effects with Simple Netflix-style Dark UI

## Objective
Remove all Apple-style "liquid glass" visual effects (faux white borders, shiny `borderTopColor` glare, translucent blur cards with heavy drop shadows) across the app and replace them with a clean, cohesive, cinematic Netflix-style dark design.

## Touchpoints
1. **Tab Bar (`src/app/(tabs)/_layout.tsx`)**:
   - Replace floating glassy pill with clean, solid/dark floating container (`#121216`, border `#22222E`, no white top glare).
   - Clean active item styling without white frosted outline.
2. **Category Chips (`src/app/(tabs)/index.tsx`)**:
   - Clean Netflix dark category chips (`#181822`, border `#282836`, no shiny top highlights, no drop shadows).
3. **Hero Banner (`src/features/home/components/HeroBanner.tsx`)**:
   - Clean metadata and rating badges without white/gold top glares.
   - Clean primary play button and dark secondary watchlist button without artificial neon glows or white borders.
4. **Media Quick Actions Modal (`src/features/home/components/MediaQuickActionsModal.tsx`)**:
   - Clean Netflix dark sheet (`#14141C`, border `#242432`, no white top borders).
5. **Notifications Modal (`src/features/notifications/components/NotificationsModal.tsx`)**:
   - Clean dark cards (`#14141C`, border `#22222E`) and Netflix red active filter pills.
6. **Settings Components (`src/features/settings/components/SettingsComponents.tsx`)**:
   - Clean solid dark cards (`#14141A`, border `#22222E`, no shadows/translucency).
7. **Design System & Docs**:
   - Update `src/design-system/tokens/glass.ts` to provide clean dark tokens.
   - Update `README.md` and `README.fr.md` removing liquid glass wording.
