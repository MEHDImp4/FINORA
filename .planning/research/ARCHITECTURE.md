# Architecture Design: FINORA

**Domain:** Personal Media Streaming (Jellyfin Client)  
**Evaluation Date:** 2026-09-10  
**Confidence:** HIGH  

---

## 1. High-Level Layering

```text
┌─────────────────────────────────────────────────────────────┐
│                       Presentation                          │
│   Expo Router Pages (app/) + Finora Design System (UI)      │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Hooks / Controllers                      │
│   useMediaItem, usePlaybackController, useAuthFlow          │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  Query & Use Case Layer                     │
│   TanStack Query Queries / Mutations + Offline Sync Logic   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                      Repository Layer                       │
│   AuthRepository, MediaRepository, PlaybackRepository, ...   │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
┌──────────────▼──────────────┐┌──────────────▼───────────────┐
│     JellyfinClient Layer    ││    Local Database & Files    │
│  @jellyfin/sdk + Polyfills  ││  expo-sqlite + FileSystem    │
└─────────────────────────────┘└──────────────────────────────┘
```

---

## 2. Directory Structure Conventions

```text
src/
├── app/                  # Expo Router filesystem routing
│   ├── (auth)/           # Login, server discovery, multi-server modal
│   ├── (tabs)/           # Home, Search, Library, Downloads, Settings
│   ├── movie/[id].tsx    # Movie details screen
│   ├── series/[id].tsx   # Series details & episodes screen
│   └── player/[id].tsx   # Fullscreen cinematic player
├── components/           # Reusable composition components
├── core/                 # Core plumbing
│   ├── errors/           # Typed error hierarchy (NetworkError, AuthError, etc.)
│   ├── jellyfin/         # Client singleton, SDK polyfills, device identifier
│   ├── network/          # Axios/fetch interceptors, retry backoff, logger sanitization
│   ├── playback/         # FinoraPlayerEngine, PlaybackPlanner, DeviceProfile
│   ├── security/         # SecureStore token management, TLS policy
│   └── storage/          # SQLite database schema, file system manager
├── design-system/        # Tokens, typography, FinoraScreen, Button, Skeletons
├── features/             # Feature-specific components, hooks, and types
├── hooks/                # Global generic React hooks
├── stores/               # Zustand stores (UI, player overlay state, active server)
├── types/                # Strict TypeScript type definitions
└── utils/                # Sanitized loggers, formatters, debounce
```

---

## 3. Data & Communication Flow

1. **Presentation -> Hook**: Screens consume custom hooks; screens never construct raw HTTP headers or Jellyfin query parameters.
2. **Hook -> Query/UseCase**: Hooks invoke TanStack Query definitions for data fetching or mutation. Cached data is returned instantaneously (`stale-while-revalidate`).
3. **Query -> Repository**: Repositories translate domain requests into Jellyfin API calls, mapping raw SDK models into clean, strongly typed FINORA entities.
4. **Token Security**: Tokens are fetched strictly from `expo-secure-store` via `AuthRepository` when making authenticated requests; passwords are wiped after login.
5. **Playback Negotiation**: `PlaybackPlanner` inspects media stream info, queries `DeviceProfile`, and selects optimal stream URL (Direct Play, Direct Stream, or Transcode) before feeding `FinoraPlayerEngine`.
