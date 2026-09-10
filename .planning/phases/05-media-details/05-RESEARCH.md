# Phase 05: Media Details - Research

**Phase:** 05-media-details  
**Date:** 2026-09-11  
**Status:** Completed  

---

## Technical Approach & Architecture

### 1. Data Layer & Repository Extensions (DET-01, DET-02)
- **Domain Model Extensions (`src/types/media.ts`)**:
  - `Person`: `{ id: string; name: string; role: string; type: string; primaryImageTag?: string }`
  - `MediaStreamInfo`: `{ type: "Video" | "Audio" | "Subtitle"; codec?: string; displayTitle?: string; width?: number; height?: number; channels?: number; isDefault?: boolean }`
  - `MediaItem`: Add optional fields `officialRating?: string`, `tagline?: string`, `people?: Person[]`, `mediaStreams?: MediaStreamInfo[]`, `seasonCount?: number`.
- **Mapper Updates (`src/core/repositories/mediaMapper.ts`)**:
  - Extract `OfficialRating` (e.g. "PG-13", "TV-MA").
  - Extract `Taglines` (first entry) or `Overview`.
  - Extract `People` array from Jellyfin DTO, mapping actors, directors, writers.
  - Extract `MediaStreams` (video codec, resolution 4K/1080p, audio channels 5.1/stereo, audio codec).
- **Media Repository Additions (`src/core/repositories/mediaRepository.ts`)**:
  - `getSeasons(userId: string, seriesId: string): Promise<MediaItem[]>`: Calls `/Shows/${seriesId}/Seasons` with fields `Overview,ProductionYear,CommunityRating,ImageTags,BackdropImageTags,ImageBlurHashes,UserData,ItemCounts`.
  - `getEpisodes(userId: string, seriesId: string, seasonId: string): Promise<MediaItem[]>`: Calls `/Shows/${seriesId}/Episodes` with `seasonId`, extracting runtime, index numbers, progress, and episode thumbnails.
- **TanStack Query Hooks (`src/hooks/useMediaQueries.ts`)**:
  - `useItemDetails(itemId?: string, userId?: string)`: fetches enriched media details with 5-minute staleTime.
  - `useSeasons(seriesId?: string, userId?: string)`: fetches seasons for a TV series.
  - `useEpisodes(seriesId?: string, seasonId?: string, userId?: string)`: fetches episodes for selected season.

### 2. Movie Details Screen Component (DET-01)
- **Component**: `src/features/details/components/MovieDetailsView.tsx`
  - **Cinematic Header**:
    - Backdrop image (`expo-image`, quality 85, screen width).
    - Dark vertical gradient overlay (`expo-linear-gradient`) fading to `#0A0A0C`.
    - Logo image or large display title fallback.
    - Back navigation button (`FinoraIconButton` with `<` chevron, absolute top safe area).
  - **Metadata Row**:
    - Release year, formatted runtime (e.g. `2h 18m`), community rating (`★ 8.8`), official age rating badge (e.g. `PG-13`), resolution badge (`4K` / `1080p`), audio badge (`5.1` / `Stereo`).
  - **Action Button Row**:
    - Primary "Play" / "Resume" (`FinoraButton`, red `#E50914`, play icon, with resume position indicator if partially watched).
    - Secondary "+ Watchlist" (`FinoraIconButton` hooked to `useToggleFavorite`).
    - Secondary "Mark Watched" (`FinoraIconButton` hooked to `useMarkPlayed`).
  - **Synopsis & Tagline**:
    - Tagline italicized in muted silver `#8E8E9F`.
    - Overview paragraph with expand/collapse toggle for long summaries.
    - Genre pills (`FinoraTheme.colors.surfaceLight`).
  - **Cast & Crew Section**:
    - Horizontal avatar carousel (`CastList.tsx`).
    - Circular actor photos (`getPersonImageUrl` or fallback initials avatar).
    - Actor name and character name.

### 3. Series Details Screen Component (DET-02)
- **Component**: `src/features/details/components/SeriesDetailsView.tsx`
  - **Cinematic Header**:
    - Show backdrop, gradient, title/logo, metadata (seasons count, year range, rating).
    - "Play Next Episode" primary button (auto-determines next unplayed episode or episode 1).
    - Watchlist and favorite action buttons.
  - **Season Picker**:
    - Horizontal pill bar or dropdown allowing switching between Season 1, Season 2, Specials, etc.
    - Default selects the current in-progress season or Season 1.
  - **Episode Cards (`EpisodeCard.tsx`)**:
    - Horizontal card layout: 16:9 episode thumbnail (width ~140dp) with play button overlay and individual progress bar (`#E50914`).
    - Episode index and title (e.g. `E1 · Pilot`).
    - Episode runtime and air date.
    - Brief synopsis.
    - Quick play tap action.

### 4. Card-to-Details Navigation & Touch Feedback (DET-03)
- **Route Setup**:
  - `src/app/details/[id].tsx`: dynamic Expo Router route receiving `id` parameter.
  - Inspects `item.type`: renders `MovieDetailsView` for `Movie`, `SeriesDetailsView` for `Series`, or general details.
- **Touch & Transition Polish**:
  - All media cards (`MediaCard`, `HeroBanner` play button) navigate via `router.push({ pathname: "/details/[id]", params: { id: item.id } })`.
  - Pressable scale animation (`activeOpacity={0.8}` or Reanimated subtle scale) providing immediate visual feedback in <50ms.
  - Smooth native stack transitions using Expo Router native stack animation (`fade_from_bottom`).

---

## Validation Architecture

### Test Infrastructure
- **Framework**: Jest with `ts-jest` & `react-test-renderer`
- **Config**: `jest.config.js`
- **Verification Commands**:
  - `npx jest --testPathPattern=MovieDetails.test.tsx`
  - `npx jest --testPathPattern=SeriesDetails.test.tsx`
  - `npm test` and `npx tsc --noEmit`

### Automated Verification Targets
1. `DET-01`: Movie details view renders backdrop, logo/title, badges, synopsis, action buttons (Play, Favorite), cast carousel, and media specs.
2. `DET-02`: Series details view renders season selector, episode list with thumbnails, episode numbers, titles, and individual progress bars. "Play Next" resolves correctly.
3. `DET-03`: Card press dispatches navigation route with item ID, screen mounts within tab and stack architecture with <50ms visual touch feedback.
