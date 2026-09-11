# Phase 08: Search & Library - Research

**Phase:** 08-search-and-library  
**Date:** 2026-09-11  
**Status:** In Progress  

---

## Technical Approach & Architecture

Phase 8 implements universal media discovery and deep catalog exploration for FINORA:
1. **Global Debounced Search (`SRCH-01`)**:
   - Fast typing experience with <300ms debounce.
   - Automatic abort/cancellation of in-flight stale requests via TanStack Query and `AbortController`.
   - Category filtering chips: **All**, **Movies**, **Series**, **Episodes**, **People**.
   - Local search history persistence via `AsyncStorage` (max 10 recent searches, clearable, instant re-query on tap).
   - Instant visual results rendered via 2-column or 3-column media grid.
2. **Library Browse Screen (`SRCH-02`)**:
   - Virtualized media grid (`FlatList` with `numColumns={3}`).
   - Category / Collection switching (Movies, TV Shows, Box Sets / Collections).
   - Genre filter chips dynamically populated from library metadata.
   - Sorting options bottom sheet:
     - Name (A-Z, Z-A)
     - Release Date (Newest, Oldest)
     - Community Rating (Highest, Lowest)
     - Date Added
   - Virtualization optimization: `initialNumToRender={12}`, `windowSize={5}`, `maxToRenderPerBatch={12}`, `removeClippedSubviews={true}` for 60/120 FPS scrolling.

---

### 1. Data Layer & Repository Additions (`SRCH-01`, `SRCH-02`)

- **Media Repository (`src/core/repositories/mediaRepository.ts`)**:
  - `searchMedia(userId: string, searchTerm: string, itemTypes?: string[], customClient?: HttpClient): Promise<MediaItem[]>`:
    - Calls `/Users/${userId}/Items` with `SearchTerm=${encodeURIComponent(searchTerm)}`, `Recursive=true`, `IncludeItemTypes=${types.join(",")}`, `Fields="Overview,Genres,ProductionYear,CommunityRating,ImageTags,BackdropImageTags,ImageBlurHashes,UserData"`.
  - `getGenres(userId: string, parentId?: string, customClient?: HttpClient): Promise<string[]>`:
    - Calls `/Genres` with `UserId=${userId}` and `ParentId=${parentId}`.
- **Search History Store / Service (`src/features/search/searchHistory.ts`)**:
  - Key: `finora_search_history`.
  - Methods: `getRecentSearches()`, `addSearchTerm(term: string)`, `removeSearchTerm(term: string)`, `clearSearchHistory()`.
- **TanStack Query Hooks (`src/hooks/useSearchQueries.ts`)**:
  - `useSearchMedia(userId: string, searchTerm: string, itemType?: string)`:
    - Debounced query with `enabled: searchTerm.trim().length >= 2`.
    - Automatically cancels stale HTTP requests when user types additional characters.
  - `useGenres(userId?: string, parentId?: string)`.

---

### 2. Search Screen Components (`SRCH-01`)

- **Component**: `src/features/search/components/SearchBar.tsx`:
  - Styled text input with magnifying glass icon, clear button (✕), active search indicator.
  - Autofocus option with instant responsive keyboard handling.
- **Component**: `src/features/search/components/SearchCategoryChips.tsx`:
  - Horizontal chip list: All, Movies, Series, Episodes, People.
- **Component**: `src/features/search/components/SearchHistoryList.tsx`:
  - Shows recent search terms with clock icon and remove button (✕), plus "Clear All" action.
- **Component**: `src/app/(tabs)/search.tsx`:
  - Connects `SearchBar`, `SearchCategoryChips`, `SearchHistoryList`, and `FlatList` results grid.
  - Navigates to `/details/[id]` on card tap.

---

### 3. Library Browse Screen Components (`SRCH-02`)

- **Component**: `src/features/library/components/LibraryFilterBar.tsx`:
  - Horizontal genre chips (e.g. Action, Sci-Fi, Drama, Comedy) and active filter toggle.
- **Component**: `src/features/library/components/SortOptionsModal.tsx`:
  - Bottom sheet modal for selecting sort order (Title, Release Date, Rating, Date Added) and direction (Ascending / Descending).
- **Component**: `src/features/library/components/LibraryGridView.tsx`:
  - 3-column virtualized grid with `MediaCard` poster items.
  - Fast scroll responsiveness with memory caching.
- **Component**: `src/app/(tabs)/library.tsx`:
  - Top library tabs (Movies, TV Shows, Collections) if multiple libraries exist.
  - Filter bar, sort trigger button, and virtualized grid.

---

## Validation Strategy

1. **Unit Tests**:
   - `searchHistory.test.ts`: test adding, deduplicating, limiting to 10 entries, and clearing recent searches.
   - `searchMedia.test.ts`: test repository search queries with search term and type filters.
   - `SearchBar.test.tsx`: test input text changes and clear action.
   - `LibraryGridView.test.tsx`: test virtualized grid rendering, sort parameters, and genre filtering.
2. **Type Safety**:
   - Full `npx tsc --noEmit` and `npm test`.
