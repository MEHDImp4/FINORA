---
phase: 7
slug: premium-player-experience
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-11
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest with TypeScript & react-test-renderer |
| **Config file** | `jest.config.js` |
| **Quick run command** | `npm test -- features/player` |
| **Full suite command** | `npm run typecheck && npm test` |
| **Estimated runtime** | ~12 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- features/player`
- **After every plan wave:** Run `npm run typecheck && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 12 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | PPL-01 | — | Auto-fading cinematic overlay and interactive timeline scrubber with buffer progress | unit/render | `npx jest --testPathPattern=TimelineScrubber.test.tsx` | ✅ | ✅ green |
| 07-01-02 | 01 | 1 | PPL-02 | — | Track selection bottom sheet with audio tracks, subtitles, and quality switching | unit/render | `npx jest --testPathPattern=TrackSelectionModal.test.tsx` | ✅ | ✅ green |
| 07-02-01 | 02 | 2 | PPL-03 | — | Player touch gestures (double-tap seek +/-10s, vertical volume swipes, 2x speed long-press) | unit/render | `npx jest --testPathPattern=PlayerGestures.test.tsx` | ✅ | ✅ green |
| 07-02-02 | 02 | 2 | PPL-04 | — | Trickplay preview thumbnail card positioning and timestamp display during scrubbing | unit/render | `npx jest --testPathPattern=TrickplayPreview.test.tsx` | ✅ | ✅ green |
| 07-03-01 | 03 | 3 | PPL-05 | — | Skip Intro and Skip Credits marker buttons appear at timestamp windows and seek correctly | unit/render | `npx jest --testPathPattern=SkipMarkerButton.test.tsx` | ✅ | ✅ green |
| 07-03-02 | 03 | 3 | PPL-06 | THREAT-01 | Stats for Nerds technical diagnostic overlay displays streams with tokens redacted | unit/security | `npx jest --testPathPattern=StatsForNerds.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Extend `src/types/media.ts` with `index`, `language`, `isExternal` on `MediaStreamInfo`, and chapter markers
- [x] Test stubs:
  - `src/features/player/__tests__/TimelineScrubber.test.tsx`
  - `src/features/player/__tests__/TrackSelectionModal.test.tsx`
  - `src/features/player/__tests__/PlayerGestures.test.tsx`
  - `src/features/player/__tests__/TrickplayPreview.test.tsx`
  - `src/features/player/__tests__/SkipMarkerButton.test.tsx`
  - `src/features/player/__tests__/StatsForNerds.test.tsx`

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 12s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-11
