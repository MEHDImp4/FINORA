/**
 * Single source of truth for "how big is this download expected to be".
 *
 * A download's real size can come from two places:
 *  - `totalBytes`   : the Content-Length reported by the server.
 *  - `expectedBytes`: a duration/bitrate estimate used when the server sends no
 *    Content-Length (transcoded responses). It is persisted so it survives an
 *    app restart.
 *
 * Integrity, resume and disk-space decisions must never disagree, so they all
 * go through this helper instead of reading either field directly. This is the
 * root cause of DWN-02: a completed transcode (totalBytes = 0, expectedBytes = X)
 * used to be treated as "unknown size" and re-downloaded after a restart.
 */
export function getEffectiveExpectedBytes(
  totalBytes?: number | null,
  expectedBytes?: number | null
): number {
  if (typeof totalBytes === "number" && totalBytes > 0) return totalBytes;
  if (typeof expectedBytes === "number" && expectedBytes > 0) return expectedBytes;
  return 0;
}

/** True when at least one size signal is known for the download. */
export function hasKnownDownloadSize(
  totalBytes?: number | null,
  expectedBytes?: number | null
): boolean {
  return getEffectiveExpectedBytes(totalBytes, expectedBytes) > 0;
}

/** A file is complete when it reaches the effective expected size. */
export function isFileComplete(
  fileSizeBytes: number,
  totalBytes?: number | null,
  expectedBytes?: number | null
): boolean {
  const expected = getEffectiveExpectedBytes(totalBytes, expectedBytes);
  return expected > 0 && fileSizeBytes > 0 && fileSizeBytes >= expected;
}
