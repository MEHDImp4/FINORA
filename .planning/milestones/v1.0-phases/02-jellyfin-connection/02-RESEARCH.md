# Phase 02: Jellyfin Connection - Research

**Phase:** 02-jellyfin-connection  
**Date:** 2026-09-10  
**Status:** Completed  

---

## Technical Approach & Architecture

### 1. Server Discovery, URL Validation & Security
- **URL Normalization**: Validate standard Jellyfin URL forms (e.g., `https://jellyfin.local:8096` or `http://192.168.1.100:8096`). Clean up trailing slashes and invalid paths.
- **Protocol Security Inspection**:
  - Check URL scheme (`https:` vs `http:`).
  - Explicit warning badge/prompt when `http:` is supplied, clarifying that credentials will be transmitted unencrypted across the local network.
  - Strict TLS verification is inherent in React Native's native networking stack; no custom cert bypasses or insecure flags are permitted.
- **Server Reachability & Discovery**:
  - Test server reachability with `/System/Info/Public` endpoint via `HttpClient`.
  - Extract Jellyfin server details: `ServerName`, `Version`, `Id`, and `StartupWizardCompleted`.

### 2. Client Identification & Device ID
- **Client Metadata Specification**:
  - `Client`: `"FINORA"`
  - `Device`: `Platform.OS === 'ios' ? 'Apple iOS' : 'Android'` (plus platform model if available via `expo-constants`)
  - `DeviceId`: Persistent UUID generated once via `expo-crypto.randomUUID()` and saved into `SecureTokenStorage` with key `finora_device_id`. If already existing, reuse it.
  - `Version`: App version (e.g., `"1.0.0"` from `expo-constants`).
- **Authorization Header Standard**:
  - Jellyfin accepts `Authorization: MediaBrowser Client="FINORA", Device="...", DeviceId="...", Version="...", Token="..."`.
  - Alternatively `X-Emby-Token: <token>` and `X-Emby-Authorization: MediaBrowser ...`.

### 3. Authentication & Credential Purging
- **Authentication Endpoint**:
  - `POST /Users/AuthenticateByName` with JSON body:
    ```json
    { "Username": "...", "Pw": "..." }
    ```
- **In-Memory Discard Guarantee**:
  - The function signature receives username and password, performs the network call, processes the result (`AccessToken`, `User.Id`, `User.Name`), and immediately clears/discards password references without storing or logging.
- **Session Persistence**:
  - Save token in `SecureTokenStorage` under `finora_token_${serverId}_${userId}`.
  - Save active session descriptor (active server ID, active user ID, server URL, username) in `UserPreferencesStorage` / `useAuthStore`.
- **Auto-Restoration**:
  - On app launch, `AuthRepository.restoreSession()` reads the active session descriptor, loads the secure token, configures `HttpClient` / Jellyfin client headers, and verifies validity via `/System/Info` or `/Users/Me`.
  - If valid, sets auth state to `authenticated`.
  - If 401 or failed, clears active token and marks state as `unauthenticated`.

### 4. Multi-Server & Account Switching
- **Server & Account Registry**:
  - Data structure:
    ```typescript
    export interface ServerProfile {
      id: string; // server Id
      name: string; // server name
      url: string; // base URL
      lastConnectedAt: number;
    }

    export interface UserAccount {
      userId: string;
      username: string;
      serverId: string;
      serverName: string;
      serverUrl: string;
      avatarTag?: string;
    }
    ```
  - Stored in `UserPreferencesStorage` (`finora_saved_accounts`).
  - Switching account updates active server/user state in `useAuthStore` and switches the active authorization token. No session cross-talk or token leakage.

### 5. Logout & Session Revocation
- **Revocation**:
  - Sends `POST /Sessions/Logout` to the server to invalidate the token.
  - Deletes token from `SecureTokenStorage`.
  - Removes or deactivates session in `useAuthStore`.

### 6. Diagnostics Screen & Health Monitoring
- **Diagnostics Service (`diagnosticsService.ts`)**:
  - Ping latency check: Measure round-trip time of a lightweight endpoint (`/System/Ping` or `/System/Info/Public`).
  - TLS / Security check: Validate `url.startsWith('https://')` and certificate handshake validity.
  - Server status: Server name, Jellyfin version, OS / runtime environment.
  - Client state: Active device ID, client identification string, active user ID.
  - Interactive test runner in Settings tab (`src/app/(tabs)/settings.tsx`).

---

## Validation Architecture

### Test Infrastructure
- **Framework**: Jest with `ts-jest`
- **Config**: `jest.config.js`
- **Command**: `npm test -- auth` and `npm run typecheck && npm test`
- **Estimated runtime**: ~5 seconds

### Automated Verification Targets
1. `AUTH-01`: URL parsing, trailing slash normalization, HTTPS detection, HTTP warning generator, and server public info fetching.
2. `AUTH-02`: Client identification header formatting with persistent installation UUID.
3. `AUTH-03`: Authentication flow, password purging verification (not stored in memory or persistence), token storage in SecureTokenStorage, and session restoration logic.
4. `AUTH-04`: Multi-server store switching without cross-contamination.
5. `AUTH-05`: Logout revocation endpoint dispatch and secure token deletion.
6. `DIAG-01`: Diagnostics metrics computation (latency, HTTPS flag, version, API health).
