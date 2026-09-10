# Phase 03: Jellyfin Data & Repositories - Context

**Gathered:** 2026-09-10  
**Status:** Ready for planning  
**Source:** FINORA Master Development Prompt & ROADMAP.md  

<domain>
## Phase Boundary

Phase 3 implements the data access layer for FINORA. It builds domain models, a decoupled repository architecture wrapping Jellyfin endpoints (`MediaRepository`, `UserRepository`, `SessionRepository`, etc.), configures TanStack Query (`@tanstack/react-query`) for background synchronization, stale-while-revalidate caching, and request deduplication, builds responsive, display-matched image URL generators with blurhash placeholders using `expo-image`, and synchronizes user watch progress, playback resume timestamps, and favorites bidirectionally.
</domain>

<decisions>
## Implementation Decisions

### 1. Domain Modeling & Repositories (DATA-01)
- **Decoupled Architecture**: UI components never consume raw Jellyfin DTOs directly. Repositories translate Jellyfin API models into clean, strongly typed FINORA entities:
  - `MediaItem` (id, name, type: 'Movie' | 'Series' | 'Episode' | 'BoxSet', overview, releaseYear, runtimeMinutes, communityRating, genres, backdropUrl, posterUrl, logoUrl, blurhash, playbackPositionTicks, isPlayed, isFavorite, seasonIndex, episodeIndex).
  - `MediaLibrary` (id, name, collectionType: 'movies' | 'tvshows' | 'mixed' | 'boxsets', primaryImageTag).
  - `UserProfile` (id, name, serverId, hasPassword, permissions).
- **Core Repositories**:
  - `MediaRepository`: Library listing (`/Users/{userId}/Views`), library items (`/Users/{userId}/Items`), item details (`/Users/{userId}/Items/{itemId}`), resume/continue watching items (`/UserItems/Resume`), recently added items.
  - `UserRepository`: User details (`/Users/{userId}`), preferences.
  - `UserDataRepository`: Watch progress mutation (`/Users/{userId}/PlayedItems/{itemId}`), favorite toggle (`/Users/{userId}/FavoriteItems/{itemId}`).

### 2. Server State & Caching Architecture (DATA-02)
- **TanStack Query (`@tanstack/react-query`)**:
  - Global `QueryClient` configured with:
    - `staleTime`: 60,000ms (1 minute) for metadata queries to allow instantaneous screen rendering without flicker.
    - `gcTime` (cacheTime): 15 minutes.
    - `retry`: 2 for idempotent queries.
    - Background refetching on window/app focus.
  - Custom typed hooks:
    - `useLibraries(userId)`
    - `useLibraryItems(userId, parentId, options)`
    - `useResumeItems(userId)`
    - `useItemDetails(userId, itemId)`
    - `useRecentlyAdded(userId)`
  - Query keys organized strictly hierarchically: `['media', 'libraries', userId]`, `['media', 'resume', userId]`, `['media', 'item', itemId]`, `['media', 'items', parentId, options]`.

### 3. Display-Matched Image Optimization (DATA-03)
- **expo-image Integration**:
  - Native memory and disk caching enabled by default.
  - Use `expo-image` Image component with blurhash placeholders (`placeholder={item.blurhash}`).
- **Responsive Image Builder (`imageUrlBuilder.ts`)**:
  - Jellyfin supports dynamic server-side image downscaling:
    - Primary poster: `/Items/{itemId}/Images/Primary?maxWidth={width}&maxHeight={height}&quality={quality}&tag={imageTag}`
    - Backdrop: `/Items/{itemId}/Images/Backdrop?maxWidth={width}&quality={quality}&tag={imageTag}`
    - Logo: `/Items/{itemId}/Images/Logo?maxWidth={width}&quality={quality}&tag={imageTag}`
  - Calculates dimensions according to display pixel ratio and target UI slot (e.g., thumbnail poster = 300-400px wide, backdrop = 1080p or screen width * PixelRatio) to prevent downloading massive uncompressed 4K images on mobile.
  - Fallback placeholders if image tag is absent.

### 4. Progress, Resume & Favorite Synchronization (DATA-04)
- **Watch Progress Synchronization**:
  - Reading `UserData.PlaybackPositionTicks` and `UserData.Played` to compute percentage watched (0 - 100%).
  - Mutating playback progress: Updates server via `UserDataRepository.updateProgress(itemId, positionTicks)`.
- **Favorites Management**:
  - Optimistic updates via TanStack Query mutations (`useToggleFavorite`):
    - `POST /Users/{userId}/FavoriteItems/{itemId}` to mark favorite.
    - `DELETE /Users/{userId}/FavoriteItems/{itemId}` to unmark favorite.
    - Immediately updates local query cache with rollback on network failure.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing:**
- `.planning/PROJECT.md` — Core value and performance budget (<1.5s startup, 60/120 FPS scrolling)
- `.planning/REQUIREMENTS.md` — DATA-01, DATA-02, DATA-03, DATA-04
- `.planning/research/STACK.md` — @tanstack/react-query, expo-image, TypeScript strict
- `.planning/research/PITFALLS.md` — Image downscaling, memory leaks, query key collisions
- `src/core/jellyfin/jellyfinClient.ts` — Client singleton providing authenticated HTTP client
- `src/core/jellyfin/authRepository.ts` — Active session token and user ID
</canonical_refs>

<specifics>
## Specific Requirements Covered

- **DATA-01**: Build FINORA repository abstraction layer (AuthRepository, MediaRepository, PlaybackRepository, SessionRepository, UserRepository).
- **DATA-02**: Fetch and cache user libraries, items, collections, and metadata via TanStack Query.
- **DATA-03**: Construct display-optimized image URLs with expo-image (memory/disk cache, blurhash placeholders, downsampled resolutions).
- **DATA-04**: Synchronize user watch progress, resume timestamps, and favorites bidirectionally with Jellyfin.
</specifics>

<deferred>
## Deferred Ideas
- Dynamic Hero banner UI & virtualized carousels → Phase 4 (Cinematic Home)
- Movie & Series detail screens → Phase 5 (Media Details)
- Video player streaming & Direct Play negotiation → Phase 6 (Player Foundation)
</deferred>
