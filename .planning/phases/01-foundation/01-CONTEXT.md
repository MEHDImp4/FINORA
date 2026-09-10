# Phase 01: Foundation - Context

**Gathered:** 2026-09-10  
**Status:** Ready for planning  
**Source:** FINORA Master Development Prompt  

<domain>
## Phase Boundary

Phase 1 establishes the rock-solid production foundation for FINORA. It initializes the Expo React Native project with New Architecture and Hermes, configures strict TypeScript, sets up Expo Router v4 navigation scaffolding, centralizes networking with resilient error handling and credential-redacted logging, builds the secure storage abstraction, and creates the foundational design system tokens and screen primitives.
</domain>

<decisions>
## Implementation Decisions

### Core Framework & Runtime
- **Expo SDK 52+ with Continuous Native Generation (CNG)**: Managed native plugins, EAS build readiness, no lock-in.
- **React Native 0.76+ New Architecture**: Fabric renderer + Bridgeless mode enabled for high-refresh rendering (60/90/120 Hz).
- **Hermes JS Engine**: Bytecode precompilation for <1.5s cold startup.
- **Expo Router v4**: Typed file-based routing with native stack navigation.
- **Strict TypeScript**: `strict: true` in tsconfig; no loose `any` types.

### Folder Structure
- Target structure:
  ```text
  src/
  ├── app/                  # Expo Router filesystem routing
  │   ├── (auth)/           # Login, server discovery
  │   ├── (tabs)/           # Home, Search, Library, Downloads, Settings
  │   └── _layout.tsx       # Root layout with providers & polyfills
  ├── components/           # Shared cross-cutting components
  ├── core/
  │   ├── errors/           # Typed error classes (NetworkError, AuthError, etc.)
  │   ├── jellyfin/         # Polyfills & SDK client singleton
  │   ├── network/          # Resilient fetch/axios, retry backoff, sanitized logger
  │   └── security/         # SecureStore keystore adapter & AsyncStorage preferences
  ├── design-system/
  │   ├── tokens/           # Colors (dark cinematic palette), spacing, radii, typography
  │   ├── typography/       # FinoraText variants
  │   └── components/       # FinoraScreen, FinoraButton, FinoraIconButton
  ├── hooks/                # Generic custom hooks
  ├── stores/               # Zustand UI stores
  ├── types/                # Core TypeScript interfaces
  └── utils/                # Sanitized logger, platform helpers
  ```

### Networking & Security
- **React Native Polyfills**: Import `react-native-url-polyfill/auto` at the root entry point before any SDK or networking code.
- **Centralized Sanitized Logger**: Redact `Authorization`, `Token`, `Password`, and `Cookie` headers (e.g., `Authorization: [REDACTED]`).
- **Resilient HTTP Client**: Built-in request timeout, exponential backoff retries, and typed domain error mapping.
- **Storage Abstraction**:
  - `SecureStore` (Android Keystore / iOS Keychain) strictly for auth tokens and server secrets.
  - `AsyncStorage` strictly for non-sensitive UI preferences.
  - Passwords are never persisted post-auth.

### Design System Foundation
- Dark cinematic theme: Pitch black background (`#0A0A0C`), deep surface elevations (`#121216`, `#1A1A22`), subtle borders (`#262633`), vibrant accent red/cinematic amber, crisp typography.
- Primitives: `FinoraScreen` (handles safe areas, status bar, background), `FinoraButton` (press feedback, loading spinner), `FinoraIconButton`, and `FinoraText`.

### Claude's Discretion
- Exact styling implementation details, package manager flags, and specific helper utility signatures.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/PROJECT.md` — Core value, constraints, and project scope
- `.planning/research/STACK.md` — Detailed technical stack choices and versions
- `.planning/research/PITFALLS.md` — Known pitfalls: polyfills, memory leaks, security
- `.planning/research/SUMMARY.md` — Executive technical architecture overview
- `.planning/REQUIREMENTS.md` — FOUND-01 through FOUND-05 requirements definitions
</canonical_refs>

<specifics>
## Specific Requirements Covered

- **FOUND-01**: Initialize Expo React Native project with New Architecture, Hermes, TypeScript strict, and Expo Router v4.
- **FOUND-02**: Establish clean layered folder architecture (app, components, features, core, design-system, hooks, stores, types, utils).
- **FOUND-03**: Implement centralized network client with timeouts, retry backoff, sanitized logging, and typed error hierarchy.
- **FOUND-04**: Implement secure storage abstraction using expo-secure-store for tokens and AsyncStorage for non-sensitive preferences.
- **FOUND-05**: Implement core FINORA Design System tokens (cinematic dark palette, typography, spacing, FinoraScreen, buttons, icons).
</specifics>

<deferred>
## Deferred Ideas

- Jellyfin authentication API calls → Phase 2
- Repositories and TanStack Query caching → Phase 3
- Home screen and media carousels → Phase 4
- Video player engine (`expo-video`) → Phase 6
</deferred>

---
*Phase: 01-foundation*  
*Context gathered: 2026-09-10 via FINORA Master Development Prompt*
