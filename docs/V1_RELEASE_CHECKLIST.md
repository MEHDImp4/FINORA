# FINORA — V1.0.0 Release Verification Checklist

This checklist documents the mandatory end-to-end manual and automated verification procedures required prior to deploying a production release of FINORA (v1.0.0).

---

## 1. Automated Verification Gates (Pre-Release)

These gates run in CI (`.github/workflows/ci.yml`) and again, before any release build,
in the mandatory `quality` job of `.github/workflows/build-apk.yml`. No APK is built
unless `quality` passes.

- [ ] **Install (reproducible)**
  - `npm ci`
- [ ] **Strict Type-Checking**
  - `npm run typecheck` — must exit 0.
- [ ] **Version Consistency**
  - `npm run version:check` — `app.json` must match `package.json` (`version`, `android.versionCode`, `ios.buildNumber`).
- [ ] **i18n Parity**
  - `npm run i18n:check` — EN/FR keys and placeholders must match.
- [ ] **Full Automated Test Suite**
  - `npm test -- --ci --no-coverage --passWithNoTests --forceExit --maxWorkers=2`
- [ ] **Expo Doctor (advisory)**
  - `npx expo-doctor` — known SDK patch-version mismatches are tracked separately and do **not** block a release. All other checks must pass.
- [ ] **Production Dependency Audit**
  - `npm audit --omit=dev --audit-level=high` — 0 high or critical vulnerabilities.

---

## 2. Authentication & Server Discovery (Real Device)

- [ ] **HTTPS Auto-Detection & TLS Validation**
  - Enter server hostname without scheme (e.g. `jellyfin.example.com`).
  - Verify client attempts HTTPS by default.
  - Verify TLS certificate chain validation blocks invalid / self-signed certificates unless explicitly approved.
- [ ] **Cleartext HTTP Warning**
  - Connect to a local HTTP server (`http://192.168.x.x:8096`).
  - Verify the non-secure connection banner/warning displays before login.
- [ ] **Credential Security & Hardware Keystore**
  - Authenticate with valid username and password.
  - Verify access token is stored exclusively in hardware keystore (`expo-secure-store`).
  - Inspect device memory / logs: verify password is wiped immediately post-auth and never logged (`Authorization: [REDACTED]`).
- [ ] **Invalid Credentials**
  - Attempt login with incorrect password.
  - Verify user-friendly error message, no app crash, and no token persisted.
- [ ] **Multi-Server Switching**
  - Switch between two distinct Jellyfin servers.
  - Verify active tokens and server sessions isolate cleanly without cross-contamination.

---

## 3. Video Player Engine (`expo-video`)

- [ ] **Direct Play vs. Transcoding**
  - Play supported H.264/AAC media: verify Direct Play negotiation.
  - Play high-bitrate / incompatible media: verify server transcode streams reliably.
- [ ] **Scrubbing & Seek Performance**
  - Drag timeline scrubber rapidly back and forth.
  - Verify 60/120 FPS UI responsiveness and immediate audio/video resynchronization within 200–400ms.
- [ ] **Jellyfin Progress Reporting**
  - Start playback, watch 2 minutes, and pause.
  - Verify Jellyfin server dashboard shows live session and updates playback progress ticks.
  - Resume from another device or app reload: verify resume dialog / start position matches exact timestamp.
- [ ] **Subtitles & Audio Tracks**
  - Switch subtitle tracks (SRT, VTT, embedded ASS/SSA).
  - Verify subtitle synchronization matches spoken dialogue.
  - Switch audio languages / multi-channel streams and verify seamless switch.
- [ ] **Picture-in-Picture (PiP) & Background Audio**
  - Put app into background while media plays.
  - Verify Picture-in-Picture window activates smoothly without audio stutter.
  - Lock device: verify audio continues if enabled in playback settings.

---

## 4. Offline Downloads Subsystem

- [ ] **Single Media Download**
  - Download a Movie and an Episode in Original and 1080p quality profiles.
  - Verify progress updates monotonically: `0% -> 100% -> finalizing -> completed`.
  - Verify downloaded media appears in the Downloads tab with proper poster, title, duration, and file size.
