---
status: complete
---

# Summary: migrate-expo-background-task

**Date:** 2026-09-14  
**Commit:** `894512c`

## What was done

Migrated `expo-background-fetch` (deprecated in Expo SDK 53) to `expo-background-task`.

## Files changed

| File | Change |
|------|--------|
| `package.json` | Replaced `expo-background-fetch` with `expo-background-task` |
| `src/core/notifications/backgroundFetchTask.ts` | Full rewrite to new API |
| `src/core/notifications/__tests__/backgroundFetchTask.test.ts` | Updated to new API, all 13 tests pass |
| `__mocks__/expo-background-task.js` | New mock (replaces expo-background-fetch.js) |
| `jest.config.js` | Updated moduleNameMapper |

## Key API differences discovered

- `BackgroundTaskOptions` only has `minimumInterval` — `stopOnTerminate` and `startOnBoot` are no longer needed (WorkManager/BGTaskScheduler handle this automatically)
- No-op task runs return `BackgroundTaskResult.Success` (not `NoData`)
- `getStatusAsync` still exists in the new API but the `Restricted`/`Denied` registration guard was removed — the OS handles it

## Tests

13/13 passing ✓
