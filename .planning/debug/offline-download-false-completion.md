---
status: resolved
trigger: "RC Android 1.0.0 installed on a real device: offline download is unreliable. FINORA can report a title as downloaded while the transfer is not finalised; backgrounding the app makes downloads fail or disappear; entries vanish then reappear after reconciliation. BLOCKER V1."
created: 2026-09-19
updated: 2026-09-19
---

# Debug Session: offline-download-false-completion

## Symptoms

- **Expected:** A download reaches `completed` only after `downloadAsync()` resolves with a valid HTTP result, the file on disk is verified (present, size coherent), the offline catalog is saved, and the job generation is still current. Progress callbacks must never finalize a download.
- **Actual:** `updateProgress()` sets `status = "completed"` as soon as `bytesDownloaded >= totalBytes`, before `downloadAsync()` resolves. The item is then excluded from persistence, so it disappears from the queue; it also stops counting as active, so the Android foreground service is stopped while the native transfer is still running. On real hardware this yields unreliable downloads, lost entries while backgrounded, and false "downloaded" states.
- **Errors:** None visible.
- **Timeline:** Present at baseline commit `a5e39c0` (v1.0.0, versionCode 1000000).
- **Reproduction:** Start a large download; the progress callback reaches 100 % before the native transfer is finalised. Backgroungh/return exposes the persistence gap.

## Root Cause

Single defect with two consequences.

`src/features/offline/downloadManager.ts` → `updateProgress()` contained:

```ts
if (bytesDownloaded >= totalBytes && totalBytes > 0) {
  item.status = "completed";
  item.completedAt = Date.now();
  ...
  return;
}
```

The expo-file-system progress callback fires when the last bytes are *handed to the native writer*, not when the transfer is closed, validated, persisted, or acknowledged. Setting `completed` here:

1. **BLOCKER A** — finalises a download on a progress signal (`PROGRESS != COMPLETION`).
2. **BLOCKER B** — `persistQueue()` deliberately skips `completed` items, so the still-running transfer is dropped from AsyncStorage. A background `flushPersist()` (AppState `background`) then persists a queue without it → the entry "disappears".
3. **BLOCKER C** — `syncForegroundService()` only counted `status === "downloading"`; the false `completed` (and the legitimate `finalizing` state) made the active count zero, so `stopDownloadForeground()` was called while the native transfer was still alive. On Android that removes the only process protection and the OS kills the transfer. The same omission means finalization itself runs unprotected.
4. **BLOCKER D/E** — the file integrity check, catalog save, generation guard and success notification in `completeDownload()` were all bypassed, so a success could be shown with no committed artifact.

## Fix Plan

- `updateProgress()` reports progress only; it never writes `completed`/`completedAt` and never calls `markCompleted()`. At 100 % it stays `downloading`.
- `syncForegroundService()` counts both `downloading` and `finalizing`, so the foreground service outlives the transfer until the transaction commits.
- `completeDownload()` becomes the only path to `completed`, guarded by an in-flight finalization set (idempotent) and the existing job-generation check.
- Success notification emitted exactly once per committed completion.
- AppState `background`/`inactive` only flushes persistence; it never mutates download state.
- Non-sensitive `[DownloadLifecycle]` instrumentation added.

## Evidence

- `src/features/offline/downloadManager.ts:1568-1652` — `updateProgress()` false-completion branch (removed).
- `src/features/offline/downloadManager.ts:248-305` — `persistQueue()` skips `completed`/`canceled`.
- `src/features/offline/downloadManager.ts:912-957` — `syncForegroundService()` counts only `downloading`.
- `src/features/offline/downloadManager.ts:1788-1904` — authoritative `completeDownload()` transaction.
- `src/features/offline/__tests__/downloadManager.test.ts:39-43` — existing test asserted the *buggy* behaviour (100 % → completed); corrected.
- Baseline verified: `npx tsc --noEmit` → 0 errors; `npx jest src/features/offline src/core/notifications` → 133/133 pass.

## Current Focus

hypothesis: Confirmed — progress callback finalises the job (`updateProgress` → `completed`), which drops it from persistence and zeroes the foreground-service active count mid-transfer.
test: Remove the progress→completed transition; keep the item `downloading` at 100% and let only `completeDownload()` finalize. Assert the foreground service stays up through `finalizing`.
expecting: No `completed` without a verified file + saved catalog; queue entry never disappears before commit; foreground service remains active while any download is `downloading`/`finalizing`.
next_action: done — fixes applied, regression suite green.

## Eliminated

- hypothesis: `downloadAsync()` loses its strong reference in background. Eliminated — the `DownloadResumable` is held in `activeTasks` for the whole transfer and deleted only on resolve/reject.
- hypothesis: AppState `background` pauses/cancels downloads. Eliminated — the listener only calls `flushPersist()` on background and `processQueue()` on active.
- hypothesis: `updateProgress` emits the success notification. Eliminated — it never called `notifyDownloadComplete`; the false "downloaded" signal came from the `completed` status consumed by the UI/catalog reconciliation.

## Resolution

root_cause: `updateProgress()` treated a 100 % progress callback as completion. Because `completed` items are excluded from persistence and from the foreground-service active count, a still-running native transfer was dropped from storage (entries disappeared on background) and the Android foreground service was stopped mid-transfer.
fix:
- `downloadManager.ts` — removed the progress→completed branch; `updateProgress()` now only reports `downloading` progress.
- `downloadManager.ts` — `syncForegroundService()` counts `downloading` + `finalizing`.
- `downloadManager.ts` — `completeDownload()` is the sole transition to `completed`, with an in-flight finalization guard, generation check, verified file, saved catalog, and exactly-once notification.
- `downloadManager.ts` — `markCompleted()` made private; added non-sensitive `[DownloadLifecycle]` logs.
verification:
- `npx tsc --noEmit` → 0 errors.
- `npx jest --silent` → 97 suites, 659/659 tests pass.
- New suite `downloadManagerCompletion.test.ts` → 18/18 pass, covering: 50%/100 % progress never completes, no success notification at 100 %, pending downloadAsync stays unfinished, valid file finalizes→completes, absent/short file fails, catalog-save failure fails, cancel/remove during finalizing never completes, retry keeps one task, AppState background does not mutate state, foreground service survives finalizing and stops after completion/cancel, finalizing restore requeues, 100 %+network error fails, success notification exactly-once (sequential + concurrent).
- `npm run i18n:check` → 728 keys, 100 % EN/FR parity. `npm run version:check` → 1.0.0 / 1000000.
- `npx expo prebuild --platform android --clean` → exit 0. Generated manifest: `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_DATA_SYNC`, `RNBackgroundActionsTask` with `foregroundServiceType="dataSync"`; `SYSTEM_ALERT_WINDOW` absent; `BackgroundActionsPackage` registered in `MainApplication.kt`.
files_changed: `src/features/offline/downloadManager.ts`, `src/features/offline/__tests__/downloadManager.test.ts`, `src/features/offline/__tests__/downloadManagerCompletion.test.ts`
commits: `66f6bb7` fix(offline): prevent progress callbacks from completing downloads · `2eb57f7` fix(android): keep active downloads alive in background · `950b5fe` test(offline): cover completion and background lifecycle regressions
