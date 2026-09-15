# FINORA 1.0 RC — Release Checklist

> Manual validation checklist for real Android/iOS devices before declaring FINORA 1.0 stable.  
> Perform full top-to-bottom on a **clean install** (fresh uninstall + install) and again on an **upgrade install**.

---

## Device Setup

| Item | Status |
|------|--------|
| Android target: physical device, minimum API 29 | ✅ |
| iOS target: physical device (iPhone), iOS 16+ | N/A (no iOS device) |
| Jellyfin server accessible on LAN (HTTP) and WAN (HTTPS) | ✅ |
| Build variant: **preview** APK (not debug) | ✅ |

---

## 1 — Installation & Boot

| # | Test | Expected | Status |
|---|------|----------|--------|
| 1.1 | Fresh install, launch app | Splash shows, disappears quickly (< 2s) without artificial delay, onboarding appears | ✅ |
| 1.2 | Onboarding — server field | Field is **empty** by default. Placeholder: `https://votre-serveur.com` | ✅ |

---

## 2 — Server Connection

| # | Test | Expected | Status |
|---|------|----------|--------|
| 2.1 | Enter HTTPS server URL → Tester | "Serveur en ligne : [Name]" success banner | ✅ |
| 2.2 | Enter HTTP LAN URL (`http://192.168.x.x:8096`) → Tester | Connects + HTTP warning banner visible | ✅ |
| 2.3 | Enter wrong URL (unreachable) → Tester | Clear error message, app does not crash | ✅ |
| 2.4 | Enter valid URL, wrong password → Se connecter | Error shown, not logged out, no crash | ✅ |
| 2.5 | Server diagnostics modal (Settings → Diagnostic) | Ping + TLS status + version shown for active session server | ✅ |

---

## 3 — Authentication & Session

| # | Test | Expected | Status |
|---|------|----------|--------|
| 3.1 | Login with valid credentials | App enters Home, no onboarding shown | ✅ |
| 3.2 | Kill app → relaunch | Session restored automatically, Home shown instantly | ✅ |
| 3.3 | Logout → relaunch | Onboarding shown, empty server field | ✅ |

---

## 4 — Home Screen

| # | Test | Expected | Status |
|---|------|----------|--------|
| 4.1 | Home loads | Hero banner, Continue Watching, Recently Added visible | ✅ |
| 4.2 | Scroll carousels fast | 60+ FPS, no dropped frames | ✅ |
| 4.3 | Tap poster | Details screen opens with < 50ms visual feedback | ✅ |

---

## 5 — Search & Library

| # | Test | Expected | Status |
|---|------|----------|--------|
| 5.1 | Search for a movie/show | Results appear with debounce | ✅ |
| 5.2 | Library → filter/sort | Content updates correctly | ✅ |

---

## 6 — Player — Playback

| # | Test | Expected | Status |
|---|------|----------|--------|
| 6.1 | Play movie (Direct Play) | Starts within 3s, no buffering loops | ✅ |
| 6.2 | Play movie (forced transcode) | Starts cleanly, transcoding indicator visible | ✅ (badge added) |
| 6.3 | Change quality during playback | Position preserved, audio/sub preserved, no return to 0:00 | ✅ |
| 6.4 | Change audio track | Switches cleanly, stays at current position | ✅ |
| 6.5 | Enable/disable subtitle | Subtitle appears/disappears without player restart | ✅ |
| 6.6 | Skip Intro button | Appears during intro, tapping jumps past it | ✅ |
| 6.7 | Pause / Resume | Immediate visual response, no position drift | ✅ |
| 6.8 | Playback speed setting (e.g. 1.25x) | Applied immediately when player opens | ✅ (added in-player button) |

---

## 7 — Player — Gestures

