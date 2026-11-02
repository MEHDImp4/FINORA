from pathlib import Path
import subprocess

root = Path("src/features/offline/download")
root.mkdir(parents=True, exist_ok=True)

(root / "DownloadPersistence.ts").write_text(r'''import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "../../../core/network/logger";
import { DownloadStatus, OfflineMediaRecord } from "../types";
import { DownloadQuality } from "../downloadQuality";
import { DownloadScope, getDownloadScopeKey } from "../downloadPaths";

/**
 * Persisted snapshot of a download.
 *
 * SECURITY: credentials, authorization headers and native resume blobs must
 * never be added to this shape. Authentication is reconstructed from the live
 * secure session when a transfer resumes.
 */
export interface PersistedDownloadEntry {
  itemId: string;
  title: string;
  type: "Movie" | "Episode";
  year?: number;
  downloadUrl: string;
  localPath: string;
  status: DownloadStatus;
  progress: number;
  bytesDownloaded: number;
  totalBytes: number;
  error?: string;
  startedAt: number;
  completedAt?: number;
  seriesId?: string;
  seriesName?: string;
  seriesPosterPath?: string;
  seasonIndex?: number;
  episodeIndex?: number;
  posterPath?: string;
  posterLocalPath?: string;
  quality?: DownloadQuality;
  serverId?: string;
  userId?: string;
  serverUrl?: string;
  resumeOffset?: number;
  expectedBytes?: number;
  metadata?: Partial<OfflineMediaRecord>;
}

export const DOWNLOAD_QUEUE_STORAGE_KEY = "@finora_download_queue";
export const DOWNLOAD_QUEUE_ORDER_STORAGE_KEY = "@finora_download_order";

export function getScopedDownloadQueueKey(scope: DownloadScope): string {
  return `${DOWNLOAD_QUEUE_STORAGE_KEY}:${getDownloadScopeKey(scope)}`;
}

export function getScopedDownloadOrderKey(scope: DownloadScope): string {
  return `${DOWNLOAD_QUEUE_ORDER_STORAGE_KEY}:${getDownloadScopeKey(scope)}`;
}

export function parsePersistedEntries(raw: string | null): PersistedDownloadEntry[] | null {
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PersistedDownloadEntry[]) : null;
  } catch {
    logger.warn("[DownloadPersistence] Ignoring malformed persisted download state.");
    return null;
  }
}

export async function persistDownloadEntries(
  entries: readonly PersistedDownloadEntry[],
  queue: readonly string[],
  scope?: DownloadScope | null
): Promise<void> {
  const queueKey = scope ? getScopedDownloadQueueKey(scope) : DOWNLOAD_QUEUE_STORAGE_KEY;
  const orderKey = scope
    ? getScopedDownloadOrderKey(scope)
    : DOWNLOAD_QUEUE_ORDER_STORAGE_KEY;

  await AsyncStorage.setItem(queueKey, JSON.stringify(entries));
  await AsyncStorage.setItem(orderKey, JSON.stringify(Array.from(queue)));
}

export async function readPersistedQueueOrder(
  scope?: DownloadScope | null
): Promise<string[]> {
  const keys = scope
    ? [getScopedDownloadOrderKey(scope), DOWNLOAD_QUEUE_ORDER_STORAGE_KEY]
    : [DOWNLOAD_QUEUE_ORDER_STORAGE_KEY];

  for (const key of keys) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (typeof raw !== "string") continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((id): id is string => typeof id === "string");
      }
    } catch {
      logger.debug("[DownloadPersistence] Queue-order read failed; trying fallback.");
    }
  }
  return [];
}

export async function readPersistedDownloadEntries(
  scope?: DownloadScope | null
): Promise<{ entries: PersistedDownloadEntry[]; usedLegacyKey: boolean }> {
  if (scope) {
    const scoped = parsePersistedEntries(
      await AsyncStorage.getItem(getScopedDownloadQueueKey(scope))
    );
    if (scoped && scoped.length > 0) {
      return { entries: scoped, usedLegacyKey: false };
    }
  }

  let legacy = parsePersistedEntries(await AsyncStorage.getItem(DOWNLOAD_QUEUE_STORAGE_KEY)) ?? [];
  if (scope) {
    legacy = legacy.filter(
      (entry) => entry.serverId === scope.serverId && entry.userId === scope.userId
    );
  }
  return { entries: legacy, usedLegacyKey: true };
}

/**
 * Removes only the current account's migrated entries from the legacy global
 * queue. Other accounts remain available for their own one-time migration.
 */
export async function removeMigratedLegacyEntries(scope: DownloadScope): Promise<void> {
  try {
    const legacy = parsePersistedEntries(await AsyncStorage.getItem(DOWNLOAD_QUEUE_STORAGE_KEY));
    if (!legacy) return;

    const remaining = legacy.filter(
      (entry) => !(entry.serverId === scope.serverId && entry.userId === scope.userId)
    );

    if (remaining.length === 0) {
      await AsyncStorage.removeItem(DOWNLOAD_QUEUE_STORAGE_KEY);
    } else if (remaining.length !== legacy.length) {
      await AsyncStorage.setItem(DOWNLOAD_QUEUE_STORAGE_KEY, JSON.stringify(remaining));
    }
  } catch {
    // Scoped data has already been committed. Cleanup is intentionally best effort.
    logger.debug("[DownloadPersistence] Legacy migration cleanup failed.");
  }
}
''')

