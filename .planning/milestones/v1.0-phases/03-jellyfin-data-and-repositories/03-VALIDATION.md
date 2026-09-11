---
phase: 3
slug: jellyfin-data-and-repositories
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-10
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest with TypeScript & ts-jest |
| **Config file** | `jest.config.js` |
| **Quick run command** | `npm test -- repositories` |
| **Full suite command** | `npm run typecheck && npm test` |
| **Estimated runtime** | ~6 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- repositories`
- **After every plan wave:** Run `npm run typecheck && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | DATA-01 | T-03-01 | DTO mapper sanitizes backend payloads into strict FINORA models | unit | `npm test -- src/core/repositories/__tests__/mediaMapper.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | DATA-01 | — | Repositories wrap Jellyfin endpoints with typed parameter queries | unit | `npm test -- src/core/repositories/__tests__/mediaRepository.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | DATA-03 | — | Image URL builder generates display-matched downscaled URLs with blurhash | unit | `npm test -- src/core/repositories/__tests__/imageUrlBuilder.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | DATA-02 | — | TanStack Query provider and query hooks with stale-while-revalidate | unit | `npm test -- src/hooks/__tests__/useMediaQueries.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 3 | DATA-04 | T-03-02 | Watch progress, resume ticks, and played state sync bidirectionally | unit | `npm test -- src/core/repositories/__tests__/userDataRepository.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 3 | DATA-04 | — | Favorite mutations optimistically update cache with rollback | unit | `npm test -- src/hooks/__tests__/useFavoriteMutation.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Install `@tanstack/react-query` and `expo-image`
- [ ] Test stubs:
  - `src/core/repositories/__tests__/mediaMapper.test.ts`
  - `src/core/repositories/__tests__/mediaRepository.test.ts`
  - `src/core/repositories/__tests__/imageUrlBuilder.test.ts`
  - `src/hooks/__tests__/useMediaQueries.test.ts`
  - `src/core/repositories/__tests__/userDataRepository.test.ts`
  - `src/hooks/__tests__/useFavoriteMutation.test.ts`

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-10
