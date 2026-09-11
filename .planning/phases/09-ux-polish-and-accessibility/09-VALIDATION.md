---
phase: 9
slug: ux-polish-and-accessibility
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-11
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest with TypeScript & react-test-renderer |
| **Config file** | `jest.config.js` |
| **Quick run command** | `npm test -- screenStates` |
| **Full suite command** | `npm run typecheck && npm test` |
| **Estimated runtime** | ~12 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- screenStates` or `npm test -- haptics`
- **After every plan wave:** Run `npm run typecheck && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 12 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | UX-01 | — | ShimmerSkeleton, MediaCardSkeleton, and EmptyStateView components | unit/render | `npx jest --testPathPattern=screenStates.test.tsx` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | UX-01 | — | ErrorStateView with retry and OfflineBanner network disconnection alert | unit/render | `npx jest --testPathPattern=ErrorStateView.test.tsx` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 2 | UX-02 | — | HapticService with graceful fallbacks and toggle support | unit | `npx jest --testPathPattern=HapticService.test.ts` | ❌ W0 | ⬜ pending |
| 09-02-02 | 02 | 2 | UX-02 | — | Accessibility labels, hints, roles, and reduced-motion fallbacks | unit/render | `npx jest --testPathPattern=Accessibility.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs:
  - `src/design-system/components/__tests__/screenStates.test.tsx`
  - `src/design-system/components/__tests__/ErrorStateView.test.tsx`
  - `src/core/feedback/__tests__/HapticService.test.ts`
  - `src/design-system/__tests__/Accessibility.test.tsx`

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 12s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-11
