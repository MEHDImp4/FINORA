# Offline Download Resume After Process Death

**Status:** Implemented — Android performs true byte-range resume; iOS restarts from zero (native limitation, see below).

---

## What it does

A download that is interrupted by a real JavaScript process death (Android force-stop, OS memory
kill, reboot) is rebuilt from three ingredients and continues from where it stopped, instead of
silently restarting from 0 with no working authentication.

```
Persisted download metadata  (AsyncStorage, token-free)
        +
Fresh Jellyfin session       (SecureStore, read via authRepository.restoreSession)
        +
Existing partial file        (app sandbox)
        ↓
Reconstructed authenticated download task
        ↓
True resume (HTTP Range on Android)
```

## Files

| File | Role |
|---|---|
| `src/features/offline/downloadManager.ts` | Persistence, restore, reconciliation, resume engine, range guards, bounded auth retry, integrity check |
| `src/features/offline/downloadAuthContext.ts` | Non-React secure session accessor + server/user identity matching |
| `src/features/offline/downloadQuality.ts` | Single source of truth for `buildDownloadUrl` / `getDownloadHeaders` |
| `src/core/jellyfin/authRepository.ts` | `restoreSession()` — reads the token from SecureStore and validates it |
| `src/app/_layout.tsx` | Calls `downloadManager.initialize()` at boot |

## Boot sequence

```
FINORA starts
  └─ downloadManager.initialize()
       ├─ restorePersistedDownloads()
       │    ├─ drop completed/canceled
       │    ├─ reconcile each entry against the REAL file on disk
       │    │    • file already full size      → reconcile into the offline catalogue
       │    │    • file missing                → reset counters to 0 (never a fake %)
       │    │    • partial file present        → adopt its real byte size as the offset
       │    │    • file with no metadata       → left to offlineStorage.cleanupOrphanDiskFiles()
       │    ├─ status routing: downloading/queued → requeued · paused → stays paused · failed → stays failed
       │    └─ restore FIFO queue order from @finora_download_order
       ├─ getDownloadAuthContext()  →  SecureStore session (or null)
       ├─ validate stored serverId/userId/serverUrl against the current session
       │    └─ mismatch or no session → paused + AUTH_REQUIRED, file and metadata kept
       ├─ processQueue()            → promotes at most MAX_CONCURRENT_DOWNLOADS (3)
       └─ AppState listener         → flush persistence on background/inactive
```

## Platform behaviour

| | Android | iOS |
|---|---|---|
| `resumeData` meaning | plain byte offset | opaque `NSURLSession` resume blob |
| How it is obtained | synthesized from the partial file size | only via `pauseAsync()` |
| Persisted? | yes — a number, non-sensitive | **never** — the blob embeds request headers (i.e. the access token) |
| Resume after process death | yes, real HTTP `Range: bytes=N-` | no — partial file is discarded and restarted from 0 |

Source of truth for the above: `expo-file-system` 57.x
`android/.../legacy/FileSystemLegacyModule.kt:661-663, :698, :926` and
`ios/Legacy/FileSystemLegacyModule.swift:277-278, :306`.

## Range safety rules

The native Android layer opens the destination file in **append** mode when resuming. A source that
ignores `Range` and answers `200` with the full body would therefore silently concatenate two copies
of the media. The JS layer enforces:

| Response | Meaning | Action |
|---|---|---|
| `206` | genuine partial content | continue |
| `200` with offset > 0 | source ignored Range → file is corrupt | delete the file, restart from 0 **once**, never mark completed |
| `416` | range not satisfiable | complete if the file already matches the expected size, otherwise restart from 0 |
| `401` / `403` | session expired | refresh the session and rebuild **once**, then a recoverable failure |
| other `4xx`/`5xx` | transient | recoverable failure — **partial file is kept** |

A transfer is only marked `completed` after the real on-disk size is verified against the expected
size (when the server reported one).

## Security guarantees

- The Jellyfin access token is **never** written to `@finora_download_queue`, `@finora_download_order`,
  the offline catalogue, or any log. Only `serverId` / `userId` / `serverUrl` (non-sensitive) are persisted.
- Tokens are re-read from SecureStore through `authRepository.restoreSession()` at resume time.
- iOS resume blobs are never persisted precisely because they carry the request headers.
- Downloads are bound to their server/user; a download from server A / user A is never resumed with
  server B / user B credentials (URLs normalized before comparison).
- The download logger emits only `itemId`, byte counts, status and reason — and `src/core/network/logger.ts`
  additionally redacts `Authorization`, `X-Emby-Token` and `token=` / `api_key=` patterns.

---

## Manual validation on a real Android device

1. Install a FINORA preview/release build.
2. Sign in to Jellyfin.
3. Download a sufficiently large movie (several GB, so 20–40 % is not instant).
4. Let it reach roughly 20–40 %.
5. Force-stop FINORA from Android settings (App info → Force stop).
6. Confirm the partial file still exists — via `adb shell run-as <package> ls -l files/finora_downloads/`
   (the file should be non-zero and smaller than the media).
7. Reopen FINORA.
8. Confirm the download is restored and shows its real progress.
9. Confirm it continues from the partial offset **without returning to 0 %** — check that the byte
   counters pick up around the previous value rather than restarting.
10. Let it finish.
11. Enable airplane mode.
12. Play the downloaded media — it must play from local storage.
13. Disable airplane mode.
14. Confirm watch-progress syncs back to Jellyfin.

Additionally, where possible:

```
kill the app → reboot the phone → open FINORA → confirm the download resumes
```

### Checking that the resume was real

Watch the native request, not just the UI percentage. With the Jellyfin server logs (or a proxy such
as `mitmproxy`), a genuine resume issues a request carrying:

```http
Range: bytes=<offset>-
```

and the response must be `206 Partial Content`. A `200 OK` means the source did not honor the range —
FINORA will then discard the partial file and restart cleanly rather than keep a corrupt file.

---

## Limitations

- **iOS does not resume across a process death.** `resumeData` there is an opaque `NSURLSession` blob
  that embeds the original request headers, including the Jellyfin token. Persisting it would persist
  a credential, so it is deliberately not persisted; a partial file with no live in-memory task is
  deleted and re-downloaded from 0. In-process pause/resume still works normally on iOS.
- **Resume depends on the source supporting HTTP Range.** Jellyfin does for direct file downloads; a
  transcoded stream may not. When it does not, the transfer restarts from 0 exactly once and a
  concatenated/corrupt file can never be produced or reported as complete.
- **Unknown content length.** Some Jellyfin transcode responses omit `Content-Length`; in that case the
  size cross-check is skipped (there is nothing to compare against) and completion relies on the
  transfer finishing without error.
- **Wi-Fi-only.** If the Wi-Fi-only preference is on and the device is not on Wi-Fi, restored downloads
  stay queued rather than failing; they start once Wi-Fi returns and the queue is processed.
- **Total transfer duration is not resumed "mid-flight" for transcoded streams**, because the server
  regenerates the output; the offset is only meaningful for stable, range-capable sources.

## Tests

`src/features/offline/__tests__/downloadManagerResume.test.ts` covers the twelve required scenarios:
normal restore+resume, token never persisted, missing session, missing partial file, paused stays
paused, concurrency cap with restored queue order, account change, server change, 401 bounded retry,
Range-ignored corruption, already-complete file, and a genuine two-manager restart.

The shared `expo-file-system` mock (`__mocks__/expo-file-system.js`) exposes `__setFileSize`,
`__removeFile`, `__getDownloadTasks`, `__clearDownloadTasks` and `__completeTask(fileUri, { status })`
so tests can drive real resume behaviour rather than assert on internals.
