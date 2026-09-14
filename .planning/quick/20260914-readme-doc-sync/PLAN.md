---
task: readme-doc-sync
date: 2026-09-14
status: complete
---

# Quick Task: readme-doc-sync

## Goal
Bring README.md into sync with reality:
1. Fix stale test counts (was 57 suites / 302 tests)
2. Remove Expo Go references — FINORA requires a development build
3. Update Getting Started to use `expo run:android/ios` and `eas build`
4. Add CI badge reference to new workflow
5. Add background-fetch to tech stack table

## Changes
- README.md: test count updated to live values (71 suites / 393 tests via fresh npm test)
- README.md: prerequisites now list EAS CLI, not Expo Go
- README.md: step 3 changed from "npx expo start + QR scan via Expo Go"
  to "npx expo run:android | npx expo run:ios" + eas build option
- README.md: step 4 is now "npx expo start --dev-client"
- README.md: tech stack table: added expo-background-fetch + expo-task-manager row
- README.md: testing section references CI workflow file

## Decision
FINORA is officially on development builds from this point forward.
Expo Go is no longer a supported target (native modules incompatible).
