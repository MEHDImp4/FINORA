---
phase: 2
slug: jellyfin-connection
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-10
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest with TypeScript & ts-jest |
| **Config file** | `jest.config.js` |
| **Quick run command** | `npm test -- core/jellyfin` |
| **Full suite command** | `npm run typecheck && npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- jellyfin`
- **After every plan wave:** Run `npm run typecheck && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | AUTH-01 | T-02-01 | URL validation, protocol detection, and HTTP security warning | unit | `npm test -- src/core/jellyfin/__tests__/serverDiscovery.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | AUTH-02 | T-02-02 | FINORA client headers and persistent installation UUID | unit | `npm test -- src/core/jellyfin/__tests__/clientIdentification.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | AUTH-02, AUTH-03 | T-02-03 | Password purged from memory, tokens strictly in SecureStore | unit | `npm test -- src/core/jellyfin/__tests__/authRepository.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | AUTH-03 | — | Session auto-restoration loads valid token and recovers state | unit | `npm test -- src/core/jellyfin/__tests__/authRepository.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 3 | AUTH-04, AUTH-05 | T-02-04 | Multi-server switching with zero credential leakage, clean logout | unit | `npm test -- src/core/jellyfin/__tests__/serverManager.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 3 | DIAG-01 | — | Diagnostics ping, TLS validation, API latency, and UI rendering | unit | `npm test -- src/core/jellyfin/__tests__/diagnostics.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Install `@jellyfin/sdk` and `expo-crypto`
- [ ] Test stubs:
  - `src/core/jellyfin/__tests__/serverDiscovery.test.ts`
  - `src/core/jellyfin/__tests__/clientIdentification.test.ts`
  - `src/core/jellyfin/__tests__/authRepository.test.ts`
  - `src/core/jellyfin/__tests__/serverManager.test.ts`
  - `src/core/jellyfin/__tests__/diagnostics.test.ts`

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-10
