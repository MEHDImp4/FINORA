# Phase 01: Foundation - Research

**Phase:** 01-foundation  
**Date:** 2026-09-10  
**Status:** Completed  

---

## Technical Approach & Architecture

### 1. Project Initialization & Architecture Setup
- **Expo Framework**: Expo SDK 52+ with CNG (Continuous Native Generation).
- **New Architecture**: Fabric renderer + Bridgeless runtime mode enabled in `app.json` via `"newArchEnabled": true`.
- **Hermes JS Engine**: Configured in `app.json` (`"jsEngine": "hermes"`).
- **Expo Router v4**: Typed routing via `expo-router`. Entry point at `src/app/_layout.tsx` wraps the app with `SafeAreaProvider` and applies network polyfills.
- **Strict TypeScript**: `tsconfig.json` extends `expo/tsconfig.base` with `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`.

### 2. Network Client & Security Scrubbing
- **Runtime Polyfill**: `react-native-url-polyfill/auto` imported at the root before any networking or Jellyfin SDK evaluation.
- **Sanitized Logger (`logger.ts`)**: Automatically redacts sensitive fields matching regex patterns:
  - `Authorization: Bearer <token>` -> `Authorization: [REDACTED]`
  - `X-Emby-Token: <token>` -> `X-Emby-Token: [REDACTED]`
  - Passwords and cookies scrubbed from headers and query parameters.
- **Resilient Network Client (`httpClient.ts`)**: Configurable request timeout (default 15s), exponential backoff retry policy (max 3 retries for idempotent/transient network errors), and typed error hierarchy (`NetworkError`, `AuthenticationError`, `ServerUnavailableError`, `TimeoutError`).

### 3. Secure Storage Abstraction
- **Hardware Keystore**: `expo-secure-store` handles sensitive authentication tokens and session keys.
- **Preferences Storage**: `@react-native-async-storage/async-storage` handles non-sensitive user preferences (theme, player toggles).
- **Security Invariant**: Passwords are never stored in any local storage. Tokens are never stored in plain AsyncStorage.

### 4. Finora Design System Tokens & Base Primitives
- **Palette Tokens**: Deep cinematic OLED black (`#0A0A0C`), elevated cards (`#14141A`, `#1E1E28`), borders (`#2A2A38`), primary accent red (`#E50914`), amber highlight (`#FFB800`), muted gray (`#8A8A9E`), pure white (`#FFFFFF`).
- **Typography Tokens**: Hierarchy from Display (32px bold), Title (24px bold), Subhead (18px semibold), Body (14px regular), Caption (12px medium).
- **Primitives**:
  - `FinoraScreen`: Safe-area padded root container with automatic dark background and status bar styling.
  - `FinoraButton`: Touch-feedback button with loading state, size variants, and disabled handling (<50ms response).
  - `FinoraIconButton`: Accessible touch targets (minimum 44x44 dp) with micro-interaction feedback.
  - `FinoraText`: Variant-based typed typography component.

---

## Validation Architecture

### Test Infrastructure
- **Framework**: Jest with `ts-jest` / React Native preset + TypeScript compiler (`tsc`).
- **Config file**: `jest.config.js`
- **Quick run command**: `npx jest --testPathPattern=core`
- **Full suite command**: `npx tsc --noEmit && npx jest`
- **Estimated runtime**: ~5 seconds

### Automated Verification Targets
1. `FOUND-01`: TypeScript compilation succeeds with zero errors (`npx tsc --noEmit`).
2. `FOUND-02`: Directory structure integrity verified with required files present.
3. `FOUND-03`: Unit test validating logger redacts `Authorization`, `X-Emby-Token`, and `Password` correctly. Unit test validating HTTP client retries and maps error codes to typed `NetworkError` / `AuthenticationError`.
4. `FOUND-04`: Storage adapter tests ensuring tokens pass through SecureStore mock and preferences pass through AsyncStorage mock.
5. `FOUND-05`: Design system snapshot/render verification for `FinoraScreen`, `FinoraButton`, and `FinoraText`.
