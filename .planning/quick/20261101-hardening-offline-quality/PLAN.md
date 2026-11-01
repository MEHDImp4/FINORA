---
task: hardening-offline-quality
date: 2026-11-01
status: in_progress
---

# Quick Task: hardening-offline-quality

## Goal
Harden FINORA's offline storage, local playback fallback, Jellyfin HTTP session restoration, CI quality gates, test lifecycle cleanup, coverage, native compatibility checks, download architecture, filesystem abstraction, and recoverable-error logging without changing user-visible download behavior.

## Execution order
1. Make account-scoped OfflineStorage read-modify-write mutations serializable and add deterministic concurrency tests.
2. Make missing offline files non-playable while preserving online streaming fallback and missing-file UX.
3. Add explicit non-sensitive trust for approved local HTTP Jellyfin endpoints before restored tokens can be attached.
4. Add ESLint flat config and enforce lint in CI.
5. Remove Jest force-exit masking and repair leaking timers/listeners found by open-handle diagnostics.
6. Measure current coverage, add non-regressive thresholds, and make coverage blocking in CI.
7. Diagnose Expo/npm native compatibility and add Android prebuild/Gradle validation.
8. Incrementally extract download manager responsibilities into focused modules with unit tests.
9. Introduce a FINORA filesystem adapter while retaining expo-file-system/legacy behind the adapter where resume parity requires it.
10. Replace silent unexpected catches in critical layers with redacted structured logging while keeping expected recovery paths quiet/debug-level.

## Invariants
- Preserve legacy offline migration and multi-account isolation.
- Never persist Jellyfin access tokens in AsyncStorage.
- Never attach a saved HTTP token before endpoint/server/trust validation succeeds.
- Preserve three concurrent downloads, background operation, Wi-Fi-only policy, process-death resume, pause/resume/cancel, notifications, and reconciliation behavior.
- Keep TypeScript strict and avoid dependency/version downgrades.
- Prefer small behavior-preserving extractions over a downloadManager rewrite.

## Validation
- npm ci / dependency audit
- npm run typecheck
- npm run lint
- npm run version:check
- npm run i18n:check
- npm test -- src/features/offline
- npm test -- --runInBand --detectOpenHandles
- npm test -- --ci --coverage --maxWorkers=2
- npx expo-doctor
- npm ls
- npx expo prebuild --platform android --no-install
- android/gradlew assembleDebug

## Out of scope
- Replacing react-native-background-actions without evidence it is incompatible.
- Replacing expo-file-system/legacy before the modern API can preserve current resume semantics.
- Persisting network fingerprints, SSIDs, BSSIDs, IP history, or other unnecessary network-identifying data.
