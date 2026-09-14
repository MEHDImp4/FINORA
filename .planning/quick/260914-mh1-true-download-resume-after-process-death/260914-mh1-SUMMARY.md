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
TypeScript:  PASS (npx tsc --noEmit, exit 0)
Jest:        PASS for this work — 12/12 new tests, all 5 pre-existing offline .ts suites green
Suites:      73 total (72 baseline + 1 new)
Tests:       419 total (407 baseline + 12 new)
Baseline:    35 suites / 137 tests fail on master before this work
After:       35 suites / 137 tests fail — identical, i.e. no new failures
GitHub Actions: Cannot be verified from here; CI runs `npm run typecheck` (passes) and
                `npm test -- --ci --no-coverage --forceExit --passWithNoTests`, which is ALREADY RED
                on master for reasons unrelated to this change (see Limitations).
```

### Pre-existing failure (not caused by this change)

35 suites / 137 tests fail on `master` **before** any of this work. Every failing suite is a `.tsx`
React component test and the error is:

```
TypeError: (0, react_test_renderer_1.act) is not a function
```

React 19.2.3 no longer exports `act` (verified: it is absent from `Object.keys(require("react"))`), and
`react-test-renderer` 19 no longer provides it either, but the 35 suites still
`import { act } from "react-test-renderer"`. This needs a deliberate test-renderer migration.
It was left untouched because it is unrelated to download resume and a shim would have produced
false-green tests. **No test was weakened to make this task look green.**

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