- [ ] **Queue Concurrency Cap**
  - Queue 4 media items simultaneously.
  - Verify maximum 3 concurrent active downloads, with remaining item held in `queued` status.
- [ ] **Network & Wi-Fi Enforcement**
  - Enable "Download on Wi-Fi Only" preference.
  - Disconnect Wi-Fi (cellular only): verify downloads pause or refuse start with clear message.
  - Reconnect Wi-Fi: verify transfers resume cleanly.
- [ ] **Pause, Manual Resume & Cancellation**
  - Pause an active download halfway. Verify native task halts.
  - Resume download: verify Android byte-range continuation (`Range: bytes=N-`) without restarting from zero.
  - Cancel download: verify disk file and active task are cleaned up immediately.
- [ ] **Process Termination & Cold Restart Recovery**
  - Force-close app (`kill -9`) mid-transfer.
  - Re-open app: verify interrupted items are safely requeued or reconciled against real file size on disk without infinite loading or corrupted files.
- [ ] **Airplane Mode (Full Offline Loop)**
  - Put device in Airplane Mode.
  - Launch FINORA -> open Downloads tab -> select offline item -> tap Play.
  - Verify instant local playback without network timeouts or blank screens.
- [ ] **Offline Deletion & Storage Reclaim**
  - Delete an offline download.
  - Verify file is unlinked from storage (`finora_downloads/`) and space is freed.

---

## 5. Privacy, Multi-Account & Multi-Tenant Isolation

- [ ] **Search History Isolation**
  - Log in as User A (`Server1`): search for `"Inception"`, `"Oppenheimer"`.
  - Log out and log in as User B (`Server1` or `Server2`).
  - Open Search tab: verify search history is completely empty.
  - Search for `"Matrix"`. Switch back to User A: verify User A's history shows only `"Inception"`, `"Oppenheimer"`.
- [ ] **Download Queue Isolation**
  - Ensure items queued by User A on Server 1 fail closed or remain invisible when signed in as User B.

---

## 6. Performance & Stability Benchmarks

- [ ] **Cold Startup Time**
  - Measure cold launch on physical device: `< 1.8s` to interactive home screen.
- [ ] **Smooth Scrolling**
  - Scroll through 100+ item media libraries and Hero banner carousels.
  - Verify 60+ FPS (120 FPS on ProMotion / high-refresh displays) with zero frame drops or ANRs.
- [ ] **Memory Footprint & Leak Check**
  - Monitor memory consumption through Android Studio Profiler / Xcode Instruments.
  - Play video continuously for 30 minutes, scrubbing repeatedly.
  - Verify memory curve remains flat (< 250 MB average), with no unbounded texture or buffer leaks.

---

## 7. Production Release (Stable)

Stable releases are produced by `.github/workflows/build-apk.yml` from a tag matching
`vX.Y.Z`. The job is **fail-closed**: if any precondition is missing it fails instead of
publishing a degraded artifact.

- [ ] **Version bump**
  - Update `"version"` in `package.json` (X.Y.Z), then run `npm run version:sync` to align
    `app.json` (`expo.version`, `android.versionCode`, `ios.buildNumber`).
  - Commit both files together.
- [ ] **Tag**
  - `git tag vX.Y.Z && git push origin vX.Y.Z` — the tag version MUST equal the `package.json` version.