(root / "DownloadScheduler.ts").write_text(r'''import { DownloadItem } from "../types";

export interface DownloadQueuePlan {
  remainingQueue: string[];
  promote: string[];
}

export function countActiveDownloads(
  downloads: ReadonlyMap<string, Pick<DownloadItem, "status">>
): number {
  let active = 0;
  for (const item of downloads.values()) {
    // Preserve DownloadManager's historical concurrency definition exactly:
    // only live downloading transfers occupy a scheduler slot.
    if (item.status === "downloading") active++;
  }
  return active;
}

/** Restore persisted FIFO order, then append queued items missing from it. */
export function rebuildQueuedOrder(
  downloads: ReadonlyMap<string, Pick<DownloadItem, "status">>,
  persistedOrder: readonly string[]
): string[] {
  const queuedIds = Array.from(downloads.entries())
    .filter(([, item]) => item.status === "queued")
    .map(([id]) => id);
  const queuedSet = new Set(queuedIds);
  const ordered: string[] = [];

  for (const id of persistedOrder) {
    if (queuedSet.has(id) && !ordered.includes(id)) ordered.push(id);
  }
  for (const id of queuedIds) {
    if (!ordered.includes(id)) ordered.push(id);
  }
  return ordered;
}

/**
 * Pure scheduler planning step. A stale/non-queued id still consumes one loop
 * iteration, matching the pre-refactor DownloadManager behavior exactly.
 */
export function planQueuePromotions(
  downloads: ReadonlyMap<string, Pick<DownloadItem, "status">>,
  queue: readonly string[],
  maxConcurrent: number
): DownloadQueuePlan {
  const availableSlots = Math.max(0, maxConcurrent - countActiveDownloads(downloads));
  const remainingQueue = Array.from(queue);
  const promote: string[] = [];

  for (let i = 0; i < availableSlots && remainingQueue.length > 0; i++) {
    const nextId = remainingQueue.shift();
    if (!nextId) break;
    const nextItem = downloads.get(nextId);
    if (nextItem?.status === "queued") promote.push(nextId);
  }

  return { remainingQueue, promote };
}
''')

manager_path = Path("src/features/offline/downloadManager.ts")
text = manager_path.read_text()

# Replace AsyncStorage ownership with dedicated persistence/scheduler modules.
old_import = 'import AsyncStorage from "@react-native-async-storage/async-storage";\n'
new_import = '''import {
  PersistedDownloadEntry,
  DOWNLOAD_QUEUE_STORAGE_KEY,
  DOWNLOAD_QUEUE_ORDER_STORAGE_KEY,
  getScopedDownloadQueueKey,
  getScopedDownloadOrderKey,
  persistDownloadEntries,
  readPersistedDownloadEntries,
  readPersistedQueueOrder,
  removeMigratedLegacyEntries
} from "./download/DownloadPersistence";
import {
  planQueuePromotions,
  rebuildQueuedOrder
} from "./download/DownloadScheduler";

export {
  DOWNLOAD_QUEUE_STORAGE_KEY,
  DOWNLOAD_QUEUE_ORDER_STORAGE_KEY,
  getScopedDownloadQueueKey,
  getScopedDownloadOrderKey
} from "./download/DownloadPersistence";
export type { PersistedDownloadEntry } from "./download/DownloadPersistence";
'''
if text.count(old_import) != 1:
    raise RuntimeError("Expected one AsyncStorage import in DownloadManager")
text = text.replace(old_import, new_import, 1)

