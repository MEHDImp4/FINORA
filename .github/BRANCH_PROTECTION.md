# FINORA — Branch Protection & Ruleset Policy

This document details the branch protection policy enforcing safety, quality, and stability on the `master` branch.

---

## 🛡️ Active Ruleset: `master-protection`

FINORA uses a **GitHub Repository Ruleset** applied to `refs/heads/master`.

### Status
- **Target**: `master` branch (`~DEFAULT_BRANCH`)
- **Enforcement**: Active

---

## 📋 Enforced Rules

| Rule | Setting | Purpose |
|---|---|---|
| **Restrict Deletions** | Enabled | Prevents accidental or unauthorized deletion of the `master` branch. |
| **Block Force Pushes** | Enabled (`non_fast_forward`) | Ensures Git history remains linear and append-only; forbids `--force` / `--force-with-lease`. |
| **Require Pull Request** | Enabled | Direct pushes from non-admin contributors are blocked; all changes must pass through a PR. |
| **Required Approvals** | 1 approval minimum | At least one maintainer review is required before merging. |
| **Dismiss Stale Approvals** | Enabled | New commits pushed to a PR automatically invalidate previous approvals. |
| **Resolve Conversation Threads** | Enabled | All review comments and discussions must be resolved before merging. |
| **Required Status Checks** | Strict (`strict_required_status_checks_policy: true`) | PR branch must be up to date with `master` and pass all automated CI pipelines. |
| **Bypass Permissions** | Repository Admin only | Only repository administrators may bypass restrictions during emergency maintenance. |

---

## 🔍 Required Status Checks

The following automated GitHub Actions checks must pass with a green status before any merge:

1. **`Type check, Tests & Security`** (defined in `.github/workflows/ci.yml`)
   - `npm ci` (lockfile integrity)
   - `npm audit --omit=dev --audit-level=high` (dependency security)
   - `npm run typecheck` (strict TypeScript validation)
   - `npx expo-doctor` (Expo SDK health verification)
   - `npm test` (Jest automated unit and integration tests)

2. **`Validate PR Title (Conventional Commits)`** (defined in `.github/workflows/pr-lint.yml`)
   - Validates that the PR title conforms to Conventional Commits (`feat:`, `fix:`, `perf:`, etc.).

3. **`Validate PR Description & Checklist`** (defined in `.github/workflows/pr-lint.yml`)
   - Ensures the contributor provided an informative summary and marked applicable checklist items.

4. **`Check Lockfile Integrity`** (defined in `.github/workflows/pr-lint.yml`)
   - Verifies that `package-lock.json` is updated whenever `package.json` dependencies change.

---

## 🛠️ Manual Configuration Guide (via GitHub UI)

If configuring via GitHub Web Settings (*Settings > Rules > Rulesets*):

1. Navigate to **Settings** > **Rules** > **Rulesets**.
2. Click **New ruleset** > **New branch ruleset**.
3. Configure general settings:
   - **Ruleset Name**: `master-protection`
   - **Enforcement status**: `Active`
   - **Bypass list**: Add `Repository admin` (Mode: Always).
4. Under **Target branches**, select **Add target** > **Include default branch**.
5. Under **Branch rules**:
   - Check **Restrict deletions**
   - Check **Block force pushes**
   - Check **Require a pull request before merging**:
     - Required approvals: `1`
     - Check **Dismiss stale pull request approvals when new commits are pushed**
     - Check **Require conversation resolution before merging**
   - Check **Require status checks to pass**:
     - Check **Require branches to be up to date before merging**
     - Add status checks:
       - `Type check, Tests & Security`
       - `Validate PR Title (Conventional Commits)`
       - `Validate PR Description & Checklist`
       - `Check Lockfile Integrity`
6. Click **Save changes**.
