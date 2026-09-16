---
status: resolved
trigger: "Jai build lapp previwe sur github et je les installer sur mon tel, elle est bloquer sur un ecrand noire avec le logo finora, javit lapp deja installer, et jai teste de desinstaler et reinstaller sa marche toujours pas"
created: 2026-09-16
updated: 2026-09-16
---

# Debug Session: splash-screen-black-freeze

## Symptoms

- **Expected:** The preview APK launches on an Android phone, displays the splash screen, loads the app, and displays the onboarding/login or home screen.
- **Actual:** The app is permanently stuck on a black screen with the FINORA logo. Reinstalling or clearing app data has no effect.
- **Platform:** Android physical device running the preview APK built by GitHub Actions.
- **Reproduction:** Trigger the GitHub Actions workflow `Build Android APKs` (target `preview`), download `finora-preview-apk`, install the APK on an Android device, and launch the app.

## Current Focus

hypothesis: The preview APK was built using `assembleDebug` instead of `assembleRelease`. In React Native, `assembleDebug` does not embed the JavaScript bundle (`bundleDebugJsAndAssets` is skipped by default); instead, it expects a running Metro dev server on `localhost:8081`. On a standalone device without Metro, the native splash screen remains visible indefinitely.
test: Change `build-preview` in `.github/workflows/build-apk.yml` to `assembleRelease -PreactNativeReleaseLevel=preview`.
expecting: The resulting preview APK embeds the full Hermes JS bundle and assets, running autonomously on any Android phone without a development server.
next_action: Apply fix in `.github/workflows/build-apk.yml`, verify CI & git status, and push to remote.

## Evidence

- 2026-09-16: `.github/workflows/build-apk.yml:68-83` — `build-preview` executed `./gradlew assembleDebug -PreactNativeReleaseLevel=preview` and copied `android/app/build/outputs/apk/debug/app-debug.apk`.
- 2026-09-16: `android/app/build.gradle:31-36` — React Native Android Gradle configuration states: *"The list of variants that are debuggable. For those we're going to skip the bundling of the JS bundle and the assets. By default is just 'debug'."*
- 2026-09-16: GitHub Actions run `35107323274` build log — `bundleDebugJsAndAssets` never ran during `assembleDebug`. The APK contained native binaries but zero offline JavaScript bundle.
- 2026-09-16: `android/app/build.gradle:112-115` — `buildTypes.release` has `signingConfig signingConfigs.debug` by default, meaning `assembleRelease` produces a self-contained, pre-signed standalone APK that embeds the Hermes bytecode and assets.

## Eliminated

- hypothesis: Corrupt persisted auth session in AsyncStorage from previous install causing a startup lock. Eliminated: the user uninstalled and reinstalled the application; clean install still freezes on startup.
- hypothesis: Native crash or JS unhandled exception at runtime. Eliminated: a crash would trigger an ANR or "App keeps stopping" Android crash dialog. The app remains alive and responsive to OS gestures, frozen exclusively on the native splash screen (`windowBackground` `#0A0A0C` + `finora-logo-text.png`) waiting for Metro bundler connection.

## Resolution

root_cause: In `.github/workflows/build-apk.yml`, the preview build job was using `./gradlew assembleDebug`. In React Native, debug builds do not embed the offline JS bundle and instead wait for Metro on `localhost:8081`. When installed on a standalone device without a dev server, the app native runtime boots but never receives any JavaScript to execute, freezing indefinitely on the native splash screen.

fix: Updated `build-preview` in `.github/workflows/build-apk.yml` to compile with `./gradlew assembleRelease -PreactNativeReleaseLevel=preview` and collect the release APK output. In `assembleRelease`, the React Native Gradle plugin invokes Hermes to compile and embed `index.android.bundle` and all assets directly into the standalone APK.

verification: Verified `build-apk.yml` job configuration. Verified `npm run typecheck` and test suites. Pushed to remote so GitHub Actions produces standalone preview APKs.

files_changed:
- `.github/workflows/build-apk.yml`
- `.planning/debug/splash-screen-black-freeze.md`
