---
status: complete
date: 2026-09-18
slug: add-github-community-feedback-settings
---

# Quick Task Summary: Add GitHub Community & Feedback Links in Settings

## Summary
Added a dedicated "Communauté & Retours" / "Community & Feedback" section directly within the app settings. Users can now easily report bugs, suggest new features/enhancements, or browse the open-source GitHub repository with one tap.

### Key Changes
1. **Mock Infrastructure**:
   - Added `Linking` mock to `__mocks__/react-native.js` (`openURL`, `canOpenURL`, `addEventListener`).
2. **Internationalization (FR & EN)**:
   - Updated `src/i18n/types.ts` (`SettingsTranslations`) with `communitySection`, `reportBug`, `reportBugDesc`, `suggestFeature`, `suggestFeatureDesc`, `githubRepo`, `githubRepoDesc`, and `cannotOpenUrl`.
   - Populated bilingual strings in `src/i18n/locales/fr.ts` and `src/i18n/locales/en.ts`.
3. **Settings Screen Integration (`src/app/(tabs)/settings.tsx`)**:
   - Imported `Linking` and added `handleOpenExternalUrl` with haptic feedback, safe URL checking, and localized error fallback alerts.
   - Added `<SettingsSection title={t("settings.communitySection")}>` right after preferences with:
     - **Signaler un bug** (`bug-outline`, red accent): Opens `https://github.com/MEHDImp4/FINORA/issues/new?template=bug_report.yml`.
     - **Proposer une fonctionnalité** (`bulb-outline`, gold accent): Opens `https://github.com/MEHDImp4/FINORA/issues/new?template=feature_request.yml`.
     - **Projet GitHub & Code source** (`logo-github`, white accent): Opens `https://github.com/MEHDImp4/FINORA`.

## Verification
- `npx tsc --noEmit`: 0 errors.
- `npm test src/i18n/__tests__/i18n.test.ts src/features/settings/components/__tests__/`: 17 passed, 3 suites passed.
