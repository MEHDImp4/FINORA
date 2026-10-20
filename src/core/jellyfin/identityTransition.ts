import {
  ACTIVE_SESSION_STORAGE_KEY,
  ActiveSessionDescriptor,
  AuthSession,
  getAuthTokenStorageKey
} from "./authRepository";
import { jellyfinClient } from "./jellyfinClient";
import { normalizeServerUrlForCredentials } from "./serverDiscovery";
import { secureTokenStorage, userPreferencesStorage } from "../security/storage";

/**
 * Identity transitions mutate shared singletons (Jellyfin client, persisted
 * active session, downloads and notification scopes). Serialize those changes so
 * two rapid profile/server actions can never interleave credentials.
 */
let transitionTail: Promise<void> = Promise.resolve();

export function runIdentityTransition<T>(operation: () => Promise<T>): Promise<T> {
  const run = transitionTail.then(operation, operation);
  transitionTail = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

/**
 * Restores a previously active identity after a failed transition.
 *
 * The previous in-memory session contains the exact server/user/token tuple that
 * was active before the transition began. Re-persist the stable canonical route
 * while restoring the effective runtime transport and credentials together.
 */
export async function restoreActiveIdentity(session: AuthSession): Promise<AuthSession> {
  const activeServerUrl = normalizeServerUrlForCredentials(session.serverUrl).url;
  const canonicalServerUrl = normalizeServerUrlForCredentials(
    session.canonicalServerUrl || session.serverUrl
  ).url;
  const restored: AuthSession = {
    ...session,
    serverUrl: activeServerUrl,
    canonicalServerUrl
  };
  const tokenKey = getAuthTokenStorageKey(restored.serverId, restored.userId);

  // Persist first. If storage fails, do not mutate the network singleton.
  await secureTokenStorage.setToken(tokenKey, restored.token);

  const descriptor: ActiveSessionDescriptor = {
    userId: restored.userId,
    userName: restored.userName,
    serverId: restored.serverId,
    serverUrl: canonicalServerUrl,
    lastActiveAt: Date.now()
  };
  await userPreferencesStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, descriptor);

  jellyfinClient.setServerUrl(activeServerUrl);
  jellyfinClient.setAuthToken(restored.token);

  return restored;
}

/**
 * Fail closed when an identity rollback cannot be completed. Saved account
 * tokens remain available for a later explicit sign-in, but no active descriptor
 * or runtime credential is allowed to survive in an ambiguous state.
 */
export async function clearActiveIdentity(): Promise<void> {
  await userPreferencesStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY).catch(() => {});
  jellyfinClient.setAuthToken(null);
}
