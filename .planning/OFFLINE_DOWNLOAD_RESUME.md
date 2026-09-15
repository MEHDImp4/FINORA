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

## Background downloads (Android Foreground Service)

Leaving the app must not stop a transfer. A Foreground Service keeps the process
alive and gives the user a live notification.

```
download starts
  └─ syncForegroundService()
       ├─ notification permission requested (Android 13+ POST_NOTIFICATIONS)
       └─ BackgroundService.start(keepAliveTask, { foregroundServiceType: ["dataSync"] })
            ↓
       Android keeps the process alive → expo-file-system keeps transferring
            ↓
       progress ticks refresh the notification (same 3 s / 1 % throttle as persistence)
            ↓
       no download left → BackgroundService.stop()
```

| File | Role |
|---|---|
| `src/core/notifications/foregroundDownloadService.ts` | Service start/stop/update, permission request, notification content |
| `plugins/withBackgroundService.js` | Expo config plugin: manifest permissions + `foregroundServiceType="dataSync"`, Gradle include/dependency, package registration in `MainApplication.kt` |
| `react-native.config.js` | Manual linking entry for the library |

**The library has no `react-native.config.js`, so autolinking does not pick it up.**
The config plugin therefore does all of it: `settings.gradle` include, `app/build.gradle`
dependency, `AndroidManifest.xml` permissions + service, and the
`BackgroundActionsPackage` registration in `MainApplication.kt`. The class is
`BackgroundActionsPackage` — **not** `RNBackgroundActionsPackage` (the service class
is `RNBackgroundActionsTask`; the two names differ).

### Why the notification permission matters

`POST_NOTIFICATIONS` was only ever requested from `settings.tsx`, so a fresh install
never asked for it. Without the permission Android drops the service notification
entirely, and OEMs (MIUI especially) are far more likely to kill a foreground service
that shows no notification — which is what silently stopped background downloads.
It is now requested once per session, at the moment the first download starts.

### Notification content

```
Obsession (1080P)
~42 % · 3,4 MB/s · 580 MB / ~1,4 GB · ~2 min
```

Tapping it opens the **Downloads** tab (`linkingURI: "finora://downloads"`, plus an
explicit `Linking` listener in `_layout.tsx` as a fallback).

---

## Sizes for transcoded downloads

Jellyfin sends **no `Content-Length`** for transcode responses — the final size is only
known once encoding finishes. Without a denominator the progress bar stayed at 0 % (and
the in-app card wrongly rendered a full bar).

`estimateTranscodedBytes(quality, totalTicks)` approximates it from the media duration
and the profile's target bitrate:

```
bytes ≈ (videoBitRate + 128 000 audio) / 8 × totalTicks / 10 000 000
```

| Case | Progress bar | Size line | Percentage |
|---|---|---|---|
| Real total known (`original`) | exact | `580 MB / 1.4 GB` | `42%` |
| Transcode, estimate available | approximate | `580 MB / ~1.4 GB` | `~42%` |
| Nothing knowable (no duration) | muted, no fill claim | `580 MB reçus` | `...` |

Guardrails:

- The estimate is **display only**. `totalBytes` stays the real value, and the
  completion integrity check uses it — an off estimate can never mark a download failed.
- Estimated values are always prefixed `~`.
- With neither a real nor an estimated total, the bar is indeterminate — never a fake 0 %
  or a fake 100 %.
- The estimate is persisted (`expectedBytes`) so a restored download keeps it.

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
- **Transcode sizes are estimates.** The percentage, transferred-total and ETA for a transcoded
  download are derived from duration × target bitrate. Real output varies with the encoder (VBR, scene
  complexity), so treat `~` values as indicative. Exact figures appear when the server does send a
  `Content-Length` (i.e. `original` quality).
- **A Foreground Service is not immortality.** It survives leaving the app and screen-off, but not a
  **force-stop** — Android kills everything, by design. On aggressive OEMs (MIUI/Xiaomi) the app should
  also be exempted from battery optimisation and have Autostart enabled, otherwise the service may still
  be reaped during a long transfer.

### OEM battery settings (Xiaomi/MIUI)

Verified on a Xiaomi device (`chagall`, Android 16): with the notification permission missing **and**
the app not battery-whitelisted, a background download stopped. After granting
`POST_NOTIFICATIONS` and adding the app to the device-idle whitelist, it kept running while
backgrounded and screen-off.

The permission is now requested by the app itself. The battery exemption still requires the user:

```
Paramètres → Applications → FINORA → Économiseur de batterie → Aucune restriction
Paramètres → Applications → FINORA → Démarrage automatique → activé
```

Check the current state with:

```bash
adb shell dumpsys deviceidle whitelist | grep finora   # empty = not whitelisted
```

## Tests

`src/features/offline/__tests__/downloadManagerResume.test.ts` covers the twelve required scenarios:
normal restore+resume, token never persisted, missing session, missing partial file, paused stays
paused, concurrency cap with restored queue order, account change, server change, 401 bounded retry,
Range-ignored corruption, already-complete file, and a genuine two-manager restart.

`downloadQuality.test.ts` covers `estimateTranscodedBytes` (magnitude, duration scaling, and the
`original`/unknown-duration cases that must return `undefined`).

`DownloadsScreen.test.tsx` asserts the progress card renders `553 MB / ~1.3 GB` and `~42%` for a
transcoded download whose `totalBytes` is 0.

The shared `expo-file-system` mock (`__mocks__/expo-file-system.js`) exposes `__setFileSize`,
`__removeFile`, `__getDownloadTasks`, `__clearDownloadTasks` and `__completeTask(fileUri, { status })`
so tests can drive real resume behaviour rather than assert on internals.
`react-native-background-actions` is mocked (`__mocks__/react-native-background-actions.js`) because
the library ships ESM that Jest cannot parse.
