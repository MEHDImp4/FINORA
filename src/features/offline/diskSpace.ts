import * as FileSystem from "expo-file-system/legacy";
import { logger } from "../../core/network/logger";
import { getEffectiveExpectedBytes } from "./downloadSizing";

/**
 * DWN-01 — Disk space preflight.
 *
 * A download must never silently fill the device. Before any transfer starts we
 * compare the required bytes against the free space, keeping a safety margin so
 * the operating system and other apps always have headroom.
 *
 * The margin is intentionally configurable and conservative:
 *  - at least `DISK_SAFETY_MARGIN_BYTES` (250 MB), AND
 *  - at least `DISK_SAFETY_MARGIN_FRACTION` (10 %) of the free space.
 * The larger of the two wins, so neither tiny nor huge disks are squeezed.
 */
export const DISK_SAFETY_MARGIN_FRACTION = 0.1;
export const DISK_SAFETY_MARGIN_BYTES = 250 * 1024 * 1024;

/** Recoverable error surfaced before any byte is written. */
export const INSUFFICIENT_STORAGE_ERROR = "ESPACE_INSUFFISANT";
/** Disk filled up mid-transfer (ENOSPC or equivalent). */
export const STORAGE_FULL_ERROR = "ESPACE_DE_STOCKAGE_EPUISE";

export interface DiskSpaceRequirement {
  /** Bytes the transfer still needs. */
  requiredBytes: number;
  /** Free bytes, or null when the platform cannot report them. */
  availableBytes: number | null;
  /** Bytes we deliberately keep free. */
  marginBytes: number;
  /** False only when availability is known AND does not cover required + margin. */
  sufficient: boolean;
}

/**
 * Safety margin kept free after the download completes.
 * Exported so the policy is documented and directly testable.
 */
export function computeSafetyMargin(availableBytes: number): number {
  if (!Number.isFinite(availableBytes) || availableBytes <= 0) {
    return DISK_SAFETY_MARGIN_BYTES;
  }
  return Math.max(
    DISK_SAFETY_MARGIN_BYTES,
    Math.ceil(availableBytes * DISK_SAFETY_MARGIN_FRACTION)
  );
}

/**
 * Pure decision function. `availableBytes === null` means "unknown" — in that
 * case we fail OPEN (allow) rather than blocking every download on a device
 * whose filesystem API is unavailable. A real measured 0 is treated as full.
 */
export function evaluateDiskSpace(
  requiredBytes: number,
  availableBytes: number | null
): DiskSpaceRequirement {
  if (availableBytes === null || !Number.isFinite(availableBytes)) {
    return { requiredBytes, availableBytes: null, marginBytes: 0, sufficient: true };
  }

  const marginBytes = computeSafetyMargin(availableBytes);
  const sufficient = requiredBytes <= 0 || availableBytes >= requiredBytes + marginBytes;
  return { requiredBytes, availableBytes, marginBytes, sufficient };
}

/** Free space in bytes, or null when it cannot be determined. */
export async function getAvailableDiskBytes(): Promise<number | null> {
  try {
    const api = FileSystem as unknown as {
      getFreeDiskStorageAsync?: () => Promise<number>;
    };
    if (typeof api.getFreeDiskStorageAsync !== "function") return null;
    const free = await api.getFreeDiskStorageAsync();
    return typeof free === "number" && Number.isFinite(free) && free >= 0 ? free : null;
  } catch (err: any) {
    logger.warn("[DiskSpace] Unable to read free disk space:", err?.message ?? err);
    return null;
  }
}

/**
 * Bytes still required for a transfer, given what is already on disk.
 * Returns 0 when the final size is unknown (nothing to preflight).
 */
export function requiredBytesForDownload(
  totalBytes?: number | null,
  expectedBytes?: number | null,
  alreadyOnDisk: number = 0
): number {
  const target = getEffectiveExpectedBytes(totalBytes, expectedBytes);
  if (target <= 0) return 0;
  return Math.max(0, target - Math.max(0, alreadyOnDisk || 0));
}

/** Best-effort detection of a full-disk failure from native error text. */
export function isDiskFullError(message: unknown): boolean {
  const text = typeof message === "string" ? message : String((message as any)?.message ?? "");
  return /ENOSPC|no space left|disk full|storage full|espace insuffisant/i.test(text);
}
