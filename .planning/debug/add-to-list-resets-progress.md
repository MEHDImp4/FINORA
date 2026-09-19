---
status: resolved
trigger: "jai trouver un bug, quand je ajoute une serie ou film a ma liste la serie ou le film si deja debuter se marque comme non vue et senleve de continuer de regarder"
created: 2026-09-19
updated: 2026-09-19
---

# Debug Session: add-to-list-resets-progress

## Symptoms

- **Expected:** Adding an already-started movie or series to My List must leave playback progress untouched and the item must remain in Continue Watching.
- **Actual:** After adding the item to My List, its played state resets to unplayed ("non vue") and it disappears from the Continue Watching row.
- **Errors:** None visible (silent failure, no console/log warning reported).
- **Timeline:** Never worked / always broken — no known working version.
- **Reproduction:** Partially watch a movie or series, then add it to My List; observe watch state resets and the item leaves Continue Watching. Affects both movies and series.

## Current Focus

hypothesis: `setFavorite` used Jellyfin's dedicated favorite endpoint, whose handler rewrites the whole `UserItemData` record and can zero `PlaybackPositionTicks`; switching to the field-merge user-data endpoint makes the favorite toggle incapable of touching progress.
test: regression test in `src/core/repositories/__tests__/userDataRepository.test.ts` asserting the favorite toggle issues only `POST /UserItems/{itemId}/UserData` (body `{ IsFavorite }`) and never `DELETE /PlayedItems` / `DELETE /PlayingItems`.
expecting: toggle favorite never mutates progress fields; progress and Continue Watching survive.
next_action: done — fix applied, typecheck + targeted tests pass.

## Evidence

- 2026-09-19: `src/core/repositories/userDataRepository.ts:16-34` (before) — `setFavorite` sent `POST|DELETE /Users/{userId}/FavoriteItems/{itemId}`. Jellyfin's handler for that route reads the full `UserItemData` and saves it back, so a stale/absent in-memory copy rewrites `PlaybackPositionTicks` (and can flip `Played`).
- 2026-09-19: Jellyfin server source (master) `Jellyfin.Api/Controllers/UserLibraryController.cs` — `MarkFavorite` does `GetUserData(...)` → `data.IsFavorite = isFavorite` → `SaveUserData(user, item, data, ...)`, i.e. a whole-record write. The legacy route the app used delegates to this same handler.
- 2026-09-19: `Emby.Server.Implementations/Library/UserDataManager.cs` — the `SaveUserData(User user, BaseItem item, UpdateUserItemDataDto userDataDto, ...)` overload applies **only the non-null fields**; `POST /UserItems/{itemId}/UserData` uses this overload, so sending `{ IsFavorite }` cannot clear `PlaybackPositionTicks` / `Played` / `PlayCount`.
- 2026-09-19: `node_modules/@jellyfin/sdk/.../items-api.js:533-565` + `.../models/update-user-item-data-dto.d.ts` — SDK method `ItemsApi.updateItemUserData(itemId, updateUserItemDataDto, userId?)` → `POST /UserItems/{itemId}/UserData`, `userId` a query parameter, body `UpdateUserItemDataDto` (`IsFavorite?: boolean | null`). Signature verified against the installed SDK (not guessed).
- 2026-09-19: `src/hooks/useUserDataMutations.ts:19-64` — the optimistic cache update only writes `isFavorite` and preserves `playedPercentage` / `playbackPositionTicks` / `isPlayed`; the reset was therefore server-side, surfaced by the `onSettled` refetch of `mediaKeys.all`.
- 2026-09-19: `src/core/repositories/mediaMapper.ts:32-43` — `playedPercentage`/`isPlayed` are direct reads of server `UserData`, so a zeroed position is exactly the observed "non vue" + removal from `/UserItems/Resume`.

## Eliminated

- hypothesis: the optimistic TanStack update overwrites `UserData` (playback position). Eliminated — it only sets `isFavorite` via spreads.
- hypothesis: the favorite mutation calls `markUnplayed` / `removeFromResume`. Eliminated — those are only wired to explicit "mark unwatched" / "remove from Continue Watching" actions, not to favorite toggles.
- hypothesis: cache invalidation alone drops the item from Continue Watching. Eliminated — invalidation only refetches server truth.
- hypothesis: playback session reporting (Start/Progress/Stop) sends a zero position. Eliminated — stop uses `lastPositionTicks` seeded from the item's resume position (`FinoraPlayerEngine` constructed with `initialPositionSeconds`).

## Resolution

root_cause: `UserDataRepository.setFavorite` toggled favorites through the dedicated endpoint `POST|DELETE /Users/{userId}/FavoriteItems/{itemId}`. Jellyfin's handler for that route performs a read-modify-write of the **entire** `UserItemData` record, so when its in-memory copy is stale/absent it rewrites `PlaybackPositionTicks` to 0 (and can flip `Played`). The subsequent `mediaKeys.all` invalidation refetched `/UserItems/Resume` and the item vanished from Continue Watching, appearing as "adding to My List reset my progress".

fix: `src/core/repositories/userDataRepository.ts` — `setFavorite` now writes favorites through the field-merge endpoint `POST /UserItems/{itemId}/UserData` with `userId` as a query parameter and body `{ IsFavorite: boolean }` (endpoint/param verified against `@jellyfin/sdk` `ItemsApi.updateItemUserData` and `UpdateUserItemDataDto`). The field-merge overload applies only the provided fields, so toggling My List can never modify `PlaybackPositionTicks`, `Played`, or `PlayCount`. Public signature and return contract unchanged; callers unaffected.

verification: `npm run typecheck` → 0 errors. `npx jest src/core/repositories/__tests__/userDataRepository.test.ts src/hooks/__tests__/useFavoriteMutation.test.tsx` → 13/13 passed. The added regression asserts the favorite toggle issues ONLY `/UserItems/{itemId}/UserData` (never `DELETE /PlayedItems` or `DELETE /PlayingItems`) and that the payload contains only `IsFavorite` (no progress fields). Follow-up: confirm on device that adding to My List keeps the item in Continue Watching.

files_changed: `src/core/repositories/userDataRepository.ts`, `src/core/repositories/__tests__/userDataRepository.test.ts`
