---
phase: 6
slug: player-foundation
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-11
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest with TypeScript & react-test-renderer |
| **Config file** | `jest.config.js` |
| **Quick run command** | `npm test -- player` |
| **Full suite command** | `npm run typecheck && npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- player`
- **After every plan wave:** Run `npm run typecheck && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | PLAY-01 | — | expo-video installed and Jest mock in place | config/mock | `npm test -- FinoraPlayerEngine.test.ts` | ✅ | ✅ green |
| 06-01-02 | 01 | 1 | PLAY-01 | — | FinoraPlayerEngine state machine, controls, and useFinoraPlayer hook | unit | `npx jest --testPathPattern=FinoraPlayerEngine.test.ts` | ✅ | ✅ green |
| 06-02-01 | 02 | 2 | PLAY-02 | — | DeviceProfile capabilities and PlaybackPlanner negotiation logic | unit | `npx jest --testPathPattern=playbackPlanner.test.ts` | ✅ | ✅ green |
| 06-02-02 | 02 | 2 | PLAY-02 | THREAT-01 | Token sanitized in all stream URLs and logs | unit/security | `npx jest --testPathPattern=playbackPlanner.test.ts` | ✅ | ✅ green |
| 06-03-01 | 03 | 3 | PLAY-03 | — | PlaybackRepository reports start, throttled progress, and stopped to Jellyfin | unit | `npx jest --testPathPattern=playbackRepository.test.ts` | ✅ | ✅ green |
| 06-03-02 | 03 | 3 | PLAY-03, PLAY-04 | — | PlayerScreen and lifecycle/orientation resilience preserve state across transitions | unit/render | `npx jest --testPathPattern=PlayerScreen.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Install `expo-video` package compatible with Expo SDK 52
- [x] Create `__mocks__/expo-video.js` with mock `useVideoPlayer` and `VideoView`
- [x] Test stubs:
  - `src/features/player/__tests__/FinoraPlayerEngine.test.ts`
  - `src/features/player/__tests__/playbackPlanner.test.ts`
  - `src/core/repositories/__tests__/playbackRepository.test.ts`
  - `src/features/player/__tests__/PlayerScreen.test.tsx`

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-11
