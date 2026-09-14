import { authRepository } from "../../core/jellyfin/authRepository";

/**
 * Non-sensitive identity of the Jellyfin context a download belongs to.
 * Persisted alongside each download so a download is never resumed with
 * another account's or another server's credentials.
 */
export interface DownloadIdentity {
  serverId: string;
  userId: string;
  serverUrl: string;
}

/**
 * A usable Jellyfin session for download requests.
 * The access token is only ever held in memory — it is never persisted.
 */
export interface DownloadAuthContext extends DownloadIdentity {
  accessToken: string;
}

/**
 * Normalizes a Jellyfin server URL for comparison (trailing slashes removed).
 */
export function normalizeServerUrl(url: string): string {
  return (url || "").replace(/\/+$/, "");
}

/**
 * Resolves a fresh Jellyfin session for downloads.
 *
 * Deliberately does NOT read `useAuthStore` — after a real process death the
 * Zustand store is empty until React has booted. The token is read back from
 * SecureStore through the auth repository instead.
 *
 * Returns null when no usable session exists.
 */
export async function getDownloadAuthContext(): Promise<DownloadAuthContext | null> {
  try {
    const session = await authRepository.restoreSession();
    if (!session?.token || !session.userId || !session.serverId || !session.serverUrl) {
      return null;
    }
    return {
      serverId: session.serverId,
      userId: session.userId,
      serverUrl: normalizeServerUrl(session.serverUrl),
      accessToken: session.token
    };
  } catch {
    return null;
  }
}

/**
 * True when a persisted download belongs to the currently authenticated
 * server AND user. URLs are normalized before comparison.
 */
export function matchesDownloadIdentity(
  stored: Partial<DownloadIdentity>,
  current: DownloadIdentity
): boolean {
  if (!stored.serverId || !stored.userId || !stored.serverUrl) return false;
  return (
    stored.serverId === current.serverId &&
    stored.userId === current.userId &&
    normalizeServerUrl(stored.serverUrl) === normalizeServerUrl(current.serverUrl)
  );
}
