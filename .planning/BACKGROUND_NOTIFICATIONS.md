# Background Notifications Architecture

**Status:** Phase 1 (Background Fetch) — Implemented  
**Phase 2 (Webhook + Expo Push)** — Documented, not yet implemented

---

## Current Implementation: Background Fetch (Foreground-limited)

### What it does
A `TaskManager` + `expo-background-fetch` task (`FINORA_BACKGROUND_CONTENT_CHECK`)
periodically checks Jellyfin for new media while the app is suspended.

| File | Role |
|---|---|
| `src/core/notifications/backgroundFetchTask.ts` | Task registration + helpers |
| `src/features/notifications/useNotificationSync.ts` | `syncNewMediaNotifications()` — reused by both foreground hook and BG task |
| `src/app/_layout.tsx` | Side-effect import + `registerBackgroundFetch()` call |

### Constraints
- **iOS**: The OS schedules the task opportunistically — the actual interval is rarely less than 30 minutes, and the app must have been used recently. Apple may defer or skip the task entirely.
- **Android**: More reliable, ~15 min minimum. Task survives app kill if `stopOnTerminate: false`.
- **Both**: FINORA must have been opened at least once after install. The task cannot be fired if the app was force-killed by the user on iOS.

### Data flow
```
OS wakes FINORA in background
  └─ TaskManager fires FINORA_BACKGROUND_CONTENT_CHECK
       └─ Reads useAuthStore.getState().session (userId)
            └─ syncNewMediaNotifications(userId)
                 ├─ Fetches recentlyAdded + resumeItems from Jellyfin
                 ├─ Compares with AsyncStorage knownIds set
                 └─ Dispatches local notifications for new Episodes/Movies/Series
```

---

## Phase 2 Architecture: Jellyfin Webhook → Expo Push Notifications

This enables **true real-time notifications** even when FINORA is completely closed.

### Overview

```
Jellyfin Server
  └─ Webhook Plugin (official)
       └─ POST https://finora-relay.example.com/webhook
            └─ FINORA Relay Service (lightweight Node.js)
                 ├─ Validates webhook signature
                 ├─ Looks up Expo Push Token for user
                 └─ POST https://exp.host/--/api/v2/push/send
                      └─ Expo Push Service
                           └─ APNs / FCM
                                └─ Device notification (app closed ✓)
```

### Components to build

#### 1. Jellyfin Webhook Plugin
- Install the official Jellyfin Webhook plugin from the plugin catalog
- Configure events: `ItemAdded`, `PlaybackStart`, `UserDataSaved`
- Target URL: your relay service endpoint

#### 2. FINORA Relay Service (Node.js / Bun)
```
POST /webhook
  Body: Jellyfin webhook payload
  Headers: X-Jellyfin-Token: <shared-secret>

1. Validate X-Jellyfin-Token against env.WEBHOOK_SECRET
2. Parse item type (Movie, Episode, Series)
3. Look up all registered Expo Push Tokens for this server
4. Call Expo Push API with notification payload
5. Return 200 OK
```

Minimal relay — no database needed for v1, just an env-var token store.

#### 3. FINORA client: Expo Push Token registration
```typescript
// On authentication success
import * as Notifications from 'expo-notifications';

const token = await Notifications.getExpoPushTokenAsync({
  projectId: Constants.expoConfig.extra.eas.projectId
});

// Register token with relay service (or store in Jellyfin user metadata)
await fetch('https://finora-relay.example.com/register', {
  method: 'POST',
  headers: { Authorization: `Bearer ${jellyfinToken}` },
  body: JSON.stringify({ expoPushToken: token.data, userId, serverUrl })
});
```

#### 4. Security considerations
- Webhook endpoint must validate the shared secret header
- Expo Push Tokens must be stored server-side, not on client
- Never include Jellyfin API tokens in push payloads (payload is logged by APNs/FCM)
- Relay service should be stateless and horizontally scalable

### Self-hosted relay (no cloud dependency)
For users who self-host everything, the relay can run as:
- A Docker container on the same machine as Jellyfin
- A Cloudflare Worker (free tier, <1ms latency)
- A Vercel Edge Function

### When to implement
Implement Phase 2 when:
1. FINORA has a stable user base that requests real-time notifications
2. An EAS project ID is configured (required for `getExpoPushTokenAsync`)
3. A deployment environment is available for the relay service

### Rollout plan
1. `feat(notifications): register Expo push token on auth` — store token securely
2. `feat(relay): deploy FINORA relay service` — webhook endpoint + push forwarding
3. `feat(notifications): configure Jellyfin webhook in onboarding/settings` — guide user to install plugin
4. `test(notifications): E2E webhook → push delivery test`
