# Quick Task: migrate-expo-background-task

**Date:** 2026-09-14  
**Slug:** migrate-expo-background-task

## Task

Migrate from deprecated `expo-background-fetch` to `expo-background-task` (Expo SDK 53+).

## Scope

1. Install `expo-background-task`, remove `expo-background-fetch` from `package.json`
2. Rewrite `src/core/notifications/backgroundFetchTask.ts` to use new API
3. Update `__mocks__/expo-background-fetch.js` → `__mocks__/expo-background-task.js`
4. Update `jest.config.js` module name mapper
5. Update test file `__tests__/backgroundFetchTask.test.ts`
6. Commit with `chore: migrate expo-background-fetch → expo-background-task`

## API Mapping

| Old | New |
|-----|-----|
| `BackgroundFetch.BackgroundFetchResult.NewData` | `BackgroundTask.BackgroundTaskResult.Success` |
| `BackgroundFetch.BackgroundFetchResult.NoData` | `BackgroundTask.BackgroundTaskResult.Success` |
| `BackgroundFetch.BackgroundFetchResult.Failed` | `BackgroundTask.BackgroundTaskResult.Failed` |
| `BackgroundFetch.getStatusAsync()` | removed (no equivalent needed) |
| `BackgroundFetch.BackgroundFetchStatus.*` | removed |
| `BackgroundFetch.registerTaskAsync(name, opts)` | `BackgroundTask.registerTaskAsync(name, opts)` |
| `BackgroundFetch.unregisterTaskAsync(name)` | `BackgroundTask.unregisterTaskAsync(name)` |