# Remove the local persistence type/constants/key helpers, now owned by the module.
start_marker = '/**\n * Persisted snapshot of a download, stored in AsyncStorage.'
end_marker = '/** Controlled, recoverable failure used when no usable Jellyfin session exists. */'
start = text.find(start_marker)
end = text.find(end_marker)
if start < 0 or end < 0 or end <= start:
    raise RuntimeError("Could not locate local persistence declarations")
text = text[:start] + text[end:]

# Delegate actual AsyncStorage writes to DownloadPersistence.
key_block = '''      const queueKey = scope ? getScopedDownloadQueueKey(scope) : DOWNLOAD_QUEUE_STORAGE_KEY;
      const orderKey = scope
        ? getScopedDownloadOrderKey(scope)
        : DOWNLOAD_QUEUE_ORDER_STORAGE_KEY;

'''
if text.count(key_block) != 1:
    raise RuntimeError("Expected persistence key block")
text = text.replace(key_block, "", 1)
write_block = '''      await AsyncStorage.setItem(queueKey, JSON.stringify(entries));
      await AsyncStorage.setItem(orderKey, JSON.stringify(this.queue.slice()));
'''
if text.count(write_block) != 1:
    raise RuntimeError("Expected direct AsyncStorage writes")
text = text.replace(write_block, '''      await persistDownloadEntries(entries, this.queue, scope);
''', 1)

# Replace three manager-local persistence helpers with the dedicated module.
helpers_start = text.find('  /**\n   * Reads the persisted queue order (FIFO position of queued item ids).')
helpers_end = text.find('  /** Real size of a local file, or 0 when it is missing/unreadable. */')
if helpers_start < 0 or helpers_end < 0 or helpers_end <= helpers_start:
    raise RuntimeError("Could not locate persistence helper block")
text = text[:helpers_start] + text[helpers_end:]

restore_old = '''      const effectiveScope = scope ?? this.activeScope ?? undefined;
      const scopedKey = effectiveScope ? getScopedDownloadQueueKey(effectiveScope) : null;

      let entries: PersistedDownloadEntry[] | null = null;
      let usedLegacyKey = false;

      if (scopedKey) {
        entries = this.parsePersistedEntries(await AsyncStorage.getItem(scopedKey));
      }

      if (!entries || entries.length === 0) {
        entries =
          this.parsePersistedEntries(await AsyncStorage.getItem(DOWNLOAD_QUEUE_STORAGE_KEY)) ?? [];
        usedLegacyKey = true;

        // A legacy/global entry may only be adopted when it proves it belongs to
        // the active server AND user. Anything else fails closed and is ignored,
        // so another account's queue is never loaded into this session.
        if (effectiveScope) {
          entries = entries.filter(
            (entry) =>
              entry.serverId === effectiveScope.serverId &&
              entry.userId === effectiveScope.userId
          );
        }
      }

      if (entries.length === 0) return;
'''
restore_new = '''      const effectiveScope = scope ?? this.activeScope ?? undefined;
      const { entries, usedLegacyKey } = await readPersistedDownloadEntries(effectiveScope);

      if (entries.length === 0) return;
'''
if text.count(restore_old) != 1:
    raise RuntimeError("Expected restore persistence block")
text = text.replace(restore_old, restore_new, 1)

text = text.replace(
    'const persistedOrder = await this.readPersistedQueueOrder(effectiveScope ?? null);',
    'const persistedOrder = await readPersistedQueueOrder(effectiveScope ?? null);',
    1,
)
text = text.replace(
    'await this.removeMigratedLegacyEntries(effectiveScope);',
    'await removeMigratedLegacyEntries(effectiveScope);',
    1,
)

fifo_old = '''        const queuedIds = Array.from(this.downloads.values())
          .filter((d) => d.status === "queued")
          .map((d) => d.itemId);

        const ordered: string[] = [];
        for (const id of persistedOrder) {
          if (queuedIds.includes(id) && !ordered.includes(id)) ordered.push(id);
        }
        for (const id of queuedIds) {
          if (!ordered.includes(id)) ordered.push(id);
        }
        this.queue = ordered;
'''
if text.count(fifo_old) != 1:
    raise RuntimeError("Expected FIFO restore block")
text = text.replace(
    fifo_old,
    '        this.queue = rebuildQueuedOrder(this.downloads, persistedOrder);\n',
    1,
)

