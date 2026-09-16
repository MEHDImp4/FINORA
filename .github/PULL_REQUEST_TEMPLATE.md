## 📝 Description

Please provide a clear and concise summary of the changes made in this Pull Request, including the motivation and context.

Fixes #(issue) <!-- Replace with issue number, e.g. Fixes #42 -->

---

## 🏷️ Type of Change

Select all that apply:

- [ ] 🐛 **Bug fix** (non-breaking change which fixes an issue)
- [ ] ✨ **New feature** (non-breaking change which adds functionality)
- [ ] ⚡ **Performance improvement** (optimizations, reduced memory footprint, faster render loop)
- [ ] ♻️ **Refactoring** (code reorganization without functional changes)
- [ ] 💄 **UI / UX update** (visual design, animations, typography, themes)
- [ ] 📝 **Documentation** (README, comments, developer guides)
- [ ] 🧪 **Tests** (adding missing tests or improving existing test coverage)
- [ ] 🔧 **CI / Build tooling** (GitHub Actions, Gradle, Expo config)

---

## 📱 Platforms & Environments Tested

- [ ] Android Physical Device (Model: `________________`, Android Version: `____`)
- [ ] Android Emulator (API Level: `____`)
- [ ] iOS Physical Device (Model: `________________`, iOS Version: `____`)
- [ ] iOS Simulator (iOS Version: `____`)
- [ ] Jellyfin Server Version: `________________`

---

## 📸 Screenshots / Screen Recordings (if UI was touched)

| Before | After |
|---|---|
| *(paste screenshot)* | *(paste screenshot)* |

---

## ✅ Quality & Security Checklist

Before requesting a review, please ensure all boxes are checked:

- [ ] **Tests Pass**: `npm test` runs successfully with 0 errors.
- [ ] **Typecheck Passes**: `npm run typecheck` passes with 0 TypeScript strict errors.
- [ ] **Security**: No passwords, access tokens, API keys, or private server URLs are committed.
- [ ] **Secure Storage**: Tokens/credentials are stored strictly in `expo-secure-store`, never in `AsyncStorage` or plaintext.
- [ ] **Sanitized Logs**: Debug logs do not leak user passwords or unredacted tokens.
- [ ] **Conventional Commits**: Commits follow the conventional commit format (`feat:`, `fix:`, `perf:`, `refactor:`, etc.).
- [ ] **Code Style**: Code adheres to FINORA's coding conventions and architectural boundaries (Screen -> Hook -> Repository -> SDK).
