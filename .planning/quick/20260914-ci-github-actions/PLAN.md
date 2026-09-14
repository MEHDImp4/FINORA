---
task: ci-github-actions
date: 2026-09-14
status: complete
---

# Quick Task: ci-github-actions

## Goal
Add a GitHub Actions CI workflow that enforces `npm ci`, `npm run typecheck`,
and `npm test` on every push and PR targeting master/main.

## Steps
1. Create `.github/workflows/ci.yml`
   - Trigger: push + PR to master/main
   - Job: ubuntu-latest, Node 22, npm cache
   - Steps: checkout → setup-node → npm ci → typecheck → test --ci
   - Concurrency group to cancel stale runs
2. Write PLAN.md (this file)
3. Commit: ci(github): add CI workflow enforcing typecheck and tests

## Not in scope
- Branch protection rules (must be configured in GitHub UI)
- Coverage thresholds (future improvement)
- EAS Build workflow (separate concern)
