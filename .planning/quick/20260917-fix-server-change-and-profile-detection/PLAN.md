# Quick Task: Fix Profile Detection & Separate Server Change from User Login

## Context & User Pain Points
1. **Profile Detection Failure**:
   - `authRepository.getPublicUsers` was reusing `this.client.getHttpClient()` which had credentials or an unconfigured / mismatched `baseUrl`.
   - `assertSameOriginIfAuthenticated` in `HttpClient` blocked the request with a `SecurityError`, which was caught and caused `getPublicUsers` to return `[]` every time.
   - Also, on Jellyfin servers where users have "Hide this user from login screens" enabled, `/Users/Public` returns `[]`. When authenticated, `GET /Users` should also be attempted, and `savedAccounts` on the device should always be included.
2. **Server Change vs User Login in Settings**:
   - When clicking "Changer de serveur" in Settings, FINORA was displaying username and password fields.
   - The user requested: "dans les paramètres, quand j'appuie sur changer serveur, il me donne le nom d'utilisateur et mot de passe. Je veux pas. Je veux que ça me donne juste le changement de serveur. Et l'utilisateur, la connexion utilisateur, elle est toute seule".
   - "Changer de serveur" must focus strictly on changing / testing the server URL (ping `/System/Info/Public`, show server name/version/HTTPS, switch to known servers). User login is handled separately in "Changer de profil" / profile selection.

## Tasks
1. **Fix Profile Detection in `authRepository.ts`**:
   - In `getPublicUsers`: instantiate a clean, dedicated `HttpClient` with `baseUrl: targetUrl` and client header (`X-Emby-Authorization`) without user token, avoiding cross-origin credential blocks.
   - Add `getAvailableUsers(serverUrl, isAuthenticated)`:
     - If authenticated, query `GET /Users` to find all server users (even if hidden from login screens).
     - Query `GET /Users/Public` as unauthenticated/public fallback.
     - Include any known saved accounts for that server.
     - Deduplicate by user ID.
2. **Redesign `ServerConnectModal.tsx`**:
   - Focus exclusively on Server connection & switching.
   - Remove username and password inputs.
   - Allow entering/updating server URL with instant test (`validateAndDiscoverServer`).
   - Display server details (Server Name, Version, Operating System, HTTPS status).
   - Display list of already-known servers from `savedAccounts` for instant 1-tap server switching.
   - On server change confirmation:
     - Update server URL in client / store.
     - If switching to a server without an active session, open the profile picker for that server.
3. **Enhance `SwitchProfileModal.tsx`**:
   - Use `getAvailableUsers(serverUrl, true)` to scan both `/Users` and `/Users/Public`.
   - Merge `savedAccounts` for the current server so existing local profiles are ALWAYS displayed even if the server blocks user discovery.
   - Ensure the user sees all accounts and can switch with 1 tap (if token saved) or enter password.
4. **i18n & Tests**:
   - Update string keys in `fr.ts` and `en.ts` if needed.
   - Add/update unit tests for `authRepository.test.ts`, `SwitchProfileModal.test.tsx`, `ServerConnectModal.test.tsx`.
   - Verify `npx tsc --noEmit` and `npm test`.
