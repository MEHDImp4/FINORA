import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { NativeModules } from "react-native";
import BackgroundService from "react-native-background-actions";
import {
  DownloadManager,
  DOWNLOAD_QUEUE_STORAGE_KEY
} from "../downloadManager";
import { offlineStorageService } from "../offlineStorage";
import { notificationService } from "../../../core/notifications/notificationService";
import { _resetForegroundServiceStateForTesting } from "../../../core/notifications/foregroundDownloadService";

const fileSystem = FileSystem as any;
const TICKS_PER_SECOND = 10_000_000;

function makeItem(itemId: string, transcode = false) {
  return {
    itemId,
    title: `Title ${itemId}`,
    type: "Movie" as const,
    downloadUrl: transcode
      ? `https://jellyfin.example.com/Videos/${itemId}/stream.mp4?static=false`
      : `https://jellyfin.example.com/Items/${itemId}/Download`,
    localPath: `file:///mock-documents/finora_downloads/${itemId}.mp4`
  };
}

async function settle() {
  for (let i = 0; i < 8; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe("DownloadManager — original vs transcode resume policy", () => {
  let manager: DownloadManager;

  beforeEach(async () => {
    DownloadManager.destroyAll();
    jest.clearAllMocks();
    await AsyncStorage.clear();
    fileSystem.__reset();
    fileSystem.__setDefaultFileSize(null);
    _resetForegroundServiceStateForTesting();

    (NativeModules as any).RNBackgroundActions = {};
    (BackgroundService.isRunning as jest.Mock).mockReturnValue(true);
    (BackgroundService.start as jest.Mock).mockResolvedValue(undefined);
    (BackgroundService.stop as jest.Mock).mockResolvedValue(undefined);
    (BackgroundService.updateNotification as jest.Mock).mockResolvedValue(undefined);

    jest
      .spyOn(notificationService, "notifyDownloadComplete")
      .mockResolvedValue(null);
    jest.spyOn(offlineStorageService, "saveOfflineMedia");

    manager = new DownloadManager();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    DownloadManager.destroyAll();
  });

  it("resumes an original-file partial with an Android byte offset", async () => {
    const item = makeItem("original-resume");
    fileSystem.__setFileSize(item.localPath, 200_000_000);

    await manager.startDownload(item, undefined, {
      headers: { "X-Emby-Token": "test-token" },
      quality: "original"
    });
    await settle();

    const tasks = fileSystem.__getDownloadTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].resumeData).toBe("200000000");
  });

  it("never passes resumeData for a transcoded download and discards an old partial", async () => {
    const item = makeItem("transcode-no-range", true);
    fileSystem.__setFileSize(item.localPath, 600_000_000);

    await manager.startDownload(
      item,
      { totalTicks: 3600 * TICKS_PER_SECOND },
      {
        headers: { "X-Emby-Token": "test-token" },
        quality: "720p"
      }
    );
    await settle();

    const tasks = fileSystem.__getDownloadTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].resumeData).toBeUndefined();
    expect(fileSystem.deleteAsync).toHaveBeenCalledWith(
      item.localPath,
      { idempotent: true }
    );
    expect(manager.getDownload(item.itemId)?.bytesDownloaded).toBe(0);
  });

  it("keeps a transcode below 100 percent when received bytes exceed the estimate", async () => {
    const item = makeItem("transcode-estimate", true);

    await manager.startDownload(
      item,
      { totalTicks: 3600 * TICKS_PER_SECOND },
      {
        headers: { "X-Emby-Token": "test-token" },
        quality: "720p"
      }
    );
    await settle();

    const before = manager.getDownload(item.itemId);
    const estimate = before?.expectedBytes ?? 0;
    expect(estimate).toBeGreaterThan(0);

    manager.updateProgress(item.itemId, Math.round(estimate * 1.5), -1);

    const download = manager.getDownload(item.itemId);
    expect(download?.status).toBe("downloading");
    expect(download?.totalBytes).toBe(0);
    expect(download?.isEstimatedTotal).toBe(true);
    expect(download?.progress).toBe(0.95);
  });

  it("accepts the real final transcode size even when it differs from the estimate", async () => {
    const item = makeItem("transcode-final-size", true);

    await manager.startDownload(
      item,
      { totalTicks: 3600 * TICKS_PER_SECOND },
      {
        headers: { "X-Emby-Token": "test-token" },
        quality: "720p"
      }
    );
    await settle();

    const estimate = manager.getDownload(item.itemId)?.expectedBytes ?? 0;
    const actualSize = Math.max(estimate + 300_000_000, 1_200_000_000);
    fileSystem.__setFileSize(item.localPath, actualSize);

    await fileSystem.__completeTask(item.localPath, {
      writtenBytes: actualSize,
      totalBytes: -1,
      status: 200
    });
    await settle();

    const download = manager.getDownload(item.itemId);
    expect(download?.status).toBe("completed");
    expect(download?.bytesDownloaded).toBe(actualSize);
    expect(download?.totalBytes).toBe(actualSize);
    expect(download?.progress).toBe(1);
  });

  it("discards a persisted transcoded partial after process death instead of restoring a Range offset", async () => {
    const item = makeItem("transcode-restore", true);
    fileSystem.__setFileSize(item.localPath, 600_000_000);

    await AsyncStorage.setItem(
      DOWNLOAD_QUEUE_STORAGE_KEY,
      JSON.stringify([
        {
          itemId: item.itemId,
          title: item.title,
          type: item.type,
          downloadUrl: item.downloadUrl,
          localPath: item.localPath,
          status: "downloading",
          progress: 0.8,
          bytesDownloaded: 600_000_000,
          totalBytes: 0,
          expectedBytes: 750_000_000,
          quality: "720p",
          startedAt: Date.now() - 10_000
        }
      ])
    );

    await manager.restorePersistedDownloads();

    const restored = manager.getDownload(item.itemId);
    expect(restored?.status).toBe("queued");
    expect(restored?.bytesDownloaded).toBe(0);
    expect(restored?.totalBytes).toBe(0);
    expect(restored?.progress).toBe(0);
    expect(fileSystem.deleteAsync).toHaveBeenCalledWith(
      item.localPath,
      { idempotent: true }
    );
  });

  it("restarts an original download once from zero when the server ignores Range with HTTP 200", async () => {
    const item = makeItem("original-range-ignored");
    fileSystem.__setFileSize(item.localPath, 250_000_000);

    await manager.startDownload(item, undefined, {
      headers: { "X-Emby-Token": "test-token" },
      quality: "original"
    });
    await settle();

    expect(fileSystem.__getDownloadTasks()[0].resumeData).toBe("250000000");

    await fileSystem.__completeTask(item.localPath, {
      writtenBytes: 750_000_000,
      totalBytes: 1_000_000_000,
      status: 200
    });
    await settle();

    const tasks = fileSystem.__getDownloadTasks();
    expect(tasks).toHaveLength(2);
    expect(tasks[1].resumeData).toBeUndefined();
    expect(manager.getDownload(item.itemId)?.status).toBe("downloading");
    expect(manager.getDownload(item.itemId)?.bytesDownloaded).toBe(0);
  });

  it("retries a failed transcode from zero and never appends onto its partial", async () => {
    const item = makeItem("transcode-retry", true);

    await manager.startDownload(
      item,
      { totalTicks: 1800 * TICKS_PER_SECOND },
      {
        headers: { "X-Emby-Token": "test-token" },
        quality: "720p"
      }
    );
    await settle();

    await fileSystem.__completeTask(item.localPath, {
      writtenBytes: 300_000_000,
      totalBytes: -1,
      status: 503
    });
    await settle();
    expect(manager.getDownload(item.itemId)?.status).toBe("failed");

    fileSystem.__setFileSize(item.localPath, 300_000_000);
    await manager.retryDownload(item.itemId);
    await settle();

    const tasks = fileSystem.__getDownloadTasks();
    const retryTask = tasks[tasks.length - 1];
    expect(retryTask.resumeData).toBeUndefined();
    expect(manager.getDownload(item.itemId)?.bytesDownloaded).toBe(0);
    expect(manager.getDownload(item.itemId)?.status).toBe("downloading");
  });
});
