# FINORA native compatibility baseline

Measured on 2026-11-01 with Node 22, Expo SDK 57 and React Native 0.86.3.

## Why `legacy-peer-deps=true` remains

A clean `npm ls --all` currently reports peer/dependency conflicts outside the core Android runtime path, including:

- `@jellyfin/sdk@0.13.0` declares `axios@^1.12.0` but the SDK path used by FINORA does not install it itself.
- Radix/vaul web transitive packages declare `react-dom` peers while FINORA is primarily an Android React Native client.
- `react-native-drawer-layout` declares `react-native-gesture-handler` and `react-native-reanimated` peers through routing/navigation dependencies.
- The baseline also reported an Expo patch mismatch (`expo-linking`) and a transitive `ws` range conflict.

Removing `legacy-peer-deps=true` before those peer graphs are reconciled would make reproducible `npm ci` fail even though the current Android application builds. The setting is therefore retained deliberately, not treated as proof of compatibility.

## Expo SDK alignment

The hardening branch runs `expo install --fix` and then requires `expo-doctor` to pass in CI. Patch/minor versions are aligned to the installed SDK rather than suppressing Doctor globally.

## `react-native-background-actions`

FINORA keeps `react-native-background-actions` because the download subsystem relies on a foreground Android service to protect active downloads. `plugins/withBackgroundService.js` explicitly registers the native package/service and the required foreground-service permissions.

Risk: the package is not relied on as an Expo-managed compatibility guarantee and remains excluded from the React Native Directory advisory check. The meaningful compatibility gate is an Expo prebuild followed by `./gradlew assembleDebug` on every PR/master CI run.

Fallback: FINORA's foreground service wrapper treats native-service availability as best-effort; download persistence/resume metadata remains independent, so a missing background service must not corrupt the queue or persisted catalog.

## Tested stack

The CI native gate records compatibility by compiling the generated Android project for the exact dependency lockfile on each change. Any future Expo/RN/New Architecture upgrade must keep `expo-doctor`, TypeScript/tests, and the Android Gradle build green before merge.

## Temporary production-audit exceptions

The audit gate remains fail-closed. Two newly published advisories are temporarily allowlisted with explicit expiries rather than disabling the audit:

- `GHSA-MRHX-C7XC-M3W5` through **2026-11-15**: Expo SDK 57 CLI currently resolves Zod 3.x, while the advisory is fixed only in Zod 4.6.6+; a consumer override would be a major-version ABI/API gamble in build tooling.
- `GHSA-QR28-FPJM-WQ7F` through **2026-11-08**: `decode-uri-component` has a patched 0.5.1, but the affected copy is transitive through Expo Router/query-string. The shorter expiry forces revalidation quickly instead of normalizing the exception.

These entries are intentionally time-bounded; expiry makes CI fail until the dependency graph is re-evaluated.
