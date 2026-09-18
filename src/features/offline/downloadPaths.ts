/**
 * Download filesystem scoping.
 *
 * A download is always owned by a (serverId, userId, itemId) triple. Physical
 * files are namespaced per server and per user so the same Jellyfin `itemId`
 * can never map to the same file for two different accounts:
 *
 *   finora_downloads/{serverId}/{userId}/{itemId}.mp4
 *
 * Every identifier ultimately comes from the Jellyfin server, so it is
 * sanitized before being used as a path segment. Unsafe or unusually long
 * values are reduced to a safe prefix plus a stable hash, which keeps the path
 * deterministic, collision-resistant and free of traversal sequences.
 */

export interface DownloadScope {
  serverId: string;
  userId: string;
}

export const DOWNLOAD_ROOT_DIR = "finora_downloads";

/** Stable FNV-1a 32-bit hash, rendered as 8 lowercase hex chars. */
function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

const SAFE_SEGMENT = /^[A-Za-z0-9._-]{1,48}$/;

/**
 * Reduces an arbitrary identifier to a filesystem-safe path segment.
 * A value that is already safe and short is preserved verbatim; anything else
 * is sanitized and suffixed with a stable hash so distinct inputs cannot
 * collide after sanitization.
 */
export function sanitizePathSegment(value: string): string {
  const raw = value == null ? "" : String(value);
  if (SAFE_SEGMENT.test(raw) && !/^\.+$/.test(raw)) return raw;

  const safe = raw
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/\.{2,}/g, "_")
    .slice(0, 48)
    .replace(/^\.+/, "_");
  return `${safe || "_"}_${fnv1a(raw)}`;
}

/** Composite scope identity used for persistence keys. */
export function getDownloadScopeKey(scope: DownloadScope): string {
  return `${encodeURIComponent(scope.serverId)}:${encodeURIComponent(scope.userId)}`;
}

/**
 * Relative path (from the app document directory) for an item owned by the
 * given scope. `scope` must be provided for any authenticated download; the
 * unauthenticated fallback exists only for legacy/unscoped tasks.
 */
export function buildDownloadRelativePath(
  scope: DownloadScope | null,
  itemId: string
): string {
  const file = `${sanitizePathSegment(itemId)}.mp4`;
  if (!scope) {
    return `${DOWNLOAD_ROOT_DIR}/${file}`;
  }
  return `${DOWNLOAD_ROOT_DIR}/${sanitizePathSegment(scope.serverId)}/${sanitizePathSegment(
    scope.userId
  )}/${file}`;
}
