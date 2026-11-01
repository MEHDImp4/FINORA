from pathlib import Path


def replace_between(text: str, start: str, end: str, replacement: str) -> str:
    start_index = text.index(start)
    end_index = text.index(end, start_index)
    return text[:start_index] + replacement + text[end_index:]


def replace_once(text: str, old: str, new: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one occurrence, found {count}: {old[:80]!r}")
    return text.replace(old, new, 1)


offline_path = Path("src/features/offline/offlineStorage.ts")
offline = offline_path.read_text()

queue_helpers = r'''

/**
 * Serializes storage mutations per Jellyfin account scope. A mutation for one
 * server/user never waits on a different account, while every read-modify-write
 * sequence for the same scope is ordered deterministically.
 */
const scopeMutationQueues = new Map<string, Promise<void>>();
const scopeMigrationPromises = new Map<string, Promise<void>>();

async function runScopeMutation<T>(
  scope: OfflineStorageScope,
  mutation: () => Promise<T>
): Promise<T> {
  const scopeId = getScopeSuffix(scope);
  const previous = scopeMutationQueues.get(scopeId) ?? Promise.resolve();
  const result = previous.catch(() => undefined).then(mutation);
  const tail = result.then(
    () => undefined,
    () => undefined
  );

  scopeMutationQueues.set(scopeId, tail);

  try {
    return await result;
  } finally {
    if (scopeMutationQueues.get(scopeId) === tail) {
      scopeMutationQueues.delete(scopeId);
    }
  }
}
'''
offline = replace_once(
    offline,
    "\n\nexport class OfflineStorageService {",
    queue_helpers + "\nexport class OfflineStorageService {",
)

migration = r'''  private async migrateLegacyIfSafe(scope: OfflineStorageScope): Promise<void> {
    const scopeId = getScopeSuffix(scope);
    if (this.migrationCheckedScopes.has(scopeId)) return;

    const inFlight = scopeMigrationPromises.get(scopeId);
    if (inFlight) {
      await inFlight;
      this.migrationCheckedScopes.add(scopeId);
      return;
    }

    const migration = runScopeMutation(scope, async () => {
      try {
        const accounts = parseArray<Partial<OfflineStorageScope>>(
          await AsyncStorage.getItem(SAVED_ACCOUNTS_STORAGE_KEY)
        );
        const isOnlyAccount =
          accounts.length === 1 &&
          accounts[0]?.serverId === scope.serverId &&
          accounts[0]?.userId === scope.userId;

        if (!isOnlyAccount) return;

        const catalogKey = getScopedOfflineCatalogKey(scope);
        const syncKey = getScopedOfflineSyncQueueKey(scope);
        const [scopedCatalog, scopedSync, legacyCatalog, legacySync] = await Promise.all([
          AsyncStorage.getItem(catalogKey),
          AsyncStorage.getItem(syncKey),
          AsyncStorage.getItem(OFFLINE_CATALOG_STORAGE_KEY),
          AsyncStorage.getItem(OFFLINE_SYNC_QUEUE_STORAGE_KEY)
        ]);

        if (scopedCatalog === null && legacyCatalog !== null) {
          await AsyncStorage.setItem(catalogKey, legacyCatalog);
          await AsyncStorage.removeItem(OFFLINE_CATALOG_STORAGE_KEY);
        }

        if (scopedSync === null && legacySync !== null) {
          await AsyncStorage.setItem(syncKey, legacySync);
          await AsyncStorage.removeItem(OFFLINE_SYNC_QUEUE_STORAGE_KEY);
        }
      } catch {
        // Migration is best effort. Never fall back to exposing a global catalog.
      }
    });

    scopeMigrationPromises.set(scopeId, migration.then(() => undefined));
    try {
      await migration;
      this.migrationCheckedScopes.add(scopeId);
    } finally {
      if (scopeMigrationPromises.get(scopeId)) {
        scopeMigrationPromises.delete(scopeId);
      }
    }
  }'''
offline = replace_between(
    offline,
    "  private async migrateLegacyIfSafe(scope: OfflineStorageScope): Promise<void> {",
    "\n\n  private async getCatalogKey",
    migration,
)

unlocked_helpers = r'''

  /** Direct scoped reads used only while the caller already owns the scope mutation queue. */
  private async getAllOfflineMediaUnlocked(
    scope: OfflineStorageScope
  ): Promise<OfflineMediaRecord[]> {
    return parseArray<OfflineMediaRecord>(
      await AsyncStorage.getItem(getScopedOfflineCatalogKey(scope))
    );
  }

  private async getOfflineMediaUnlocked(
    itemId: string,
    scope: OfflineStorageScope
  ): Promise<OfflineMediaRecord | null> {
    const all = await this.getAllOfflineMediaUnlocked(scope);
    return all.find((item) => item.itemId === itemId) || null;
  }

  private async saveOfflineMediaUnlocked(
    record: OfflineMediaRecord,
    scope: OfflineStorageScope
  ): Promise<void> {
    const all = await this.getAllOfflineMediaUnlocked(scope);
    const updated = all.filter((item) => item.itemId !== record.itemId);
    updated.push(record);
    await AsyncStorage.setItem(getScopedOfflineCatalogKey(scope), JSON.stringify(updated));
  }

  private async getPendingSyncEntriesUnlocked(
    scope: OfflineStorageScope
  ): Promise<SyncQueueEntry[]> {
    return parseArray<SyncQueueEntry>(
      await AsyncStorage.getItem(getScopedOfflineSyncQueueKey(scope))
    );
  }
'''
offline = replace_once(
    offline,
    "\n\n  /**\n   * Saves or updates an offline media record in account-scoped local storage.",
    unlocked_helpers + "\n\n  /**\n   * Saves or updates an offline media record in account-scoped local storage.",
)

save_method = r'''  public async saveOfflineMedia(
    record: OfflineMediaRecord,
    scope?: OfflineStorageScope
  ): Promise<void> {
    const resolved = await this.resolveScope(scope, record.itemId);
    if (!resolved) return;
    await this.migrateLegacyIfSafe(resolved);

    await runScopeMutation(resolved, () => this.saveOfflineMediaUnlocked(record, resolved));
  }'''
offline = replace_between(
    offline,
    "  public async saveOfflineMedia(",
    "\n\n  /**\n   * Retrieves a single offline media record",
    save_method,
)

delete_method = r'''  public async deleteOfflineMedia(
    itemId: string,
    scope?: OfflineStorageScope
  ): Promise<void> {
    const resolved = await this.resolveScope(scope);
    if (!resolved) return;
    await this.migrateLegacyIfSafe(resolved);

    await runScopeMutation(resolved, async () => {
      const all = await this.getAllOfflineMediaUnlocked(resolved);
      const item = all.find((candidate) => candidate.itemId === itemId);
      const remaining = all.filter((candidate) => candidate.itemId !== itemId);
      await AsyncStorage.setItem(
        getScopedOfflineCatalogKey(resolved),
        JSON.stringify(remaining)
      );

      if (item?.localPath && typeof FileSystem.deleteAsync === "function") {
        try {
          await FileSystem.deleteAsync(item.localPath, { idempotent: true });
        } catch {
          // Safe deletion
        }
      }
      if (item?.posterLocalPath && typeof FileSystem.deleteAsync === "function") {
        try {
          await FileSystem.deleteAsync(item.posterLocalPath, { idempotent: true });
        } catch {
          // Safe deletion
        }
      }
    });
  }'''
offline = replace_between(
    offline,
    "  public async deleteOfflineMedia(",
    "\n\n  /**\n   * Deletes all downloaded episodes",
    delete_method,
)

delete_series_method = r'''  public async deleteSeriesOfflineMedia(seriesIdOrName: string): Promise<void> {
    const scope = await this.resolveScope();
    if (!scope) return;
    await this.migrateLegacyIfSafe(scope);

    await runScopeMutation(scope, async () => {
      const all = await this.getAllOfflineMediaUnlocked(scope);
      const seriesEpisodes = all.filter(
        (item) =>
          item.seriesId === seriesIdOrName ||
          (item.seriesName && item.seriesName === seriesIdOrName)
      );
      const remaining = all.filter(
        (item) =>
          item.seriesId !== seriesIdOrName &&
          (!item.seriesName || item.seriesName !== seriesIdOrName)
      );
      await AsyncStorage.setItem(
        getScopedOfflineCatalogKey(scope),
        JSON.stringify(remaining)
      );

      for (const episode of seriesEpisodes) {
        if (episode.localPath && typeof FileSystem.deleteAsync === "function") {
          try {
            await FileSystem.deleteAsync(episode.localPath, { idempotent: true });
          } catch {
            // Safe deletion
          }
        }
        if (episode.posterLocalPath && typeof FileSystem.deleteAsync === "function") {
          try {
            await FileSystem.deleteAsync(episode.posterLocalPath, { idempotent: true });
          } catch {
            // Safe deletion
          }
        }
      }
    });
  }'''
offline = replace_between(
    offline,
    "  public async deleteSeriesOfflineMedia(",
    "\n\n  /**\n   * Updates playback position locally",
    delete_series_method,
)

update_position_method = r'''  public async updateLocalPlaybackPosition(
    itemId: string,
    positionTicks: number,
    totalTicks?: number
  ): Promise<void> {
    const scope = await this.resolveScope();
    if (!scope) return;
    await this.migrateLegacyIfSafe(scope);

    await runScopeMutation(scope, async () => {
      const item = await this.getOfflineMediaUnlocked(itemId, scope);
      if (!item) return;

      const updated: OfflineMediaRecord = {
        ...item,
        playbackPositionTicks: positionTicks
      };
      const effectiveTotal = totalTicks || item.totalTicks;
      if (effectiveTotal > 0 && positionTicks / effectiveTotal >= 0.9 && !item.isPlayed) {
        updated.isPlayed = true;
        updated.completedWatchedAt = Date.now();
      }
      await this.saveOfflineMediaUnlocked(updated, scope);
    });
  }'''
offline = replace_between(
    offline,
    "  public async updateLocalPlaybackPosition(",
    "\n\n  /**\n   * Explicitly marks an offline media record",
    update_position_method,
)

mark_watched_method = r'''  public async markAsWatched(itemId: string): Promise<void> {
    const scope = await this.resolveScope();
    if (!scope) return;
    await this.migrateLegacyIfSafe(scope);

    await runScopeMutation(scope, async () => {
      const item = await this.getOfflineMediaUnlocked(itemId, scope);
      if (!item) return;

      await this.saveOfflineMediaUnlocked(
        {
          ...item,
          isPlayed: true,
          completedWatchedAt: Date.now()
        },
        scope
      );
    });
  }'''
offline = replace_between(
    offline,
    "  public async markAsWatched(",
    "\n\n  /**\n   * Automatically cleans up watched downloads",
    mark_watched_method,
)

cleanup_expired_method = r'''  public async cleanupExpiredWatchedMedia(retentionHours: number = 48): Promise<string[]> {
    const scope = await this.resolveScope();
    if (!scope) return [];
    await this.migrateLegacyIfSafe(scope);

    return runScopeMutation(scope, async () => {
      const all = await this.getAllOfflineMediaUnlocked(scope);
      const now = Date.now();
      const retentionMs = retentionHours * 60 * 60 * 1000;
      const expiredIds: string[] = [];
      const remaining: OfflineMediaRecord[] = [];

      for (const item of all) {
        if (item.completedWatchedAt && now - item.completedWatchedAt >= retentionMs) {
          expiredIds.push(item.itemId);

          if (item.localPath && typeof FileSystem.deleteAsync === "function") {
            try {
              await FileSystem.deleteAsync(item.localPath, { idempotent: true });
            } catch {
              // Safe deletion
            }
          }

          if (item.posterLocalPath && typeof FileSystem.deleteAsync === "function") {
            try {
              await FileSystem.deleteAsync(item.posterLocalPath, { idempotent: true });
            } catch {
              // Safe deletion
            }
          }
        } else {
          remaining.push(item);
        }
      }

      if (expiredIds.length > 0) {
        await AsyncStorage.setItem(
          getScopedOfflineCatalogKey(scope),
          JSON.stringify(remaining)
        );
      }

      return expiredIds;
    });
  }'''
offline = replace_between(
    offline,
    "  public async cleanupExpiredWatchedMedia(",
    "\n\n  /**\n   * Collects every known account-scoped catalog",
    cleanup_expired_method,
)

purge_method = r'''  public async purgeScope(scope: OfflineStorageScope): Promise<void> {
    if (!isValidScope(scope)) return;

    await runScopeMutation(scope, async () => {
      // Physical files, confined to this account's namespace.
      if (FileSystem.documentDirectory && typeof FileSystem.deleteAsync === "function") {
        const scopeDir = `${FileSystem.documentDirectory}${DOWNLOAD_ROOT_DIR}/${sanitizePathSegment(
          scope.serverId
        )}/${sanitizePathSegment(scope.userId)}/`;
        try {
          await FileSystem.deleteAsync(scopeDir, { idempotent: true });
        } catch {
          // Best effort — metadata removal below still makes the files unreachable.
        }
      }

      await AsyncStorage.removeItem(getScopedOfflineCatalogKey(scope)).catch(() => {});
      await AsyncStorage.removeItem(getScopedOfflineSyncQueueKey(scope)).catch(() => {});
    });
  }'''
offline = replace_between(
    offline,
    "  public async purgeScope(",
    "\n\n  /**\n   * Enqueues a watch progress event",
    purge_method,
)

enqueue_method = r'''  public async enqueueProgressSync(
    itemId: string,
    positionTicks: number,
    isPlayed: boolean
  ): Promise<SyncQueueEntry> {
    const scope = await this.resolveScope();
    if (!scope) {
      throw new Error("Cannot queue offline progress without an active Jellyfin account scope");
    }
    await this.migrateLegacyIfSafe(scope);

    return runScopeMutation(scope, async () => {
      const entries = await this.getPendingSyncEntriesUnlocked(scope);
      const updated = entries.filter((entry) => entry.itemId !== itemId);

      const now = Date.now();
      const newEntry: SyncQueueEntry = {
        id: `sync_${itemId}_${now}`,
        itemId,
        positionTicks,
        isPlayed,
        createdAt: now
      };

      updated.push(newEntry);
      await AsyncStorage.setItem(
        getScopedOfflineSyncQueueKey(scope),
        JSON.stringify(updated)
      );
      return newEntry;
    });
  }'''
offline = replace_between(
    offline,
    "  public async enqueueProgressSync(",
    "\n\n  /**\n   * Retrieves pending watch progress",
    enqueue_method,
)

clear_sync_method = r'''  public async clearSyncEntries(
    entryIds: string[],
    scope?: OfflineStorageScope
  ): Promise<void> {
    if (entryIds.length === 0) return;
    const resolved = await this.resolveScope(scope);
    if (!resolved) return;
    await this.migrateLegacyIfSafe(resolved);

    await runScopeMutation(resolved, async () => {
      const current = await this.getPendingSyncEntriesUnlocked(resolved);
      const idSet = new Set(entryIds);
      const remaining = current.filter((entry) => !idSet.has(entry.id));
      await AsyncStorage.setItem(
        getScopedOfflineSyncQueueKey(resolved),
        JSON.stringify(remaining)
      );
    });
  }'''
offline = replace_between(
    offline,
    "  public async clearSyncEntries(",
    "\n\n  /**\n   * Clears offline catalog and sync queue",
    clear_sync_method,
)

clear_all_method = r'''  public async clearAll(scope?: OfflineStorageScope): Promise<void> {
    const resolved = await this.resolveScope(scope);
    if (!resolved) return;
    await this.migrateLegacyIfSafe(resolved);

    await runScopeMutation(resolved, async () => {
      await AsyncStorage.removeItem(getScopedOfflineCatalogKey(resolved));
      await AsyncStorage.removeItem(getScopedOfflineSyncQueueKey(resolved));
    });
  }'''
offline = replace_between(
    offline,
    "  public async clearAll(",
    "\n\n  /**\n   * Checks real physical disk space",
    clear_all_method,
)

cleanup_orphan_method = r'''  public async cleanupOrphanMedia(): Promise<number> {
    const scope = await this.resolveScope();
    if (!scope) return 0;
    await this.migrateLegacyIfSafe(scope);

    return runScopeMutation(scope, async () => {
      const all = await this.getAllOfflineMediaUnlocked(scope);
      const remaining: OfflineMediaRecord[] = [];
      let orphanCount = 0;

      for (const record of all) {
        let exists = false;
        if (record.localPath && typeof FileSystem.getInfoAsync === "function") {
          try {
            const info = await FileSystem.getInfoAsync(record.localPath);
            exists = !!(info && info.exists);
          } catch {
            exists = false;
          }
        }
        if (exists) {
          remaining.push(record);
        } else {
          orphanCount++;
        }
      }

      if (orphanCount > 0) {
        await AsyncStorage.setItem(
          getScopedOfflineCatalogKey(scope),
          JSON.stringify(remaining)
        );
      }

      return orphanCount;
    });
  }'''
offline = replace_between(
    offline,
    "  public async cleanupOrphanMedia(",
    "\n\n  /**\n   * Resolves the actual physical local filesystem URI",
    cleanup_orphan_method,
)

offline = replace_once(
    offline,
    '''\n    if (record.localPath) {\n      return record.localPath.startsWith("file://")\n        ? record.localPath\n        : `file://${record.localPath}`;\n    }\n\n    return null;''',
    '''\n    return null;''',
)

offline_path.write_text(offline)

# Player route: only a physically verified copy may become an offline playback source.
player_path = Path("src/app/player/[id].tsx")
player = player_path.read_text()
player = replace_once(
    player,
    '  const [offlineRecord, setOfflineRecord] = useState<OfflineMediaRecord | null>(null);\n  const [checkingOffline, setCheckingOffline] = useState(true);',
    '  const [offlineRecord, setOfflineRecord] = useState<OfflineMediaRecord | null>(null);\n  const [offlineFileMissing, setOfflineFileMissing] = useState(false);\n  const [checkingOffline, setCheckingOffline] = useState(true);',
)

new_effect = r'''  useEffect(() => {
    let active = true;
    setCheckingOffline(true);
    setOfflineRecord(null);
    setOfflineFileMissing(false);

    if (rawId) {
      offlineStorageService
        .getOfflineMedia(rawId)
        .then(async (record) => {
          if (!record) {
            if (active) setCheckingOffline(false);
            return;
          }

          const resolvedUri = await offlineStorageService.resolveLocalUri(record);
          if (!active) return;

          if (resolvedUri) {
            setOfflineRecord({
              ...record,
              localPath: resolvedUri
            });
            setOfflineFileMissing(false);
          } else {
            // Keep the catalog metadata untouched, but never expose its stale
            // path as a playable source. Online streaming may still succeed.
            setOfflineRecord(null);
            setOfflineFileMissing(true);
          }
          setCheckingOffline(false);
        })
        .catch(() => {
          if (active) setCheckingOffline(false);
        });
    } else {
      setCheckingOffline(false);
    }
    return () => {
      active = false;
    };
  }, [rawId]);'''
player = replace_between(
    player,
    "  useEffect(() => {\n    let active = true;\n    if (rawId) {",
    "\n\n  // A downloaded copy is a fallback",
    new_effect,
)

player = replace_once(
    player,
    '  const isOfflineMode = Boolean(offlineRecord && (!shouldFetchOnline || isError));',
    '  const isOfflineMode = Boolean(offlineRecord && (!shouldFetchOnline || isError));\n  const showMissingOfflineFile = offlineFileMissing && (!shouldFetchOnline || isError);',
)
player = replace_once(
    player,
    '  if (!token && !offlineRecord) {',
    '  if (!token && !offlineRecord && !offlineFileMissing) {',
)
player = replace_once(
    player,
    '          {isOfflineMode ? t("downloads.missingFile") : t("player.mediaNotFoundTitle")}',
    '          {showMissingOfflineFile ? t("downloads.missingFile") : t("player.mediaNotFoundTitle")}',
)
player = replace_once(
    player,
    '          {isOfflineMode\n            ? t("downloads.orphanDesc")\n            : t("player.mediaNotFoundDesc")}',
    '          {showMissingOfflineFile\n            ? t("downloads.orphanDesc")\n            : t("player.mediaNotFoundDesc")}',
)
player_path.write_text(player)

# Add deterministic concurrency + URI resolution coverage.
test_path = Path("src/features/offline/__tests__/offlineStorage.test.ts")
test = test_path.read_text()
test = replace_once(
    test,
    'const TEST_SCOPE = { serverId: "server-test", userId: "user-test" };',
    '''const TEST_SCOPE = { serverId: "server-test", userId: "user-test" };\n\nfunction makeRecord(\n  itemId: string,\n  overrides: Partial<OfflineMediaRecord> = {}\n): OfflineMediaRecord {\n  return {\n    itemId,\n    title: `Title ${itemId}`,\n    type: "Movie",\n    localPath: `file:///mock-documents/finora_downloads/${itemId}.mp4`,\n    fileSizeBytes: 100,\n    totalTicks: 1000,\n    playbackPositionTicks: 0,\n    savedAt: Date.now(),\n    ...overrides\n  };\n}''',
)
test = replace_once(
    test,
    '  beforeEach(async () => {\n    await AsyncStorage.clear();\n    service = new OfflineStorageService(TEST_SCOPE);\n  });',
    '''  beforeEach(async () => {\n    await AsyncStorage.clear();\n    const FileSystem = require("expo-file-system/legacy");\n    FileSystem.__reset();\n    (FileSystem.deleteAsync as jest.Mock).mockClear();\n    (FileSystem.getInfoAsync as jest.Mock).mockClear();\n    service = new OfflineStorageService(TEST_SCOPE);\n  });''',
)

additional_tests = r'''

  it("serializes concurrent catalog inserts without lost updates", async () => {
    await Promise.all([
      service.saveOfflineMedia(makeRecord("record-a")),
      service.saveOfflineMedia(makeRecord("record-b")),
      service.saveOfflineMedia(makeRecord("record-c"))
    ]);

    const result = await service.getAllOfflineMedia();
    expect(result).toHaveLength(3);
    expect(result.map((item) => item.itemId)).toEqual(
      expect.arrayContaining(["record-a", "record-b", "record-c"])
    );
  });

  it("does not lose simultaneous mutations of different catalog items", async () => {
    await service.saveOfflineMedia(makeRecord("position-item"));
    await service.saveOfflineMedia(makeRecord("watched-item"));

    await Promise.all([
      service.updateLocalPlaybackPosition("position-item", 400),
      service.markAsWatched("watched-item")
    ]);

    const positionItem = await service.getOfflineMedia("position-item");
    const watchedItem = await service.getOfflineMedia("watched-item");
    expect(positionItem?.playbackPositionTicks).toBe(400);
    expect(watchedItem?.isPlayed).toBe(true);
  });

  it("keeps concurrent mutations isolated across different scopes", async () => {
    const scopeA = { serverId: "server-a", userId: "user-a" };
    const scopeB = { serverId: "server-b", userId: "user-b" };
    const serviceA = new OfflineStorageService(scopeA);
    const serviceB = new OfflineStorageService(scopeB);

    await Promise.all([
      serviceA.saveOfflineMedia(makeRecord("a-1")),
      serviceA.saveOfflineMedia(makeRecord("a-2")),
      serviceB.saveOfflineMedia(makeRecord("b-1")),
      serviceB.saveOfflineMedia(makeRecord("b-2"))
    ]);

    expect((await serviceA.getAllOfflineMedia()).map((item) => item.itemId).sort()).toEqual([
      "a-1",
      "a-2"
    ]);
    expect((await serviceB.getAllOfflineMedia()).map((item) => item.itemId).sort()).toEqual([
      "b-1",
      "b-2"
    ]);
  });

  it("retains all distinct concurrent progress sync entries", async () => {
    await Promise.all([
      service.enqueueProgressSync("sync-a", 100, false),
      service.enqueueProgressSync("sync-b", 200, false),
      service.enqueueProgressSync("sync-c", 300, true)
    ]);

    const entries = await service.getPendingSyncEntries();
    expect(entries).toHaveLength(3);
    expect(entries.map((entry) => entry.itemId)).toEqual(
      expect.arrayContaining(["sync-a", "sync-b", "sync-c"])
    );
  });

  it("keeps the catalog valid during a concurrent update and deletion", async () => {
    await service.saveOfflineMedia(makeRecord("keep-me"));
    await service.saveOfflineMedia(makeRecord("delete-me"));

    await Promise.all([
      service.updateLocalPlaybackPosition("keep-me", 700),
      service.deleteOfflineMedia("delete-me")
    ]);

    const raw = await AsyncStorage.getItem(getScopedOfflineCatalogKey(TEST_SCOPE));
    expect(raw).not.toBeNull();
    expect(() => JSON.parse(raw!)).not.toThrow();
    const parsed = JSON.parse(raw!) as OfflineMediaRecord[];
    expect(parsed.find((item) => item.itemId === "keep-me")?.playbackPositionTicks).toBe(700);
    expect(parsed.some((item) => item.itemId === "delete-me")).toBe(false);
  });

  it("resolveLocalUri returns a verified existing localPath", async () => {
    const FileSystem = require("expo-file-system/legacy");
    FileSystem.__setDefaultFileSize(null);
    const path = "file:///mock-documents/finora_downloads/existing.mp4";
    FileSystem.__setFileSize(path, 123);

    await expect(service.resolveLocalUri(makeRecord("existing", { localPath: path }))).resolves.toBe(
      path
    );
  });

  it("resolveLocalUri rebuilds a stale sandbox path when the reconstructed file exists", async () => {
    const FileSystem = require("expo-file-system/legacy");
    FileSystem.__setDefaultFileSize(null);
    const stalePath =
      "file:///old-sandbox/finora_downloads/server-test/user-test/rebuilt.mp4";
    const rebuiltPath =
      "file:///mock-documents/finora_downloads/server-test/user-test/rebuilt.mp4";
    FileSystem.__setFileSize(rebuiltPath, 123);

    await expect(
      service.resolveLocalUri(makeRecord("rebuilt", { localPath: stalePath }))
    ).resolves.toBe(rebuiltPath);
  });

  it("resolveLocalUri returns null when no physical candidate exists", async () => {
    const FileSystem = require("expo-file-system/legacy");
    FileSystem.__setDefaultFileSize(null);

    await expect(
      service.resolveLocalUri(
        makeRecord("missing", {
          localPath: "file:///old-sandbox/finora_downloads/server-test/user-test/missing.mp4"
        })
      )
    ).resolves.toBeNull();
  });
'''
last_close = test.rfind("\n});")
if last_close == -1:
    raise RuntimeError("Could not locate OfflineStorageService describe terminator")
test = test[:last_close] + additional_tests + test[last_close:]
test_path.write_text(test)

# Route-level regression: a stale catalog entry must never reach PlayerScreen as a file URI.
route_test_path = Path("src/app/player/__tests__/playerRouteOffline.test.tsx")
route_test_path.parent.mkdir(parents=True, exist_ok=True)
route_test_path.write_text(r'''import React from "react";
import ReactTestRenderer, { act } from "react-test-renderer";
import PlayerRoute from "../[id]";
import { offlineStorageService } from "../../../features/offline/offlineStorage";
import { OfflineMediaRecord } from "../../../features/offline/types";

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockSetQueriesData = jest.fn();
const mockInvalidateQueries = jest.fn();
const mockPlayerScreen = jest.fn(() => null);
const mockUseItemDetails = jest.fn();
const mockRestoreSession = jest.fn().mockResolvedValue(undefined);
let mockAuthState: any;

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "movie-1" }),
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
  Stack: { Screen: () => null }
}));

jest.mock("../../../stores/authStore", () => ({
  useAuthStore: (selector: any) => selector(mockAuthState)
}));

jest.mock("../../../hooks/useMediaQueries", () => ({
  useItemDetails: (...args: any[]) => mockUseItemDetails(...args),
  mediaKeys: { all: ["media"] }
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    setQueriesData: mockSetQueriesData,
    invalidateQueries: mockInvalidateQueries
  })
}));

jest.mock("../../../features/player/components/PlayerScreen", () => ({
  PlayerScreen: (props: any) => {
    mockPlayerScreen(props);
    return null;
  }
}));

jest.mock("../../../i18n", () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

jest.mock("../../../core/jellyfin/jellyfinClient", () => ({
  jellyfinClient: {
    getServerUrl: () => "https://jellyfin.example.com",
    getAuthToken: () => "token"
  }
}));

const offlineRecord: OfflineMediaRecord = {
  itemId: "movie-1",
  title: "Offline Movie",
  type: "Movie",
  localPath: "file:///stale/finora_downloads/movie-1.mp4",
  fileSizeBytes: 100,
  totalTicks: 1000,
  playbackPositionTicks: 0,
  savedAt: 1
};

const onlineItem = {
  id: "movie-1",
  name: "Online Movie",
  type: "Movie",
  genres: [],
  totalTicks: 1000,
  playbackPositionTicks: 0,
  playedPercentage: 0,
  isFavorite: false,
  isPlayed: false,
  mediaStreams: []
};

async function renderRoute() {
  let tree: any;
  await act(async () => {
    tree = ReactTestRenderer.create(<PlayerRoute />);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
  return tree;
}

describe("PlayerRoute offline fallback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState = {
      session: {
        userId: "user-1",
        serverId: "server-1",
        serverUrl: "https://jellyfin.example.com",
        token: "token"
      },
      status: "authenticated",
      restoreSession: mockRestoreSession
    };
    jest.spyOn(offlineStorageService, "getOfflineMedia").mockResolvedValue(offlineRecord);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("never sends a stale missing file URI to PlayerScreen", async () => {
    jest.spyOn(offlineStorageService, "resolveLocalUri").mockResolvedValue(null);
    mockUseItemDetails.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    const tree = await renderRoute();

    expect(mockPlayerScreen).not.toHaveBeenCalled();
    expect(tree.root.findByProps({ testID: "player-route-error" })).toBeTruthy();
  });

  it("keeps online streaming usable when the offline file is missing", async () => {
    jest.spyOn(offlineStorageService, "resolveLocalUri").mockResolvedValue(null);
    mockUseItemDetails.mockReturnValue({ data: onlineItem, isLoading: false, isError: false });

    await renderRoute();

    expect(mockPlayerScreen).toHaveBeenCalled();
    const props = mockPlayerScreen.mock.calls.at(-1)?.[0];
    expect(props.item).toEqual(onlineItem);
    expect(props.localPath).toBeUndefined();
  });

  it("uses a verified offline path when online playback is unavailable", async () => {
    const validPath = "file:///mock-documents/finora_downloads/movie-1.mp4";
    jest.spyOn(offlineStorageService, "resolveLocalUri").mockResolvedValue(validPath);
    mockUseItemDetails.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    await renderRoute();

    expect(mockPlayerScreen).toHaveBeenCalled();
    const props = mockPlayerScreen.mock.calls.at(-1)?.[0];
    expect(props.localPath).toBe(validPath);
  });
});
''')

print("Phase 1 files patched")
