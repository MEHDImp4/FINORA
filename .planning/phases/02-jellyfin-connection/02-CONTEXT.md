# Phase 02: Jellyfin Connection - Context

**Gathered:** 2026-09-10  
**Status:** Ready for planning  
**Source:** FINORA Master Development Prompt & ROADMAP.md  

<domain>
## Phase Boundary

Phase 2 establishes the end-to-end Jellyfin server discovery, URL & TLS validation, authentication flow, hardware keystore session persistence, multi-server management without cross-talk, clean logout session revocation, and real-time Server Diagnostics view.
</domain>

<decisions>
## Implementation Decisions

### 1. Server Discovery, URL & TLS Validation (AUTH-01)
- **URL Normalization**: Sanitize server input (strip trailing slashes, enforce protocol `http://` or `https://`, validate port and domain/IP syntax).
- **Strict TLS/HTTPS Validation**: Never bypass SSL/TLS certificate verification. Insecure certificate bypasses are explicitly forbidden.
- **Unencrypted Local HTTP Warning**: If the user enters an `http://` URL, display a prominent warning indicator about unencrypted credentials and session hijacking risks before proceeding.
- **Reachability Check**: Query Jellyfin public endpoint `/System/Info/Public` via `HttpClient` before attempting authentication, verifying the target is indeed an active Jellyfin server.

### 2. Client Identification & Authentication (AUTH-02, AUTH-03)
- **Client Identification**:
  - Client Name: `FINORA`
  - Device Name: Device platform / OS model (e.g. `Expo / Android` or `Expo / iOS`)
  - App Version: App version from `expo-constants` / `package.json`
  - Device ID: Persistent client installation UUID generated on first run via `expo-crypto` and permanently stored in `SecureTokenStorage`.
- **SDK & Authentication**:
  - Authenticate using `@jellyfin/sdk` or its API endpoints `/Users/AuthenticateByName`.
  - Headers set with Jellyfin authorization string (`MediaBrowser Client="FINORA", Device="...", DeviceId="...", Version="..."`).
- **Zero In-Memory Password Retention**:
  - Discard the plain-text password from local state/variables immediately after the authentication call returns (success or failure). Never log or persist passwords.
- **Hardware Keystore Persistence**:
  - Save `accessToken`, `userId`, `serverId`, and `serverUrl` in `SecureTokenStorage` (`expo-secure-store`).
  - Never write access tokens to `AsyncStorage`.
- **Auto-Restoration on Startup**:
  - When the app starts, initialize `AuthRepository` / `useAuthStore`. If an active server and token exist in `SecureTokenStorage`, validate the token via Jellyfin `/System/Info` or `/Users/Me`.
  - If valid, restore session seamlessly to the main screen. If invalid/expired (401), clean up session state and prompt login.

### 3. Multi-Server & Account Switching (AUTH-04)
- **Multi-Server Data Model**:
  - Store a list of registered servers and accounts in `UserPreferencesStorage` (server metadata: `id`, `name`, `url`, `userId`, `username`, `lastUsedAt`), while their respective auth tokens are keyed in `SecureTokenStorage` per server/user: `finora_auth_token_${serverId}_${userId}`.
  - Active server is tracked in Zustand store (`useServerStore` / `useAuthStore`).
  - Switching servers seamlessly updates the active SDK client / baseUrl / token without leaking cache or tokens between accounts.

### 4. Clean Logout & Revocation (AUTH-05)
- **Session Revocation**:
  - Call `/Sessions/Logout` on Jellyfin server to invalidate token on the server side.
  - Delete stored token for this server/user from `SecureTokenStorage`.
  - Clear active in-memory user and media cache.
  - Transition UI back to Server Selection / Login screen.

### 5. Server Diagnostics Screen (DIAG-01)
- **Location**: Accessible under Settings tab (`src/app/(tabs)/settings.tsx` or a dedicated Diagnostics subscreen).
- **Metrics & Information**:
  - Server Name & Jellyfin Version (from `/System/Info`).
  - Connection Protocol (`HTTPS` with lock badge vs `HTTP` with security warning).
  - Reachability & Ping Latency (measured round-trip time in milliseconds).
  - Active User & Device ID.
  - WebSocket / API status check.
  - Refresh button to re-test connection on demand.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing:**
- `.planning/PROJECT.md` — Core value and security constraints
- `.planning/REQUIREMENTS.md` — Requirements AUTH-01 through AUTH-05, DIAG-01
- `.planning/ROADMAP.md` — Phase 2 goals and deliverables
- `src/core/security/storage.ts` — SecureTokenStorage and UserPreferencesStorage invariants
- `src/core/network/httpClient.ts` — Resilient HTTP client with retry and timeouts
- `src/core/network/logger.ts` — Credential scrubbing logger
</canonical_refs>

<specifics>
## Specific Requirements Covered

- **AUTH-01**: Add Jellyfin server with URL validation, strict TLS/HTTPS validation, and explicit warning for unencrypted local HTTP.
- **AUTH-02**: Authenticate user via @jellyfin/sdk with proper client identification (FINORA, device info, persistent installation ID).
- **AUTH-03**: Securely persist access tokens in hardware keystore, discard password immediately post-auth, and auto-restore session on startup.
- **AUTH-04**: Support multi-server configurations and user switching without cross-contaminating cache or credentials.
- **AUTH-05**: Implement clean logout, session revocation, and cache clearing.
- **DIAG-01**: Implement Settings screen with Server Diagnostics (connectivity, API status, HTTPS, latency, playback health).
</specifics>

<deferred>
## Deferred Ideas
- Library browsing and media fetching → Phase 3 (Jellyfin Data & Repositories)
- Player streaming and stream profile negotiation → Phase 6 (Player Foundation)
</deferred>
