---
task: ci-github-actions
date: 2026-09-14
status: complete
---

# Summary: ci-github-actions

Created `.github/workflows/ci.yml`:
- Triggers on push and PR to master/main
- Runs: npm ci → npm run typecheck → npm test --ci --no-coverage --forceExit
- Node 22, npm cache, 15-min timeout, concurrency cancel-in-progress

Committed as: ci(github): add CI workflow enforcing typecheck and tests
