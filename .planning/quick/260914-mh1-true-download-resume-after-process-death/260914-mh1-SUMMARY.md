---
status: complete
quick_id: 260914-mh1
slug: true-download-resume-after-process-death
date: 2026-09-14
---

# Summary: true-download-resume-after-process-death

## What was done

FINORA already persisted download *metadata* and restored a paused-looking list after an app kill,
but the transfer itself could not be reconstructed: `createDownloadResumable` was called without a
`resumeData` argument, the persisted URL had its token stripped with no replacement, restored configs
dropped their headers, the in-memory task map was empty after a restart, and the queue order was never
persisted. The result was cosmetic recovery, not resume.

The subsystem now rebuilds an authenticated, resumable task from persisted metadata + a fresh
SecureStore session + the existing partial file.

## Files changed

| File | Change |
|---|---|
| `src/features/offline/downloadAuthContext.ts` | **New.** Non-React `getDownloadAuthContext()` built on `authRepository.restoreSession()`, plus `normalizeServerUrl()` / `matchesDownloadIdentity()` |
| `src/features/offline/downloadManager.ts` | Resume engine: `initialize()`, disk reconciliation, byte-offset resume, Range guards, bounded 401/403 retry, completion integrity check, queue-order persistence, throttled persistence, AppState flush |
| `src/app/_layout.tsx` | Boot calls `downloadManager.initialize()` instead of the restore-only method |
| `src/app/details/[id].tsx` | Download call sites pass `quality` + non-sensitive `identity` so the request can be rebuilt |
| `__mocks__/expo-file-system.js` | Controllable file sizes, captured `resumeData`, controllable HTTP status, `savable()` |
| `src/features/offline/__tests__/downloadManagerResume.test.ts` | **New.** The twelve process-death scenarios |
| `src/features/offline/__tests__/downloadManagerPersistence.test.ts` | The two assertions whose intended behaviour changed |
| `.planning/OFFLINE_DOWNLOAD_RESUME.md` | **New.** Architecture, platform behaviour, Range rules, security, manual Android procedure, limitations |

## Commits

| Commit | Message |
|---|---|
| `ef7dedc` | `feat(offline): resume downloads after process death from partial files` |
| `8a22535` | `test(offline): cover download resume after process death` |
| `3dd90fb` | `docs(offline): document download resume validation and limitations` |

## Architecture retained

```
Persisted download metadata (AsyncStorage, token-free: quality, serverId, userId, serverUrl, resumeOffset)
        +
Fresh Jellyfin session (SecureStore via authRepository.restoreSession)
        +
Existing partial file (real size adopted as the offset)
        ↓
Reconstructed authenticated download task
        ↓
True resume — Android: resumeData = String(partialSize) → native `Range: bytes=N-`
```

Key verified native facts driving the design (read from the installed expo-file-system 57.x sources,
not assumed):

- Android `legacy/FileSystemLegacyModule.kt:698` — `resumeData` is literally the file length, so the
  offset can be **synthesized** from the partial file. No `pauseAsync()` is needed to enable resume
  after a hard kill. `:661-663` turns it into `Range: bytes=N-`.
- Android `:926` — `FileOutputStream(file, isResume)` opens the destination in **append** mode, so a
  source answering `200` to a Range request would silently concatenate a second copy. Detected via the
  response status and handled by discarding + restarting once.
- iOS `Legacy/FileSystemLegacyModule.swift:277-278, :306` — `resumeData` is an opaque `NSURLSession`
  blob that embeds the request headers, i.e. the access token. It is therefore never persisted.

## Security

**The Jellyfin access token is not stored in download metadata.** The persisted entry contains only
`itemId`, `title`, `type`, years, a token-stripped `downloadUrl`, local paths, status/progress counters,
`quality`, `serverId`, `userId`, `serverUrl` and `resumeOffset`. Test 2 asserts the raw persisted JSON
contains none of `token`, `api_key`, `authorization`, `password` (the token literal used in the test is
also absent). Tokens are re-read from SecureStore at resume time, and iOS resume blobs are never
persisted because they carry credentials. Downloads are bound to their server/user so another account's
token is never used. Only non-sensitive fields are logged, and `logger.ts` additionally redacts
`Authorization`, `X-Emby-Token` and `token=` / `api_key=` patterns.

## Tests

```
TypeScript:     PASS (npx tsc --noEmit, exit 0)
Jest:           PASS — 73/73 suites, 419/419 tests
Suites:         73 (72 before + 1 new)
Tests:          419 (407 before + 12 new)
GitHub Actions: PASS — run 34862626985 on 6f5ea00
                "Test Suites: 73 passed, 73 total"
                "Tests:       419 passed, 419 total"
                typecheck OK (job 1m13s)
```

### Local environment caveat (this cost some time — recorded so it is not repeated)

Initial local runs reported 35 failing suites / 137 failing tests, and the first version of this
summary wrongly concluded that `master` was already red in CI.

That was an artifact of the local Windows shell having **`NODE_ENV=production` exported**. React's
*production* build strips `act`, so `react-test-renderer`'s `exports.act = React.act` evaluates to
`undefined` and every component suite fails with
`TypeError: (0, react_test_renderer_1.act) is not a function`. With `NODE_ENV=test` (what Jest and CI
use) `React.act` is a function and the whole suite is green.

`master` was never red. Verified by `gh run view --job=104029664159 --log` on the parent commit
`c5873fa`: `Test Suites: 72 passed, 72 total` / `Tests: 407 passed, 407 total`.

No test was weakened and no source workaround was added for this.

## Deviations from the plan

- The plan specified `docs/OFFLINE_DOWNLOAD_RESUME.md`; the project keeps its operational docs in
  `.planning/` (`BACKGROUND_NOTIFICATIONS.md`, `RELEASE_CHECKLIST.md`), so the doc was written to
  `.planning/OFFLINE_DOWNLOAD_RESUME.md` to match the existing convention.
- The `gsd-planner` and `gsd-executor` subagents both returned without performing any work in this
  runtime (zero tool calls, empty output), so the plan and implementation were produced directly by the
  orchestrator. Plan, atomic commits, summary and state update were still delivered.

## Limitations

- **iOS does not resume across a process death.** Its `resumeData` embeds the request headers, so
  persisting it would persist the token. A partial file with no live in-memory task is deleted and
  restarted from 0. In-process pause/resume on iOS is unchanged.
- **Resume requires the source to support HTTP Range.** Jellyfin does for direct downloads; a
  transcoded stream may not. When it does not, the transfer restarts from 0 exactly once — a
  concatenated/corrupt file can never be produced or reported as complete.
- **Unknown `Content-Length`** (some Jellyfin transcode responses) means the size cross-check is
  skipped, since there is nothing to compare against.
- **Transcoded streams are not resumable mid-flight** because the server regenerates the output; the
  byte offset is only meaningful for stable, range-capable sources.
- **Real-device resume was not executed here** — no Android device or Jellyfin server was available in
  this environment. The Android behavior is implemented against, and verified by reading, the native
  sources, and exercised through tests; the manual device procedure in
  `.planning/OFFLINE_DOWNLOAD_RESUME.md` remains the final acceptance step.
