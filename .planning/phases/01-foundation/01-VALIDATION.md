---
phase: 1
slug: foundation
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-10
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest with TypeScript & ts-jest |
| **Config file** | `jest.config.js` |
| **Quick run command** | `npm test -- core` |
| **Full suite command** | `npm run typecheck && npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- core`
- **After every plan wave:** Run `npm run typecheck && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | FOUND-01 | — | N/A | build | `npm run typecheck` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | FOUND-02 | — | N/A | structure | `node -e "assert(require('fs').existsSync('src/app/_layout.tsx'))"` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 2 | FOUND-03 | T-01-01 | Authorization/Tokens/Passwords redacted in all log levels | unit | `npm test -- src/core/network/__tests__/logger.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 2 | FOUND-03 | T-01-02 | Network timeouts and retry logic handle failures gracefully | unit | `npm test -- src/core/network/__tests__/httpClient.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | FOUND-04 | T-01-03 | Sensitive tokens stored only in SecureStore, never AsyncStorage | unit | `npm test -- src/core/security/__tests__/storage.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-02 | 03 | 3 | FOUND-05 | — | Immediate visual feedback (<50ms) on button interactions | unit/render | `npm test -- src/design-system/__tests__/primitives.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `package.json` with Jest, TypeScript, and testing setup
- [ ] `jest.config.js` configuring test runner
- [ ] `src/core/network/__tests__/logger.test.ts` — test stubs for sanitized logger
- [ ] `src/core/network/__tests__/httpClient.test.ts` — test stubs for HTTP client & error mapping
- [ ] `src/core/security/__tests__/storage.test.ts` — test stubs for secure storage adapter

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| High-refresh 120Hz render smoothness | FOUND-01 | Requires physical high-refresh Android display hardware | Run Expo development build on Android 120Hz phone, inspect FPS meter |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-10