| # | Test | Expected | Status |
|---|------|----------|--------|
| 7.1 | Double tap left half | -10s seek, ripple indicator shown | ✅ (dead zone fix) |
| 7.2 | Double tap right half | +10s seek, ripple indicator shown | ✅ (dead zone fix) |
| 7.3 | Long press (500ms+) → hold | 2x speed badge visible, speed 2.0x active | ✅ |
| 7.4 | Release long press | Speed returns to configured preference (e.g. 1.25x), NOT forced 1.0x | ✅ |
| 7.5 | Swipe vertical right (up) | Volume HUD: "Volume XX%" increases | ✅ |
| 7.6 | Swipe vertical right (down) | Volume HUD: "Volume XX%" decreases | ✅ |
| 7.7 | Swipe vertical left (up) | Brightness HUD: "Luminosité XX%" — screen brightens | ✅ |
| 7.8 | Swipe vertical left (down) | Brightness HUD: "Luminosité XX%" — screen dims | ✅ |
| 7.9 | HUD auto-hides | Volume/Brightness HUD disappears after ~1.2s of no movement | ✅ |
| 7.10 | No gesture conflict | Swipe doesn't trigger double tap; timeline scrub doesn't conflict | ✅ |

---

## 8 — Player — PiP & Orientation

| # | Test | Expected | Status |
|---|------|----------|--------|
| 8.1 | Rotate device during playback | Player adapts, no restart | ✅ |
| 8.2 | Picture-in-Picture | PiP activates, mini player floats over home screen | ✅ (HyperOS: swipe up gesture) |

---

## 9 — Downloads

| # | Test | Expected | Status |
|---|------|----------|--------|
| 9.1 | Start download (Wi-Fi) | Progress bar visible, speed shown | ✅ |
| 9.2 | Wi-Fi Only enabled → switch to mobile data | Download blocked, clear error shown | ✅ |
| 9.3 | Pause download | Status shows paused | ✅ (button added) |
| 9.4 | **Kill FINORA** during active download at ~46% | — | ✅ |
| 9.5 | **Relaunch FINORA** | Download visible at ~46%, status "paused" (not fake "downloading") | ✅ |
| 9.6 | Resume restored download | Resumes from partial file, not from 0% | ✅ |
| 9.7 | Let download complete | Progress reaches 100%, notification fires | ✅ |
| 9.8 | Play offline download | Video plays from local file, no network needed | ✅ |
| 9.9 | Progress saved offline → reconnect | Watch position synced back to Jellyfin | ✅ |
| 9.10 | Delete download | File removed from storage, not visible in catalog | ✅ |
| 9.11 | Orphan file cleanup | `offlineStorageService.cleanupOrphanDiskFiles()` removes stale files | ✅ |

---

## 10 — Notifications

| # | Test | Expected | Status |
|---|------|----------|--------|
| 10.1 | New item added to Jellyfin library | Foreground notification fires on next sync | ⬜ (waiting) |
| 10.2 | Background notification | Notification arrives without app open (15min+ wait on iOS) | ✅ |
| 10.3 | Tap notification | App opens to media details screen | ✅ |
| 10.4 | Disable notifications in Settings | Background task unregistered, no more notifications | ✅ |
| 10.5 | Re-enable notifications | Task re-registered | ✅ |
| 10.6 | Logout | Background task unregistered | ✅ |

---

## 11 — Settings & Maintenance

| # | Test | Expected | Status |
|---|------|----------|--------|
| 11.1 | Clear cache (Settings) | Cache cleared, Home reloads fresh | ✅ |
| 11.2 | Change server in Settings | New server active, content updated | ✅ |
| 11.3 | Server Diagnostics (authenticated) | Ping, TLS, version, API health all shown for active server | ✅ |
| 11.4 | Server Diagnostics (not authenticated) | Button is inert — no request to any server | ✅ |

---

## 12 — Security Spot Checks

| # | Test | Expected | Status |
|---|------|----------|--------|
| 12.1 | HTTP LAN server → connection | "HTTP Non chiffré" warning visible in diagnostics | ✅ |
| 12.2 | Check logs (ADB logcat) | No tokens in any `FINORA` log line | ✅ |
| 12.3 | Check AsyncStorage dump | No tokens, no passwords stored in plaintext | ✅ |
| 12.4 | Invalid HTTPS certificate | Connection refused with error, not silently accepted | ✅ |

---

## Sign-Off

| Gate | Status |
|------|--------|
| `npm ci` → PASS | ⬜ |
| `npm run typecheck` → 0 errors | ⬜ |
| `npm test` → all suites pass | ⬜ |
| GitHub Actions → GREEN | ⬜ |
| Manual checklist above → all ✅ | ⬜ |

**FINORA 1.0 RC sign-off date:** ___________  
**Tested by:** ___________  
**Device(s):** ___________
