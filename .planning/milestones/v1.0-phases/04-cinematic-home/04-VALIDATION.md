---
phase: 4
slug: cinematic-home
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-10
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest with TypeScript & react-test-renderer |
| **Config file** | `jest.config.js` |
| **Quick run command** | `npm test -- features/home` |
| **Full suite command** | `npm run typecheck && npm test` |
| **Estimated runtime** | ~6 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- features/home`
- **After every plan wave:** Run `npm run typecheck && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | HOME-01 | — | HeroBanner renders backdrop, logo/fallback, badges, and play/watchlist actions | unit/render | `npm test -- src/features/home/__tests__/HeroBanner.test.tsx` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | HOME-02 | — | MediaCard renders 2:3 poster and 16:9 thumbnail variants with progress bar | unit/render | `npm test -- src/features/home/__tests__/MediaCard.test.tsx` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 2 | HOME-02, HOME-03 | — | Home screen connects isolated virtualized carousels without re-render cascades | unit/render | `npm test -- src/features/home/__tests__/HomeScreen.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Install `expo-linear-gradient`
- [ ] Test stubs:
  - `src/features/home/__tests__/HeroBanner.test.tsx`
  - `src/features/home/__tests__/MediaCard.test.tsx`
  - `src/features/home/__tests__/HomeScreen.test.tsx`

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-10
