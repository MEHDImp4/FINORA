---
task: readme-doc-sync
date: 2026-09-14
status: complete
---

# Summary: readme-doc-sync

Updated README.md:
- Test count: 57 suites / 302 tests → 71 suites / 393 tests (from live npm test run)
- Removed all Expo Go references; FINORA now officially targets development builds
- Getting Started: added EAS CLI prerequisite, replaced expo start + QR code scan
  with expo run:android / expo run:ios + eas build profile instructions
- Start command updated to: npx expo start --dev-client
- Tech stack: added expo-background-fetch + expo-task-manager row
- Testing section: mentions CI workflow and links to ci.yml

Committed as: docs(readme): fix test counts, drop Expo Go, document development build workflow
