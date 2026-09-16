# FINORA — GitHub Security & Automation Setup Guide

This document outlines the recommended security features to enable in GitHub repository settings once the project is published or configured for community contributions.

---

## 🔒 1. Private Vulnerability Reporting
Allows security researchers to report vulnerabilities directly and privately without creating public issues.

### Activation Steps:
1. Navigate to **Settings** > **Code security & analysis**.
2. Scroll to **Private vulnerability reporting**.
3. Click **Enable**.
4. Researchers will see a confidential **"Report a vulnerability"** button under the **Security** tab.

---

## 🛡️ 2. Secret Scanning & Push Protection
Prevents accidental leakage of tokens, API keys, and server passwords into commits.

### Activation Steps:
1. Go to **Settings** > **Code security & analysis**.
2. Under **Secret scanning**, click **Enable**.
3. Under **Push protection**, check **Enable**.
4. Commits containing detected secrets will be rejected client-side before reaching the repository.

---

## 📦 3. Dependabot Alerts & Security Updates
Automates vulnerability scanning for npm packages and GitHub Actions.

### Activation Steps:
1. Go to **Settings** > **Code security & analysis**.
2. Under **Dependabot alerts**, click **Enable**.
3. Under **Dependabot security updates**, click **Enable**.
4. FINORA's [`.github/dependabot.yml`](dependabot.yml) will automatically propose security and regular dependency updates weekly.

---

## 🔍 4. CodeQL Code Scanning (SAST)
Runs automated semantic code analysis for security vulnerabilities on pull requests.

### Activation Steps:
1. Go to **Settings** > **Code security & analysis**.
2. Under **Code scanning**, click **Set up** > **Default configuration** (or **Advanced**).
3. CodeQL will automatically scan TypeScript code on pushes to `master` and on PRs.

---

## ⚙️ 5. Branch Rulesets
Ensure branch protection is active on `master`. See [`.github/BRANCH_PROTECTION.md`](BRANCH_PROTECTION.md) for current active rules and manual verification steps.
