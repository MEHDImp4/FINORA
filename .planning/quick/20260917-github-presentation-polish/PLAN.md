---
task: github-presentation-polish
date: 2026-09-17
status: in-progress
---

# Quick Task: github-presentation-polish

## Goal
Professionalize FINORA's GitHub presentation and documentation to match a mature, high-quality open-source project without modifying application code or making unverifiable technical claims.

## Key Changes
1. **Header Modernization**:
   - Retain brand identity "FINORA — Watch your way" and official logo.
   - Clean, concise description upfront.
   - Curated, essential badges only (Latest Release, CI, GPL-3.0, Expo SDK 57, React Native 0.86, TypeScript Strict, Jellyfin Compatible).
   - High-visibility action links (Download Latest APK, Quickstart, Contributing, Security, French language toggle).
   - Remove dead GitHub Discussions links.
2. **Prominent Screenshots Section (`## 📱 FINORA in Action`)**:
   - Place immediately after the overview.
   - Since no screenshot assets are currently committed in repo, provide an aesthetic, GitHub-compatible layout structure with clear HTML instructions for adding 9:16 screenshots (Home, Details, Player, Search, Downloads).
3. **Tone Down Marketing Claims**:
   - Replace exaggerated phrasing ("60-120 FPS render loops with zero JS serialization bottlenecks", "sub-second startup", absolute claims) with technically sound, professional language (Fabric, Hermes, JSI, hardware-backed where supported).
4. **Fast, Clear Introduction**:
   - Answer What is FINORA?, Why FINORA?, What does it run on? within seconds.
5. **Key Highlights**:
   - Scannable bullet points for top features upfront, detailed technical breakdown below.
6. **Download & Installation Visibility**:
   - Prominent Android APK download callout immediately following highlights.
7. **Accurate Architecture & Code Reality**:
   - Fix folder tree and ASCII diagram: Expo Router is in `src/app/`, not root `app/`.
   - Update test suite metrics: 79 passed test suites, 489 passed tests.
   - Fix scripts in docs: remove stale references.
8. **Bilingual Parity**:
   - Mirror all enhancements in `README.fr.md` with natural French phrasing.
9. **Link Sanitization**:
   - Remove dead Discussions links in READMEs and `.github/ISSUE_TEMPLATE/config.yml`.
