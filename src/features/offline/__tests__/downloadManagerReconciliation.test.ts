import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { DownloadManager } from "../downloadManager";
import { offlineStorageService } from "../offlineStorage";
import {
  DEFAULT_PLAYBACK_PREFERENCES,
  usePlaybackPreferencesStore
} from "../../../stores/playbackPreferencesStore";

const fileSystem = FileSystem as any;
const GB = 1024 * 1024 * 1024;

async function settle() {
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function persistedEntry(overrides: Record<string, unknown>) {
  return {
    itemId: "item-1",
    title: "Item",
    type: "Movie",
    downloadUrl: "https://server/Items/item-1/Download",
    localPath: "file:///dl/item-1.mp4",
    status: "downloading",
    progress: 0.5,
    bytesDownloaded: 0,
    totalBytes: 0,
    startedAt: Date.now() - 1000,
    ...overrides
  };
}

describe("DWN-02 completed transcode restart reconciliation", () => {
  let manager: DownloadManager;

  beforeEach(async () => {
    DownloadManager.destroyAll();
    jest.clearAllMocks();
    await AsyncStorage.clear();
    fileSystem.__reset();
    usePlaybackPreferencesStore.setState({
      preferences: { ...DEFAULT_PLAYBACK_PREFERENCES, downloadWifiOnly: false },
      isLoaded: true
    });
    manager = new DownloadManager();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    DownloadManager.destroyAll();
  });

  it("reconciles a completed transcode (totalBytes=0, expectedBytes=X) without re-downloading", async () => {
    const localPath = "file:///dl/transcode.mp4";
    fileSystem.__setFileSize(localPath, 1000);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify([persistedEntry({ localPath, expectedBytes: 1000, progress: 1 })])
    );

    await manager.restorePersistedDownloads();

    // Completed: not tracked as pending work, no transfer, no deletion.
    expect(manager.getDownload("item-1")).toBeUndefined();
    expect(FileSystem.createDownloadResumable).not.toHaveBeenCalled();
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  });

  it("keeps a genuinely partial transcode resumable on restart", async () => {
    const localPath = "file:///dl/partial.mp4";
    fileSystem.__setFileSize(localPath, 400);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify([persistedEntry({ localPath, expectedBytes: 1000, progress: 0.4 })])
    );

    await manager.restorePersistedDownloads();

    const item = manager.getDownload("item-1");
    expect(item).toBeDefined();
    expect(item?.status).toBe("queued");
    expect(item?.progress).toBeCloseTo(0.4, 5);
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  });
});

describe("DWN-05 transactional completion and delete race", () => {
  let manager: DownloadManager;

  beforeEach(async () => {
    DownloadManager.destroyAll();
    jest.clearAllMocks();
    await AsyncStorage.clear();
    fileSystem.__reset();
    fileSystem.__setFreeDiskStorage(10 * GB);
    usePlaybackPreferencesStore.setState({
      preferences: { ...DEFAULT_PLAYBACK_PREFERENCES, downloadWifiOnly: false },
      isLoaded: true
    });
    manager = new DownloadManager();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    DownloadManager.destroyAll();
  });

  async function startTransfer(itemId: string, localPath: string) {
    await manager.startDownload(
      {
        itemId,
        title: `Title ${itemId}`,
        type: "Movie",
        downloadUrl: `https://server/Items/${itemId}/Download`,
        localPath
      },
      undefined,
      { headers: { "X-Emby-Token": "t" } }
    );
    await settle();
    return localPath;
  }

  it("never marks a download completed when the offline catalog write fails", async () => {
    const localPath = await startTransfer("movie-catalog-fail", "file:///dl/catalog.mp4");
    jest
      .spyOn(offlineStorageService, "saveOfflineMedia")
      .mockRejectedValueOnce(new Error("catalog write failed"));

    await fileSystem.__completeTask(localPath, { status: 206, uri: localPath });
    await settle();

    const item = manager.getDownload("movie-catalog-fail");
    expect(item?.status).toBe("failed");
    expect(item?.status).not.toBe("completed");
  });

  it("discards a completion that races with a user delete (no resurrected catalog)", async () => {
    const localPath = await startTransfer("movie-delete-race", "file:///dl/race.mp4");

    let resolveSave: (() => void) | undefined;
    jest
      .spyOn(offlineStorageService, "saveOfflineMedia")
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveSave = resolve;
          })
      );
    const deleteSpy = jest
      .spyOn(offlineStorageService, "deleteOfflineMedia")
      .mockResolvedValue();

    // Begin finalization, then delete while the catalog write is in flight.
    await fileSystem.__completeTask(localPath, { status: 206, uri: localPath });
    await manager.cancelDownload("movie-delete-race");

    resolveSave?.();
    await settle();

    const item = manager.getDownload("movie-delete-race");
    expect(item).toBeUndefined();
    expect(item?.status).not.toBe("completed");
    // The stale catalog entry written during finalization is rolled back.
    expect(deleteSpy).toHaveBeenCalled();
    expect(deleteSpy.mock.calls[0][0]).toBe("movie-delete-race");
    // The partial file is removed by the delete.
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(localPath, { idempotent: true });
  });
});
