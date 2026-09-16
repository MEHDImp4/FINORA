---
task: community-infrastructure
date: 2026-09-17
status: complete
---

# Summary: community-infrastructure

## Objectives Achieved
1. **Branch Protection & Ruleset for `master`**:
   - Deployed active GitHub Repository Ruleset `master-protection` on `refs/heads/master`.
   - Requires PR before merging with 1 approval, stale review dismissal, conversation resolution.
   - Enforces required status checks (`Type check, Tests & Security`, `Validate PR Title (Conventional Commits)`, `Validate PR Description & Checklist`, `Check Lockfile Integrity`).
   - Prevents deletion and force pushes (`non_fast_forward`).
   - Repository Admin bypass enabled.
   - Documented manual and automated policy in [`.github/BRANCH_PROTECTION.md`](../../.github/BRANCH_PROTECTION.md).

2. **CODEOWNERS Setup**:
   - Created [`.github/CODEOWNERS`](../../.github/CODEOWNERS) with `@MEHDImp4` as global owner and critical review requirements on `/src/features/player/`, `/src/core/security/`, `/.github/`, `package.json`, and `package-lock.json`.

3. **Curated GitHub Labels Strategy**:
   - Created and configured 29 standardized labels across categories: Type (`bug`, `feature`, `documentation`, `refactor`, `performance`, `security`, `dependencies`, `ci`), Area (`player`, `downloads`, `ui/ux`, `library`, `search`, `authentication`, `networking`, `android`, `ios`), Triage (`needs triage`, `needs info`, `needs reproduction`, `duplicate`, `invalid`, `wontfix`), Community (`good first issue`, `help wanted`), and Priority (`priority: critical`, `priority: high`, `priority: normal`, `priority: low`).

4. **Synchronized PR Auto-Labeling**:
   - Updated [`.github/labeler.yml`](../../.github/labeler.yml) with exact codebase paths (`src/features/offline/**`, `src/app/**`, `src/features/onboarding/**`, `src/core/security/**`).

5. **Hardened & Polite Bot Workflows**:
   - Fixed actions in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) (`actions/checkout@v4`, `actions/setup-node@v4`).
   - Configured polite stale bot in [`.github/workflows/stale.yml`](../../.github/workflows/stale.yml) (60 days stale + 14 days close for issues; 30 days stale + 14 days close for PRs; exemptions for `security`, `priority: critical`, `priority: high`, `roadmap`).
   - Updated welcome bot in [`.github/workflows/welcome-bot.yml`](../../.github/workflows/welcome-bot.yml) with explicit security reminder against posting credentials.
   - Enhanced Dependabot in [`.github/dependabot.yml`](../../.github/dependabot.yml) with weekly grouped dev-dependencies.

6. **Issue Forms & PR Template Quality**:
   - Updated Issue forms to automatically assign `needs triage` and specific area labels (`player`, `feature`, `bug`).
   - Enhanced PR template in [`.github/PULL_REQUEST_TEMPLATE.md`](../../.github/PULL_REQUEST_TEMPLATE.md) with standardized change categories, test environment checklist, and security confirmations.

7. **Discussions & Community Guides**:
   - Activated GitHub Discussions on repository (`has_discussions: true`).
   - Re-introduced Discussions links into README headers and community sections.
   - Created [`SUPPORT.md`](../../SUPPORT.md) routing users to Discussions, Issue Forms, Security Policy, or Contributing Guide.
   - Created [`.github/MODERATION.md`](../../.github/MODERATION.md) providing clear guidelines for maintainers.
   - Created [`.github/MAINTAINERS.md`](../../.github/MAINTAINERS.md) documenting core maintainer roles and onboarding paths.
   - Created [`.github/SECURITY_SETUP.md`](../../.github/SECURITY_SETUP.md) detailing steps for Private Vulnerability Reporting, Secret Scanning, and CodeQL.
