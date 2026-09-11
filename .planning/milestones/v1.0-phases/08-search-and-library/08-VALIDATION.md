---
phase: 8
slug: search-and-library
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-11
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest with TypeScript & react-test-renderer |
| **Config file** | `jest.config.js` |
| **Quick run command** | `npm test -- search` |
| **Full suite command** | `npm run typecheck && npm test` |
| **Estimated runtime** | ~12 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- search` or `npm test -- library`
- **After every plan wave:** Run `npm run typecheck && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 12 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | SRCH-01 | — | MediaRepository search query with term, item types, and searchHistory service | unit | `npx jest --testPathPattern=searchHistory.test.ts` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | SRCH-01 | — | SearchScreen with debounced search input, category chips, history list, and results grid | unit/render | `npx jest --testPathPattern=SearchScreen.test.tsx` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 2 | SRCH-02 | — | MediaRepository genre queries and SortOptionsModal | unit | `npx jest --testPathPattern=SortOptionsModal.test.tsx` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 2 | SRCH-02 | — | LibraryScreen with virtualized 3-column grid, genre filter pills, and sorting | unit/render | `npx jest --testPathPattern=LibraryScreen.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs:
  - `src/features/search/__tests__/searchHistory.test.ts`
  - `src/features/search/__tests__/SearchScreen.test.tsx`
  - `src/features/library/__tests__/SortOptionsModal.test.tsx`
  - `src/features/library/__tests__/LibraryScreen.test.tsx`

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 12s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-11
