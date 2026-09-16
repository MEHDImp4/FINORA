# FINORA — V1.0.0 Release Verification Checklist

This checklist documents the mandatory end-to-end manual and automated verification procedures required prior to deploying a production release of FINORA (v1.0.0).

---

## 1. Automated Verification Gates (Pre-Release)

- [ ] **Dependency Alignment (`expo-doctor`)**
  - Run `npx expo-doctor`
  - Ensure 21/21 checks pass with 0 errors.
- [ ] **Strict Type-Checking**
  - Run `npm run typecheck`
  - Ensure TypeScript compiler exits with code 0 (`tsc --noEmit`).
- [ ] **Full Automated Test Suite**
  - Run `npm test -- --ci --no-coverage --passWithNoTests`
  - Ensure 77/77 test suites and all 478 tests pass without timeouts or `--forceExit`.
- [ ] **Production Dependency Audit**
  - Run `npm audit --omit=dev --audit-level=high`
  - Verify 0 high or critical vulnerabilities. Document known build-tool advisories.

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

## 7. Production Release Build & Store Submission

- [ ] **Android App Bundle (AAB)**
  - Build command: `eas build --platform android --profile production`
  - Verify signing keystore configured in EAS credentials.
  - Verify target SDK and minimum SDK versions meet Google Play requirements.
- [ ] **iOS Archive (IPA)**
  - Build command: `eas build --platform ios --profile production`
  - Verify distribution certificate and provisioning profile in Apple Developer Portal.
- [ ] **Foreground & Background Permissions**
  - Verify `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_DATA_SYNC` permissions declared in AndroidManifest.xml.
  - Verify background fetch capability declared in iOS Info.plist.

---

## 8. GitHub Master Branch Protection Configuration

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
