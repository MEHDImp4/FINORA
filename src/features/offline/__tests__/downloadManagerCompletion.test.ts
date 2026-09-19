import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { AppState, AppStateStatus, NativeModules } from "react-native";
import BackgroundService from "react-native-background-actions";
import { DownloadManager, DOWNLOAD_QUEUE_STORAGE_KEY } from "../downloadManager";
import { offlineStorageService } from "../offlineStorage";
import { notificationService } from "../../../core/notifications/notificationService";
import { _resetForegroundServiceStateForTesting } from "../../../core/notifications/foregroundDownloadService";

const fileSystem = FileSystem as any;

/** Matches the default file size reported by the shared expo-file-system mock. */
const SIZE = 500_000_000;

function makeItem(itemId: string) {
  return {
    itemId,
    title: `Title ${itemId}`,
    type: "Movie" as const,
    downloadUrl: `https://jellyfin.example.com/Items/${itemId}/Download`,
    localPath: `file:///mock-documents/finora_downloads/${itemId}.mp4`
  };
}

/** Lets the fire-and-forget promise chains inside the manager settle. */
async function settle() {
  for (let i = 0; i < 8; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/** Starts a download with in-memory auth headers (no secure-store dependency). */
async function startWithHeaders(manager: DownloadManager, itemId: string) {
  const item = makeItem(itemId);
  const result = await manager.startDownload(item, undefined, {
    headers: { "X-Emby-Token": "test-token" }
  });
  await settle();
  return { item, result };
}

describe("DownloadManager — completion & background lifecycle regressions", () => {
  let manager: DownloadManager;
  let notifySpy: jest.Mock;
  let saveSpy: jest.SpyInstance;
  let deleteSpy: jest.SpyInstance;

  beforeEach(async () => {
    DownloadManager.destroyAll();
    jest.clearAllMocks();
    await AsyncStorage.clear();
    fileSystem.__reset();
    _resetForegroundServiceStateForTesting();

    (NativeModules as any).RNBackgroundActions = {};
    (BackgroundService.isRunning as jest.Mock).mockReturnValue(true);
    (BackgroundService.start as jest.Mock).mockResolvedValue(undefined);
    (BackgroundService.stop as jest.Mock).mockResolvedValue(undefined);
    (BackgroundService.updateNotification as jest.Mock).mockResolvedValue(undefined);

    notifySpy = jest
      .spyOn(notificationService, "notifyDownloadComplete")
      .mockResolvedValue(null) as unknown as jest.Mock;
    saveSpy = jest.spyOn(offlineStorageService, "saveOfflineMedia");
    deleteSpy = jest.spyOn(offlineStorageService, "deleteOfflineMedia");

    manager = new DownloadManager();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    DownloadManager.destroyAll();
  });

  it("keeps status downloading at 50 % progress", async () => {
    const { result } = await startWithHeaders(manager, "prog-50");
    manager.updateProgress("prog-50", SIZE / 2, SIZE);

    const item = manager.getDownload("prog-50");
    expect(item?.progress).toBe(0.5);
    expect(item?.status).toBe("downloading");
    expect(result.status).toBe("downloading");
  });

  it("never sets completed or completedAt at 100 % progress", async () => {
    await startWithHeaders(manager, "prog-100");
    manager.updateProgress("prog-100", SIZE, SIZE);

    const item = manager.getDownload("prog-100");
    expect(item?.progress).toBe(0.99);
    expect(item?.status).toBe("downloading");
    expect(item?.completedAt).toBeUndefined();
  });

  it("emits no success notification when progress equals total", async () => {
    await startWithHeaders(manager, "prog-notify");
    manager.updateProgress("prog-notify", SIZE, SIZE);
    await settle();

    expect(notifySpy).not.toHaveBeenCalled();
  });

  it("stays unfinished when progress hits 100 % but downloadAsync is still pending", async () => {
    await startWithHeaders(manager, "prog-pending");
    manager.updateProgress("prog-pending", SIZE, SIZE);
    await settle();

    const item = manager.getDownload("prog-pending");
    expect(item?.status).toBe("downloading");
    expect(item?.completedAt).toBeUndefined();
    // The native transfer has not resolved yet.
    expect(fileSystem.__getPendingCount()).toBeGreaterThan(0);
  });

  it("finalizes then completes only after downloadAsync resolves with a valid file", async () => {
    const { item } = await startWithHeaders(manager, "valid");
    manager.updateProgress("valid", SIZE, SIZE);
    await fileSystem.__completeTask(item.localPath, {
      writtenBytes: SIZE,
      totalBytes: SIZE,
      status: 206
    });
    await settle();

    const download = manager.getDownload("valid");
    expect(download?.status).toBe("completed");
    expect(download?.completedAt).toBeDefined();
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(notifySpy).toHaveBeenCalledTimes(1);
  });

  it("fails (never completes) when the file is absent after resolution", async () => {
    const { item } = await startWithHeaders(manager, "missing");
    manager.updateProgress("missing", SIZE, SIZE);
    fileSystem.__removeFile(item.localPath);
    await fileSystem.__completeTask(item.localPath, {
      writtenBytes: SIZE,
      totalBytes: SIZE,
      status: 206
    });
    await settle();

    const download = manager.getDownload("missing");
    expect(download?.status).toBe("failed");
    expect(download?.status).not.toBe("completed");
    expect(saveSpy).not.toHaveBeenCalled();
    expect(notifySpy).not.toHaveBeenCalled();
  });

  it("fails when the file is smaller than the expected size", async () => {
    const { item } = await startWithHeaders(manager, "short");
    manager.updateProgress("short", 100_000_000, 1_000_000_000);
    fileSystem.__setFileSize(item.localPath, 100_000_000);
    await fileSystem.__completeTask(item.localPath, {
      writtenBytes: 100_000_000,
      totalBytes: 1_000_000_000,
      status: 206
    });
    await settle();

    const download = manager.getDownload("short");
    expect(download?.status).toBe("failed");
    expect(notifySpy).not.toHaveBeenCalled();
  });

  it("fails (never completes) when the offline catalog save fails", async () => {
    saveSpy.mockRejectedValueOnce(new Error("database locked"));
    const { item } = await startWithHeaders(manager, "catalog-fail");
    manager.updateProgress("catalog-fail", SIZE, SIZE);
    await fileSystem.__completeTask(item.localPath, {
      writtenBytes: SIZE,
      totalBytes: SIZE,
      status: 206
    });
    await settle();

    const download = manager.getDownload("catalog-fail");
    expect(download?.status).toBe("failed");
    expect(download?.status).not.toBe("completed");
    expect(notifySpy).not.toHaveBeenCalled();
  });

  it("never completes when the item is cancelled during finalizing", async () => {
    let resolveSave: () => void = () => {};
    const savePromise = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    saveSpy.mockReturnValueOnce(savePromise);

    const { item } = await startWithHeaders(manager, "cancel-finalizing");
    manager.updateProgress("cancel-finalizing", SIZE, SIZE);
    await fileSystem.__completeTask(item.localPath, {
      writtenBytes: SIZE,
      totalBytes: SIZE,
      status: 206
    });
    await settle();

    // The transaction is parked in `finalizing` while the catalog write is slow.
    expect(manager.getDownload("cancel-finalizing")?.status).toBe("finalizing");

    await manager.cancelDownload("cancel-finalizing");
    resolveSave();
    await settle();

    expect(manager.getDownload("cancel-finalizing")).toBeUndefined();
    expect(notifySpy).not.toHaveBeenCalled();
    expect(deleteSpy).toHaveBeenCalled();
  });

  it("never completes when the item is removed during finalizing", async () => {
    let resolveSave: () => void = () => {};
    const savePromise = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    saveSpy.mockReturnValueOnce(savePromise);

    const { item } = await startWithHeaders(manager, "removed-finalizing");
    manager.updateProgress("removed-finalizing", SIZE, SIZE);
    await fileSystem.__completeTask(item.localPath, {
      writtenBytes: SIZE,
      totalBytes: SIZE,
      status: 206
    });
    await settle();

    await manager.cancelDownload("removed-finalizing");
    resolveSave();
    await settle();

    expect(manager.getDownload("removed-finalizing")).toBeUndefined();
    expect(notifySpy).not.toHaveBeenCalled();
  });

  it("does not create a second native task when a download is retried", async () => {
    const { item } = await startWithHeaders(manager, "retry-single");
    const taskCountBefore = fileSystem.__getDownloadTasks().length;

    // A duplicate start on an already-active download must reuse it.
    await manager.startDownload(item, undefined, {
      headers: { "X-Emby-Token": "test-token" }
    });
    await settle();
    expect(fileSystem.__getDownloadTasks().length).toBe(taskCountBefore);

    // Fail, then retry: still exactly one active task for the item.
    manager.updateProgress("retry-single", SIZE, SIZE);
    await fileSystem.__completeTask(item.localPath, {
      writtenBytes: SIZE,
      totalBytes: SIZE,
      status: 500
    });
    await settle();
    expect(manager.getDownload("retry-single")?.status).toBe("failed");

    await manager.retryDownload("retry-single");
    await settle();
    expect(manager.getDownload("retry-single")?.status).toBe("downloading");

    // Only one manager-owned task reference can exist; a repeat start is a no-op.
    const after = fileSystem.__getDownloadTasks().length;
    await manager.startDownload(item, undefined, {
      headers: { "X-Emby-Token": "test-token" }
    });
    await settle();
    expect(fileSystem.__getDownloadTasks().length).toBe(after);
  });

  it("does not change a downloading item when the app goes to background", async () => {
    let appStateListener: ((state: AppStateStatus) => void) | null = null;
    jest.spyOn(AppState, "addEventListener").mockImplementation(((_event: string, cb: any) => {
      appStateListener = cb as (state: AppStateStatus) => void;
      return { remove: jest.fn() };
    }) as any);

    await startWithHeaders(manager, "bg-state");
    (manager as any).attachAppStateListener();
    manager.updateProgress("bg-state", SIZE / 2, SIZE);

    appStateListener!("background");
    await settle();
    expect(manager.getDownload("bg-state")?.status).toBe("downloading");

    appStateListener!("inactive");
    await settle();
    expect(manager.getDownload("bg-state")?.status).toBe("downloading");

    appStateListener!("active");
    await settle();
    expect(manager.getDownload("bg-state")?.status).toBe("downloading");
  });

  it("keeps the foreground service alive through finalizing and stops after completion", async () => {
    let resolveSave: () => void = () => {};
    const savePromise = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    saveSpy.mockReturnValueOnce(savePromise);

    const { item } = await startWithHeaders(manager, "fg");
    await settle();
    expect(BackgroundService.start).toHaveBeenCalled();

    manager.updateProgress("fg", SIZE, SIZE);
    await fileSystem.__completeTask(item.localPath, {
      writtenBytes: SIZE,
      totalBytes: SIZE,
      status: 206
    });
    await settle();

    // Still finalizing: the service must NOT be stopped.
    expect(manager.getDownload("fg")?.status).toBe("finalizing");
    expect(BackgroundService.stop).not.toHaveBeenCalled();

    resolveSave();
    await settle();

    expect(manager.getDownload("fg")?.status).toBe("completed");
    expect(BackgroundService.stop).toHaveBeenCalled();
  });

  it("stops the foreground service after the last item is cancelled", async () => {
    await startWithHeaders(manager, "fg-cancel");
    await settle();
    expect(BackgroundService.start).toHaveBeenCalled();

    await manager.cancelDownload("fg-cancel");
    await settle();
    expect(BackgroundService.stop).toHaveBeenCalled();
  });

  it("requeues a download that was persisted mid-finalization (restore)", async () => {
    const item = makeItem("restored-finalizing");
    fileSystem.__setFileSize(item.localPath, 200_000_000);
    await AsyncStorage.setItem(
      DOWNLOAD_QUEUE_STORAGE_KEY,
      JSON.stringify([
        {
          itemId: item.itemId,
          title: "Restored Finalizing",
          type: "Movie",
          downloadUrl: item.downloadUrl,
          localPath: item.localPath,
          status: "finalizing",
          progress: 1,
          bytesDownloaded: 1_000_000_000,
          totalBytes: 1_000_000_000,
          startedAt: Date.now() - 10_000
        }
      ])
    );

    const restored = new DownloadManager();
    await restored.restorePersistedDownloads();

    // A crashed finalization is pending work: it is requeued for re-verification,
    // never restored as completed.
    const restoredItem = restored.getDownload("restored-finalizing");
    expect(restoredItem).toBeDefined();
    expect(restoredItem?.status).toBe("queued");
    expect(restoredItem?.completedAt).toBeUndefined();

    restored.destroy();
  });

  it("fails (never completes) when 100 % progress is followed by a network error", async () => {
    const { item } = await startWithHeaders(manager, "fake-100");
    manager.updateProgress("fake-100", SIZE, SIZE);
    await fileSystem.__completeTask(item.localPath, {
      writtenBytes: SIZE,
      totalBytes: SIZE,
      status: 503
    });
    await settle();

    const download = manager.getDownload("fake-100");
    expect(download?.status).toBe("failed");
    expect(download?.status).not.toBe("completed");
    expect(download?.completedAt).toBeUndefined();
    expect(notifySpy).not.toHaveBeenCalled();
  });

  it("emits the success notification exactly once (sequential + concurrent)", async () => {
    await startWithHeaders(manager, "once");
    await manager.completeDownload("once", SIZE);
    await settle();
    expect(notifySpy).toHaveBeenCalledTimes(1);

    // A second sequential request is an idempotent no-op.
    await manager.completeDownload("once", SIZE);
    await settle();
    expect(notifySpy).toHaveBeenCalledTimes(1);
    expect(manager.getDownload("once")?.status).toBe("completed");
  });

  it("emits the success notification exactly once for concurrent completion requests", async () => {
    let resolveSave: () => void = () => {};
    const savePromise = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    saveSpy.mockReturnValueOnce(savePromise);

    await startWithHeaders(manager, "once-concurrent");
    const first = manager.completeDownload("once-concurrent", SIZE);
    const second = manager.completeDownload("once-concurrent", SIZE);
    resolveSave();
    await first;
    await second;
    await settle();

    expect(notifySpy).toHaveBeenCalledTimes(1);
    expect(manager.getDownload("once-concurrent")?.status).toBe("completed");
  });
});
