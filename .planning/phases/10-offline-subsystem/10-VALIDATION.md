---
phase: 10
slug: offline-subsystem
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-11
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest with TypeScript & react-test-renderer |
| **Config file** | `jest.config.js` |
| **Quick run command** | `npm test -- offline` |
| **Full suite command** | `npm run typecheck && npm test` |
| **Estimated runtime** | ~14 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- offline` or `npm test -- downloads`
- **After every plan wave:** Run `npm run typecheck && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 14 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | OFFL-01 | — | DownloadManager with queue, pause, resume, and cancellation | unit | `npx jest --testPathPattern=downloadManager.test.ts` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 2 | OFFL-02 | — | OfflineStorage & sync queue for progress recording | unit | `npx jest --testPathPattern=offlineStorage.test.ts` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 | 3 | OFFL-03 | — | OfflineSyncManager & DownloadsScreen with local playback | unit/render | `npx jest --testPathPattern=DownloadsScreen.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs:
  - `src/features/offline/__tests__/downloadManager.test.ts`
  - `src/features/offline/__tests__/offlineStorage.test.ts`
  - `src/features/offline/__tests__/DownloadsScreen.test.tsx`

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 14s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-11
