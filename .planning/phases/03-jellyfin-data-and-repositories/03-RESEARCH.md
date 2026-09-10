# Phase 03: Jellyfin Data & Repositories - Research

**Phase:** 03-jellyfin-data-and-repositories  
**Date:** 2026-09-10  
**Status:** Completed  

---

## Technical Approach & Architecture

### 1. Domain Entities & Decoupled Architecture (DATA-01)
- **Problem**: Directly consuming Jellyfin API responses leaks deeply nested, nullable backend structures into React Native UI components, causing fragile code, unexpected null pointer exceptions, and tight coupling to backend versions.
- **Solution**: A repository layer maps raw Jellyfin models into clean, unified, immutable domain entities:
  ```typescript
  export interface MediaItem {
    id: string;
    name: string;
    type: "Movie" | "Series" | "Season" | "Episode" | "BoxSet" | "Unknown";
    overview?: string;
    year?: number;
    runtimeMinutes?: number;
    communityRating?: number;
    genres: string[];
    backdropImageTag?: string;
    primaryImageTag?: string;
    logoImageTag?: string;
    blurhash?: string;
    playbackPositionTicks: number;
    totalTicks: number;
    playedPercentage: number;
    isPlayed: boolean;
    isFavorite: boolean;
    seriesId?: string;
    seriesName?: string;
    seasonId?: string;
    seasonIndex?: number;
    episodeIndex?: number;
  }
  ```
- **Repositories**:
  - `MediaRepository`: Wraps item retrieval, library root views, item lists, and details.
  - `UserRepository`: Wraps user profile info and server user listing.
  - `UserDataRepository`: Wraps item playback progress, mark played/unplayed, and favorite toggle endpoints.

### 2. TanStack Query Caching & Hooks (DATA-02)
- **Library**: `@tanstack/react-query` v5.
- **Query Keys Factory**:
  ```typescript
  export const mediaKeys = {
    all: ["media"] as const,
    libraries: (userId: string) => [...mediaKeys.all, "libraries", userId] as const,
    items: (userId: string, parentId?: string, options?: object) =>
      [...mediaKeys.all, "items", userId, parentId, options] as const,
    resume: (userId: string) => [...mediaKeys.all, "resume", userId] as const,
    recentlyAdded: (userId: string) => [...mediaKeys.all, "recentlyAdded", userId] as const,
    detail: (userId: string, itemId: string) => [...mediaKeys.all, "detail", userId, itemId] as const
  };
  ```
- **Configuration**:
  - `staleTime: 1000 * 60` (1 minute): Browsing between tabs renders instantly from cache.
  - `gcTime: 1000 * 60 * 15` (15 minutes).
  - Background revalidation on network reconnection.

### 3. Display-Matched Image Optimization (DATA-03)
- **Library**: `expo-image` (2.0.7 for Expo SDK 52).
- **Endpoint Structure**:
  - Primary: `/Items/{itemId}/Images/Primary?fillWidth={width}&quality={quality}&tag={tag}`
  - Backdrop: `/Items/{itemId}/Images/Backdrop?fillWidth={width}&quality={quality}&tag={tag}`
  - Logo: `/Items/{itemId}/Images/Logo?fillWidth={width}&quality={quality}&tag={tag}`
- **Dimensions Strategy**:
  - Calculate target physical pixel dimensions based on `PixelRatio.get()`.
  - Poster card: width ~ 300-400 physical px, quality 85.
  - Hero backdrop: width ~ 1080-1440 physical px, quality 80.
  - Thumbnails / episodes: width ~ 400-500 physical px, quality 80.
- **Blurhash Support**:
  - Jellyfin returns `ImageBlurHashes` dictionary on items (e.g. `{ "Primary": { ... }, "Backdrop": { ... } }`).
  - Extracted and passed directly to `<Image placeholder={blurhash} />` for smooth progressive loading.

### 4. Progress & Favorites Synchronization (DATA-04)
- **Endpoints**:
  - Mark Favorite: `POST /Users/{userId}/FavoriteItems/{itemId}`
  - Unmark Favorite: `DELETE /Users/{userId}/FavoriteItems/{itemId}`
  - Mark Played: `POST /Users/{userId}/PlayedItems/{itemId}`
  - Mark Unplayed: `DELETE /Users/{userId}/PlayedItems/{itemId}`
- **Optimistic Mutations**:
  - `useToggleFavorite(userId)` optimistically flips `isFavorite` in cached query items and rolls back if network fails.
  - Invalidate `mediaKeys.detail(userId, itemId)` and parent collections upon completion.

---

## Validation Architecture

### Test Infrastructure
- **Framework**: Jest with `ts-jest`
- **Config**: `jest.config.js`
- **Command**: `npm test -- repositories` and `npm run typecheck && npm test`
- **Estimated runtime**: ~6 seconds

### Automated Verification Targets
1. `DATA-01`: Domain mapping functions correctly parse raw Jellyfin payloads, calculate runtimes/percentages, handle missing/null properties gracefully, and `MediaRepository` dispatches typed queries.
2. `DATA-02`: TanStack Query hooks fetch libraries and item carousels, apply caching policies, and deduplicate requests.
3. `DATA-03`: `imageUrlBuilder` outputs pixel-ratio-scaled URLs with quality parameters, image tags, and blurhashes.
4. `DATA-04`: Favorite and progress mutation hooks correctly update server endpoints and optimistically update client cache.
