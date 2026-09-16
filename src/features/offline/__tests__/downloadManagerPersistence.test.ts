import AsyncStorage from "@react-native-async-storage/async-storage";
import { DownloadManager, MAX_CONCURRENT_DOWNLOADS, DOWNLOAD_QUEUE_STORAGE_KEY } from "../downloadManager";

const MOCK_ITEM = {
  itemId: "movie-persist-1",
  title: "Dune: Part Two",
  type: "Movie" as const,
  year: 2024,
  downloadUrl: "https://jellyfin.example.com/Videos/movie-persist-1/stream.mp4",
  localPath: "file:///data/user/0/com.finora.app/finora_downloads/movie-persist-1.mp4"
};

describe("DownloadManager — persistence", () => {
  let manager: DownloadManager;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset AsyncStorage mock state
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    manager = new DownloadManager();
  });

  it("persists queue to AsyncStorage after starting a download", async () => {
    await manager.startDownload(MOCK_ITEM);

    // Allow the debounced persist to fire
    await new Promise((r) => setTimeout(r, 300));

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      DOWNLOAD_QUEUE_STORAGE_KEY,
      expect.any(String)
    );

    const [, payload] = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
      ([key]) => key === DOWNLOAD_QUEUE_STORAGE_KEY
    );
    const entries = JSON.parse(payload);
    expect(entries.length).toBe(1);
    expect(entries[0].itemId).toBe("movie-persist-1");
    expect(entries[0].title).toBe("Dune: Part Two");
  });

  it("does NOT persist authentication tokens in the queue", async () => {
    const itemWithToken = {
      ...MOCK_ITEM,
      downloadUrl:
        "https://jellyfin.example.com/Videos/movie-persist-1/stream.mp4?api_key=supersecrettoken123"
    };

    await manager.startDownload(itemWithToken, undefined, {
      headers: { "X-Emby-Token": "supersecrettoken123" }
    });

    await new Promise((r) => setTimeout(r, 300));

    const [, payload] = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
      ([key]) => key === DOWNLOAD_QUEUE_STORAGE_KEY
    );
    const entries = JSON.parse(payload);

    // Token must not appear anywhere in the persisted payload
    expect(JSON.stringify(entries)).not.toContain("supersecrettoken123");
    // URL must have api_key stripped
    expect(entries[0].downloadUrl).not.toContain("api_key");
  });

  it("restores paused/failed downloads from AsyncStorage on app restart", async () => {
    const persisted = [
      {
        itemId: "ep-restore-1",
        title: "Severance S02E01",
        type: "Episode",
        year: 2025,
        downloadUrl: "https://jellyfin.example.com/Videos/ep-restore-1/stream.mp4",
        localPath: "file:///data/finora_downloads/ep-restore-1.mp4",
        status: "paused",
        progress: 0.46,
        bytesDownloaded: 460000000,
        totalBytes: 1000000000,
        startedAt: Date.now() - 60000
      },
      {
        itemId: "ep-restore-2",
        title: "Severance S02E02",
        type: "Episode",
        downloadUrl: "https://jellyfin.example.com/Videos/ep-restore-2/stream.mp4",
        localPath: "file:///data/finora_downloads/ep-restore-2.mp4",
        status: "failed",
        progress: 0.1,
        bytesDownloaded: 100000,
        totalBytes: 1000000000,
        error: "Network error",
        startedAt: Date.now() - 120000
      }
    ];

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(persisted));

    await manager.restorePersistedDownloads();

    const restored1 = manager.getDownload("ep-restore-1");
    const restored2 = manager.getDownload("ep-restore-2");

    expect(restored1).toBeDefined();
    expect(restored1?.title).toBe("Severance S02E01");
    expect(restored1?.status).toBe("paused");
    // Progress may be recalculated from actual file bytes on disk — check it's a reasonable value
    expect(restored1?.progress).toBeGreaterThan(0);
    expect(restored1?.progress).toBeLessThanOrEqual(1);

    expect(restored2).toBeDefined();
    expect(restored2?.status).toBe("failed");
    expect(restored2?.error).toBe("Network error");
  });

  it("requeues a 'downloading' download for continuation on restore (process was killed mid-download)", async () => {
    const persisted = [
      {
        itemId: "movie-was-downloading",
        title: "Oppenheimer",
        type: "Movie",
        downloadUrl: "https://jellyfin.example.com/Videos/oph/stream.mp4",
        localPath: "file:///data/finora_downloads/oph.mp4",
        status: "downloading",
        progress: 0.67,
        bytesDownloaded: 670000000,
        totalBytes: 1000000000,
        startedAt: Date.now() - 300000
      }
    ];

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(persisted));

    await manager.restorePersistedDownloads();

    const item = manager.getDownload("movie-was-downloading");
    // Must never still claim "downloading" when no task exists after a kill, and
    // must be scheduled for continuation rather than silently reset to paused.
    expect(item?.status).toBe("queued");
    expect(manager.getQueueLength()).toBe(1);
  });

  it("keeps a 'queued' download queued on restore", async () => {
    const persisted = [
      {
        itemId: "movie-was-queued",
        title: "Interstellar",
        type: "Movie",
        downloadUrl: "https://jellyfin.example.com/Videos/inter/stream.mp4",
        localPath: "file:///data/finora_downloads/inter.mp4",
        status: "queued",
        progress: 0,
        bytesDownloaded: 0,
        totalBytes: 1000000000,
        startedAt: Date.now()
      }
    ];

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(persisted));

    await manager.restorePersistedDownloads();

    const item = manager.getDownload("movie-was-queued");
    expect(item?.status).toBe("queued");
    expect(manager.getQueueLength()).toBe(1);
  });

  it("does NOT restore completed downloads (they have no pending work)", async () => {
    const persisted = [
      {
        itemId: "movie-already-done",
        title: "La La Land",
        type: "Movie",
        downloadUrl: "https://jellyfin.example.com/Videos/lll/stream.mp4",
        localPath: "file:///data/finora_downloads/lll.mp4",
        status: "completed",
        progress: 1,
        bytesDownloaded: 1000000000,
        totalBytes: 1000000000,
        startedAt: Date.now() - 600000
      }
    ];

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(persisted));

    await manager.restorePersistedDownloads();

    expect(manager.getDownload("movie-already-done")).toBeUndefined();
  });

  it("does NOT restore canceled downloads", async () => {
    const persisted = [
      {
        itemId: "movie-canceled",
        title: "Something Canceled",
        type: "Movie",
        downloadUrl: "https://jellyfin.example.com/Videos/mc/stream.mp4",
        localPath: "file:///data/finora_downloads/mc.mp4",
        status: "canceled",
        progress: 0.2,
        bytesDownloaded: 200000000,
        totalBytes: 1000000000,
        startedAt: Date.now() - 600000
      }
    ];

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(persisted));

    await manager.restorePersistedDownloads();

    expect(manager.getDownload("movie-canceled")).toBeUndefined();
  });

  it("does not add a download to the queue beyond MAX_CONCURRENT_DOWNLOADS", async () => {
    for (let i = 1; i <= MAX_CONCURRENT_DOWNLOADS + 2; i++) {
      await manager.startDownload({
        itemId: `ep-${i}`,
        title: `Episode ${i}`,
        type: "Episode",
        downloadUrl: `https://jellyfin.example.com/Videos/ep-${i}/stream.mp4`,
        localPath: `finora_downloads/ep-${i}.mp4`
      });
    }

    const downloading = manager.getAllDownloads().filter((d) => d.status === "downloading");
    const queued = manager.getAllDownloads().filter((d) => d.status === "queued");

    expect(downloading.length).toBe(MAX_CONCURRENT_DOWNLOADS);
    expect(queued.length).toBe(2);
    expect(manager.getQueueLength()).toBe(2);
  });

  it("handles corrupt AsyncStorage data gracefully", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("not-valid-json{{{{");

    // Should not throw
    await expect(manager.restorePersistedDownloads()).resolves.toBeUndefined();
    expect(manager.getAllDownloads()).toHaveLength(0);
  });

  it("removes a canceled download from persistence", async () => {
    await manager.startDownload(MOCK_ITEM);

    // Wait for debounced persist
    await new Promise((r) => setTimeout(r, 300));
    (AsyncStorage.setItem as jest.Mock).mockClear();

    await manager.cancelDownload(MOCK_ITEM.itemId);

    // Wait for another debounced persist triggered by cancel
    await new Promise((r) => setTimeout(r, 300));

    const [, payload] = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
      ([key]) => key === DOWNLOAD_QUEUE_STORAGE_KEY
    );
    const entries = JSON.parse(payload);
    // Canceled item must not be in the persisted queue
    expect(entries.find((e: any) => e.itemId === MOCK_ITEM.itemId)).toBeUndefined();
  });

  it("enforces fail-closed: legacy queue without userId is never adopted by user B on same server", async () => {
    const { authRepository } = require("../../../core/jellyfin/authRepository");
    const restoreSpy = jest.spyOn(authRepository, "restoreSession").mockResolvedValue({
      serverId: "server-1",
      userId: "user-b",
      serverUrl: "https://jellyfin.example.com",
      token: "token-b"
    });

    try {
      // Persisted download from legacy state: same server URL and serverId, but NO userId
      const legacyPersisted = [
        {
          itemId: "legacy-movie-no-user",
          title: "Legacy Movie Without User",
          type: "Movie",
          downloadUrl: "https://jellyfin.example.com/Videos/legacy/stream.mp4",
          localPath: "file:///data/finora_downloads/legacy.mp4",
          status: "downloading",
          progress: 0.5,
          bytesDownloaded: 500000000,
          totalBytes: 1000000000,
          serverId: "server-1",
          serverUrl: "https://jellyfin.example.com"
        }
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(legacyPersisted));

      await manager.initialize();

      const item = manager.getDownload("legacy-movie-no-user");
      expect(item).toBeDefined();
      // Must fail closed (paused with AUTH_REQUIRED) rather than being queued or downloaded under user B
      expect(item?.status).toBe("paused");
      expect(item?.error).toBe("AUTH_REQUIRED");
      expect(manager.getQueueLength()).toBe(0);
    } finally {
      restoreSpy.mockRestore();
    }
  });
});
