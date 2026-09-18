import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import {
  OfflineStorageService,
  getScopedOfflineCatalogKey,
  getScopedOfflineSyncQueueKey
} from "../offlineStorage";
import { OfflineMediaRecord } from "../types";

const fileSystem = FileSystem as any;
const TEST_SCOPE = { serverId: "server-test", userId: "user-test" };
const ACTIVE_SESSION_STORAGE_KEY = "finora_active_session";
const DOCS = "file:///mock-documents/";

let originalGetInfo: ((...args: unknown[]) => unknown) | undefined;

function record(overrides: Partial<OfflineMediaRecord> = {}): OfflineMediaRecord {
  return {
    itemId: "item-1",
    title: "Item",
    type: "Movie",
    localPath: `${DOCS}finora_downloads/server-test/user-test/item-1.mp4`,
    fileSizeBytes: 100,
    totalTicks: 1000,
    playbackPositionTicks: 0,
    savedAt: Date.now(),
    ...overrides
  };
}

describe("DWN-05 conservative orphan cleanup", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    originalGetInfo = (FileSystem.getInfoAsync as jest.Mock).getMockImplementation();
    (FileSystem.deleteAsync as jest.Mock).mockClear();
  });

  afterEach(() => {
    if (originalGetInfo) {
      (FileSystem.getInfoAsync as jest.Mock).mockImplementation(originalGetInfo);
    }
  });

  it("only deletes files in known scopes or the unscoped root", async () => {
    const service = new OfflineStorageService();
    // One known account is active.
    await AsyncStorage.setItem(
      ACTIVE_SESSION_STORAGE_KEY,
      JSON.stringify({ serverId: "server-test", userId: "user-test" })
    );

    (FileSystem.getInfoAsync as jest.Mock).mockImplementation(async (p: string) => {
      if (p.endsWith(".mp4")) {
        return { exists: true, isDirectory: false, size: 10, modificationTime: 0 };
      }
      return { exists: true, isDirectory: true, modificationTime: 0 };
    });
    (FileSystem.readDirectoryAsync as jest.Mock)
      .mockResolvedValueOnce(["orphan-root.mp4", "server-test", "unknown-server"])
      .mockResolvedValueOnce(["user-test"])
      .mockResolvedValueOnce(["known-orphan.mp4"])
      .mockResolvedValueOnce(["user-x"])
      .mockResolvedValueOnce(["foreign.mp4"]);

    const deleted = await service.cleanupOrphanDiskFiles();

    expect(deleted).toBe(2);
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      `${DOCS}finora_downloads/orphan-root.mp4`,
      { idempotent: true }
    );
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      `${DOCS}finora_downloads/server-test/user-test/known-orphan.mp4`,
      { idempotent: true }
    );
    expect(FileSystem.deleteAsync).not.toHaveBeenCalledWith(
      `${DOCS}finora_downloads/unknown-server/user-x/foreign.mp4`,
      { idempotent: true }
    );
  });

  it("never deletes a recently modified file that may still be finalizing", async () => {
    const service = new OfflineStorageService();
    await AsyncStorage.setItem(
      ACTIVE_SESSION_STORAGE_KEY,
      JSON.stringify({ serverId: "server-test", userId: "user-test" })
    );

    (FileSystem.getInfoAsync as jest.Mock).mockImplementation(async (p: string) => {
      if (p.endsWith(".mp4")) {
        return { exists: true, isDirectory: false, size: 10, modificationTime: Date.now() };
      }
      return { exists: true, isDirectory: true, modificationTime: Date.now() };
    });
    (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValueOnce(["fresh-orphan.mp4"]);

    const deleted = await service.cleanupOrphanDiskFiles();
    expect(deleted).toBe(0);
  });
});

describe("Account removal storage purge", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    (FileSystem.deleteAsync as jest.Mock).mockClear();
  });

  it("purgeScope removes the scoped catalog, sync queue and files", async () => {
    const service = new OfflineStorageService(TEST_SCOPE);
    await service.saveOfflineMedia(record());
    await service.enqueueProgressSync("item-1", 100, false);

    expect(await AsyncStorage.getItem(getScopedOfflineCatalogKey(TEST_SCOPE))).not.toBeNull();
    expect(
      await AsyncStorage.getItem(getScopedOfflineSyncQueueKey(TEST_SCOPE))
    ).not.toBeNull();

    await service.purgeScope(TEST_SCOPE);

    expect(await AsyncStorage.getItem(getScopedOfflineCatalogKey(TEST_SCOPE))).toBeNull();
    expect(await AsyncStorage.getItem(getScopedOfflineSyncQueueKey(TEST_SCOPE))).toBeNull();
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      `${DOCS}finora_downloads/server-test/user-test/`,
      { idempotent: true }
    );
  });
});