- [ ] **Signing secrets configured** (GitHub → Settings → Secrets and variables → Actions):
  - `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
  - If any is missing, the stable job fails before building.
- [ ] **Pipeline result**
  - `quality` → `build-release` → sign → `apksigner verify --print-certs` → publish.
  - Published release is `prerelease: false`, `make_latest: true`, and the APK carries the
    release keystore signature (never `CN=Android Debug`).
  - `/releases/latest` therefore always resolves to the newest stable.
- [ ] **Foreground & Background permissions**
  - Verify `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_DATA_SYNC` are present in the
    generated AndroidManifest.xml (`plugins/withBackgroundService.js`).

iOS is **not** built by CI yet (requires macOS/Xcode). iOS archives remain a manual step.
`UNVERIFIED — macOS/Xcode unavailable`.

---

## 8. GitHub Actions APK Builds (Preview, Beta, Stable)

`.github/workflows/build-apk.yml` runs a mandatory `quality` gate, then classifies the
event into exactly one channel. **At most one publication job is eligible per event.**

### Tag conventions
| Channel | Trigger | Tag example | prerelease | make_latest | Signing |
|---|---|---|---|---|---|
| Preview | manual dispatch, or tag `vX.Y.Z-preview-<sha>` | `v1.0.0-preview-a1b2c3d` | `true` | `false` | build/default |
| Beta | manual dispatch, or tag `vX.Y.Z-beta.N` | `v1.0.0-beta.1` | `true` | `false` | build/default |
| Stable | manual dispatch, or tag `vX.Y.Z` | `v1.0.0` | `false` | `true` | **release keystore (required)** |

Any other `v*` tag is rejected by the `classify` job (the workflow fails without building).

### Artifacts
| Channel | APK | Checksum |
|---|---|---|
| Preview | `FINORA-v<version>-preview-<sha>.apk` | `FINORA-v<version>-preview-<sha>.apk.sha256` |
| Beta | `FINORA-v<version>-beta.N.apk` | `FINORA-v<version>-beta.N.apk.sha256` |
| Stable | `FINORA-v<version>.apk` | `FINORA-v<version>.apk.sha256` |

### Signing secrets (stable only, all four required)
- `ANDROID_KEYSTORE_BASE64`: Base64 of the keystore (`base64 -w 0 release.keystore`).
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

A missing secret fails the stable job. The signed APK is verified with
`apksigner verify --verbose --print-certs`; an invalid signature or the Android debug
certificate (`CN=Android Debug`) fails the job before publishing.

### Manual runs
Actions → **Build Android APKs** → *Run workflow* → choose `preview`, `beta` or `release`.
A manual run produces exactly one channel; `release` additionally requires the signing
secrets above.

---

## 9. GitHub Master Branch Protection Configuration

To guarantee code quality and prevent accidental breaking changes to FINORA v1.0.0+:

1. Navigate to **GitHub Repository Settings** -> **Branches**.
2. Click **Add branch protection rule** (or edit rule for `master` / `main`).
3. Set **Branch name pattern**: `master`.
4. Configure the following rules:
   - [x] **Require a pull request before merging**
     - Require approvals: minimum 1 reviewer.
     - Dismiss stale pull request approvals when new commits are pushed.
     - Require review from Code Owners (optional).
   - [x] **Require status checks to pass before merging**
     - Require branches to be up to date before merging.
     - Select status check: `Type check, Tests & Security` (the GitHub Actions CI workflow).
   - [x] **Require conversation resolution before merging**
   - [x] **Require linear history** (enforces clean rebase/squash commits).
   - [x] **Do not allow bypassing the above settings** (enforce for administrators).

---

## 10. Release Versioning (Single Source of Truth)

`package.json` `"version"` is the source of truth (base SemVer `X.Y.Z`). `scripts/version.js`
derives the rest deterministically:

```text
package.json version = 1.0.0
        │
        ├── app.json  expo.version          = 1.0.0
        ├── app.json  android.versionCode   = 1000000   (= major*1_000_000 + minor*1_000 + patch)
        ├── app.json  ios.buildNumber       = "1000000"
        ├── git tag                         = v1.0.0
        ├── APK                             = FINORA-v1.0.0.apk
        └── GitHub Release                  = FINORA v1.0.0
```

Commands:
- `npm run version:sync` — recompute and write `app.json` from `package.json` (after a bump).
- `npm run version:check` — verify `app.json` matches `package.json` (runs in CI and in the build quality gate).
- `node scripts/version.js --tag=v1.0.1` — validate a release tag format and its base version.

Rules:
- The `versionCode` is strictly increasing for increasing SemVer and is never a mutable counter.
- A stable tag that does not equal the `package.json` version fails the release (`v1.1.0` while the app is `1.0.0` → FAIL).
- Only these tag shapes are accepted: `vX.Y.Z`, `vX.Y.Z-beta.N`, `vX.Y.Z-preview-<sha>`.
