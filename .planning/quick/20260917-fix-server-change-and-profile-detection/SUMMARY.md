---
status: complete
date: 2026-09-17
slug: 20260917-fix-server-change-and-profile-detection
---

# Quick Task Summary: Fix Profile Detection & Separate Server Change from User Login

## What Was Done
1. **Resolved Profile Detection Failure**:
   - Identified that `authRepository.getPublicUsers` was reusing `this.client.getHttpClient()`, which carried authorization headers and an unconfigured `baseUrl`, triggering a `SecurityError` via `assertSameOriginIfAuthenticated` in `HttpClient`.
   - Updated `getPublicUsers` to instantiate a clean, dedicated `HttpClient` targeted directly at `targetUrl` with `X-Emby-Authorization: formatAuthorizationHeader(deviceId)` without a user token.
   - Added `getAvailableUsers`:
     - Calls `/Users/Public`.
     - When authenticated (e.g. in Settings / SwitchProfileModal), also calls `GET /Users` to discover accounts hidden from login screens (`HideFromLoginScreen = true`).
     - Merges and deduplicates profiles.
   - Enhanced `SwitchProfileModal`:
     - Merges `savedAccounts` on this device so known profiles are always displayed even if server discovery returns empty.
     - Accepts `targetServerUrl` prop so server changes seamlessly transition into profile selection.
2. **Separated Server Change from User Login in Settings**:
   - Redesigned `ServerConnectModal` to focus exclusively on Server switching and address testing:
     - Removed username and password input fields completely.
     - Displays current server card with live connection status.
     - Input for Jellyfin server URL with "Tester" connection button.
     - Validated server information card displaying Server Name, Version, OS, and HTTPS/HTTP security badge.
     - Lists other saved servers for 1-tap switching.
     - When switching to a server with saved accounts, switches directly.
     - When switching to a new server without saved accounts, delegates to `SwitchProfileModal` ("Qui regarde ?").
   - Connected `onServerChanged` in `src/app/(tabs)/settings.tsx`.
   - Updated `OnboardingScreen` to safely scan public profiles with `discovery.url`.
3. **i18n & Test Suite**:
   - Added translations in `types.ts`, `fr.ts`, and `en.ts`.
   - Added comprehensive unit tests in `authRepository.test.ts`, `SwitchProfileModal.test.tsx`, and `ServerConnectModal.test.tsx`.
   - Full test suite verified: **84 passed, 84 total (538 tests passed)**.
