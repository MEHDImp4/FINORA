---
phase: 5
slug: media-details
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-11
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest with TypeScript & react-test-renderer |
| **Config file** | `jest.config.js` |
| **Quick run command** | `npm test -- features/details` |
| **Full suite command** | `npm run typecheck && npm test` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- features/details`
- **After every plan wave:** Run `npm run typecheck && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | DET-01 | — | Repository & hooks support enriched item details, cast/crew, and specs | unit | `npx jest --testPathPattern=mediaRepository.test.ts` | ✅ | ⬜ pending |
| 05-01-02 | 01 | 1 | DET-01, DET-03 | — | MovieDetailsView renders backdrop, logo, synopsis, specs, cast, and actions | unit/render | `npx jest --testPathPattern=MovieDetails.test.tsx` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | DET-02 | — | Repository & hooks support fetching series seasons and episode lists | unit | `npx jest --testPathPattern=seriesQueries.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 2 | DET-02, DET-03 | — | SeriesDetailsView renders season switcher, episode cards with progress, and Play Next | unit/render | `npx jest --testPathPattern=SeriesDetails.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Extend `src/types/media.ts` with `Person` and `MediaStreamInfo`
- [ ] Test stubs:
  - `src/features/details/__tests__/MovieDetails.test.tsx`
  - `src/features/details/__tests__/SeriesDetails.test.tsx`

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-11