process_old = '''  public processQueue(): void {
    const activeCount = Array.from(this.downloads.values()).filter(
      (d) => d.status === "downloading"
    ).length;
    const availableSlots = MAX_CONCURRENT_DOWNLOADS - activeCount;

    for (let i = 0; i < availableSlots && this.queue.length > 0; i++) {
      const nextId = this.queue.shift();
      if (!nextId) break;

      const nextItem = this.downloads.get(nextId);
      if (nextItem && nextItem.status === "queued") {
        nextItem.status = "downloading";
        this.executeDownload(nextId);
      }
    }

    this.notify();
  }
'''
process_new = '''  public processQueue(): void {
    const plan = planQueuePromotions(
      this.downloads,
      this.queue,
      MAX_CONCURRENT_DOWNLOADS
    );
    this.queue = plan.remainingQueue;

    for (const nextId of plan.promote) {
      const nextItem = this.downloads.get(nextId);
      if (!nextItem || nextItem.status !== "queued") continue;
      nextItem.status = "downloading";
      this.executeDownload(nextId);
    }

    this.notify();
  }
'''
if text.count(process_old) != 1:
    raise RuntimeError("Expected processQueue block")
text = text.replace(process_old, process_new, 1)

# Turn operationally useful silent catches into sanitized diagnostics.
text = text.replace(
    'this.persistQueue().catch(() => {});',
    'this.persistQueue().catch(() => logger.debug("[DownloadManager] Debounced persistence failed."));',
)
text = text.replace(
    'this.flushPersist().catch(() => {});',
    'this.flushPersist().catch(() => logger.debug("[DownloadManager] Immediate persistence flush failed."));',
)
text = text.replace(
    'await this.initPromise.catch(() => {});',
    'await this.initPromise.catch(() => logger.debug("[DownloadManager] Initialization failed during identity change."));',
)
text = text.replace(
    'await this.flushPersist().catch(() => {});',
    'await this.flushPersist().catch(() => logger.debug("[DownloadManager] Outgoing-scope persistence failed."));',
)
text = text.replace(
    '''      } catch {
        // Non-fatal — the in-memory state is cleared regardless.
      }
''',
    '''      } catch {
        logger.debug("[DownloadManager] Native task cancellation failed during identity change.");
        // Non-fatal — the in-memory state is cleared regardless.
      }
''',
    1,
)

if 'AsyncStorage' in text:
    # Documentation may mention AsyncStorage; imports/calls must not remain.
    suspicious = [line for line in text.splitlines() if 'AsyncStorage.' in line or 'from "@react-native-async-storage' in line]
    if suspicious:
        raise RuntimeError(f"Direct AsyncStorage use remains in DownloadManager: {suspicious}")

manager_path.write_text(text)

# Pure scheduler tests lock in the exact old queue semantics.
Path("src/features/offline/__tests__/downloadScheduler.test.ts").write_text(r'''import {
  countActiveDownloads,
  planQueuePromotions,
  rebuildQueuedOrder
} from "../download/DownloadScheduler";
import { DownloadItem } from "../types";

function item(itemId: string, status: DownloadItem["status"]): DownloadItem {
  return {
    itemId,
    title: itemId,
    type: "Movie",
    downloadUrl: `https://example.test/${itemId}`,
    localPath: `file:///tmp/${itemId}`,
    status,
    progress: 0,
    bytesDownloaded: 0,
    totalBytes: 0,
    startedAt: 1
  };
}

describe("DownloadScheduler", () => {
  it("counts only downloading items against the historical concurrency cap", () => {
    const downloads = new Map([
      ["active", item("active", "downloading")],
      ["finalizing", item("finalizing", "finalizing")],
      ["queued", item("queued", "queued")]
    ]);
    expect(countActiveDownloads(downloads)).toBe(1);
  });

  it("restores persisted FIFO and appends queued ids missing from persisted order", () => {
    const downloads = new Map([
      ["a", item("a", "queued")],
      ["b", item("b", "paused")],
      ["c", item("c", "queued")],
      ["d", item("d", "queued")]
    ]);
    expect(rebuildQueuedOrder(downloads, ["c", "missing", "c", "a"]))
      .toEqual(["c", "a", "d"]);
  });

  it("honors the concurrency cap", () => {
    const downloads = new Map([
      ["active1", item("active1", "downloading")],
      ["active2", item("active2", "downloading")],
      ["a", item("a", "queued")],
      ["b", item("b", "queued")]
    ]);
    expect(planQueuePromotions(downloads, ["a", "b"], 3)).toEqual({
      remainingQueue: ["b"],
      promote: ["a"]
    });
  });

  it("preserves legacy behavior where a stale queue id consumes one slot iteration", () => {
    const downloads = new Map([
      ["a", item("a", "queued")],
      ["b", item("b", "queued")]
    ]);
    expect(planQueuePromotions(downloads, ["stale", "a", "b"], 2)).toEqual({
      remainingQueue: ["b"],
      promote: ["a"]
    });
  });

  it("does not promote paused items", () => {
    const downloads = new Map([
      ["paused", item("paused", "paused")],
      ["queued", item("queued", "queued")]
    ]);
    expect(planQueuePromotions(downloads, ["paused", "queued"], 2)).toEqual({
      remainingQueue: [],
      promote: ["queued"]
    });
  });
});
''')

