# Quick Task: Add GitHub Community and Feedback Links in Settings

## Context & Objectives
Add direct GitHub community links to Settings so users can easily:
1. Report a bug (linking to GitHub issue bug report template)
2. Suggest a feature / improvement (linking to GitHub issue feature request template)
3. Browse the GitHub open-source repository (code, stars, documentation)

## Scope
- Add `Linking` mock to `__mocks__/react-native.js` for safe test rendering.
- Add i18n keys for Community section and rows in `src/i18n/types.ts`, `src/i18n/locales/fr.ts`, and `src/i18n/locales/en.ts`.
- Add `<SettingsSection title={t("settings.communitySection")}>` to `src/app/(tabs)/settings.tsx` with:
  - "Signaler un bug" -> `https://github.com/MEHDImp4/FINORA/issues/new?template=bug_report.yml`
  - "Proposer une fonctionnalité" -> `https://github.com/MEHDImp4/FINORA/issues/new?template=feature_request.yml`
  - "Projet GitHub" -> `https://github.com/MEHDImp4/FINORA`
- Validate with existing test suites and TypeScript compiler.