Path("src/features/offline/__tests__/downloadPersistenceModule.test.ts").write_text(r'''import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DOWNLOAD_QUEUE_STORAGE_KEY,
  getScopedDownloadOrderKey,
  getScopedDownloadQueueKey,
  parsePersistedEntries,
  persistDownloadEntries,
  readPersistedDownloadEntries,
  readPersistedQueueOrder,
  removeMigratedLegacyEntries
} from "../download/DownloadPersistence";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

describe("DownloadPersistence", () => {
  const scopeA = { serverId: "server-a", userId: "user-a" };
  const scopeB = { serverId: "server-b", userId: "user-b" };

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("isolates queue and FIFO keys by server and user", async () => {
    const entry = {
      itemId: "movie-a",
      title: "Movie A",
      type: "Movie" as const,
      downloadUrl: "https://example.test/movie-a",
      localPath: "file:///movie-a",
      status: "queued" as const,
      progress: 0,
      bytesDownloaded: 0,
      totalBytes: 0,
      startedAt: 1,
      serverId: scopeA.serverId,
      userId: scopeA.userId
    };

    await persistDownloadEntries([entry], [entry.itemId], scopeA);

    expect(await AsyncStorage.getItem(getScopedDownloadQueueKey(scopeA))).not.toBeNull();
    expect(await AsyncStorage.getItem(getScopedDownloadQueueKey(scopeB))).toBeNull();
    expect(JSON.parse((await AsyncStorage.getItem(getScopedDownloadOrderKey(scopeA)))!))
      .toEqual(["movie-a"]);
  });

  it("fails closed when migrating a legacy queue for another account", async () => {
    await AsyncStorage.setItem(
      DOWNLOAD_QUEUE_STORAGE_KEY,
      JSON.stringify([
        {
          itemId: "foreign",
          title: "Foreign",
          type: "Movie",
          downloadUrl: "https://example.test/foreign",
          localPath: "file:///foreign",
          status: "queued",
          progress: 0,
          bytesDownloaded: 0,
          totalBytes: 0,
          startedAt: 1,
          serverId: scopeB.serverId,
          userId: scopeB.userId
        }
      ])
    );

    const restored = await readPersistedDownloadEntries(scopeA);
    expect(restored.usedLegacyKey).toBe(true);
    expect(restored.entries).toEqual([]);
  });

  it("tolerates malformed state and malformed FIFO JSON", async () => {
    expect(parsePersistedEntries("{broken")).toBeNull();
    await AsyncStorage.setItem(getScopedDownloadOrderKey(scopeA), "{broken");
    expect(await readPersistedQueueOrder(scopeA)).toEqual([]);
  });

  it("removes only the migrated account from the legacy queue", async () => {
    const makeEntry = (scope: typeof scopeA, id: string) => ({
      itemId: id,
      title: id,
      type: "Movie",
      downloadUrl: `https://example.test/${id}`,
      localPath: `file:///${id}`,
      status: "queued",
      progress: 0,
      bytesDownloaded: 0,
      totalBytes: 0,
      startedAt: 1,
      serverId: scope.serverId,
      userId: scope.userId
    });
    await AsyncStorage.setItem(
      DOWNLOAD_QUEUE_STORAGE_KEY,
      JSON.stringify([makeEntry(scopeA, "a"), makeEntry(scopeB, "b")])
    );

    await removeMigratedLegacyEntries(scopeA);
    const remaining = JSON.parse((await AsyncStorage.getItem(DOWNLOAD_QUEUE_STORAGE_KEY))!);
    expect(remaining.map((entry: { itemId: string }) => entry.itemId)).toEqual(["b"]);
  });
});
''')

paths = [
    "src/features/offline/download/DownloadPersistence.ts",
    "src/features/offline/download/DownloadScheduler.ts",
    "src/features/offline/downloadManager.ts",
    "src/features/offline/__tests__/downloadScheduler.test.ts",
    "src/features/offline/__tests__/downloadPersistenceModule.test.ts",
]
subprocess.run(["git", "add", *paths], check=True)
print("Phase 5 final refactor applied")
