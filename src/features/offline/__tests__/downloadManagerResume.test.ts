import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import {
  DownloadManager,
  DOWNLOAD_QUEUE_STORAGE_KEY,
  DOWNLOAD_QUEUE_ORDER_STORAGE_KEY,
  AUTH_REQUIRED_ERROR
} from "../downloadManager";
import { offlineStorageService } from "../offlineStorage";
import { getDownloadHeaders } from "../downloadQuality";
import { authRepository } from "../../../core/jellyfin/authRepository";
import { usePlaybackPreferencesStore } from "../../../stores/playbackPreferencesStore";
import { DEFAULT_PLAYBACK_PREFERENCES } from "../../../stores/playbackPreferencesStore";

jest.mock("../../../core/jellyfin/authRepository", () => ({
  authRepository: { restoreSession: jest.fn() }
}));

// The module above is mocked, so take the real key directly. The offline
// catalogue is read back through the logged-in account scope, and a real
// process death always leaves that descriptor behind.
const { ACTIVE_SESSION_STORAGE_KEY } = jest.requireActual(
  "../../../core/jellyfin/authRepository"
) as { ACTIVE_SESSION_STORAGE_KEY: string };

const fileSystem = FileSystem as any;
const restoreSessionMock = authRepository.restoreSession as jest.Mock;

const DOCUMENTS_DIR = "file:///mock-documents/";
const localPathFor = (itemId: string) => `${DOCUMENTS_DIR}finora_downloads/${itemId}.mp4`;

const SERVER_A = {
  serverId: "server-A",
  userId: "user-A",
  serverUrl: "https://jellyfin.example.com"
};
const SERVER_B = {
  serverId: "server-B",
  userId: "user-B",
  serverUrl: "https://other.example.com"
};

function sessionFor(overrides: Record<string, unknown> = {}) {
  return {
    token: "fresh-token",
    userId: "user-A",
    userName: "Alice",
    serverId: "server-A",
    serverUrl: "https://jellyfin.example.com",
    ...overrides
  };
}

/**
 * Persists download metadata exactly as a previous process would have left it.
 * Deliberately contains no token — the manager must rebuild auth from SecureStore.
 */
async function seedPersistedEntries(entries: Record<string, unknown>[]) {
  await AsyncStorage.setItem(DOWNLOAD_QUEUE_STORAGE_KEY, JSON.stringify(entries));
}

function persistedEntry(overrides: Record<string, unknown>) {
  const itemId = String(overrides.itemId);
  return {
    title: `Title ${itemId}`,
    type: "Movie",
    downloadUrl: `https://jellyfin.example.com/Items/${itemId}/Download`,
    localPath: localPathFor(itemId),
    status: "downloading",
    progress: 0,
    bytesDownloaded: 0,
    totalBytes: 1_000_000_000,
    startedAt: Date.now() - 60_000,
    quality: "original",
    ...SERVER_A,
    ...overrides
  };
}

/** Lets the fire-and-forget promise chains inside the manager settle. */
async function settle() {
  for (let i = 0; i < 6; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe("DownloadManager — true resume after process death", () => {
  beforeEach(async () => {
    DownloadManager.destroyAll();
    jest.clearAllMocks();
    await AsyncStorage.clear();
    fileSystem.__reset();
    restoreSessionMock.mockResolvedValue(sessionFor());
    usePlaybackPreferencesStore.setState({
      preferences: { ...DEFAULT_PLAYBACK_PREFERENCES, downloadWifiOnly: false },
      isLoaded: true
    });
  });

  afterEach(() => {
    DownloadManager.destroyAll();
  });

  it("resumes from the existing partial file after a process death (Test 1)", async () => {
    const localPath = localPathFor("movie-resume");
    await seedPersistedEntries([
      persistedEntry({
        itemId: "movie-resume",
        status: "downloading",
        progress: 0.4,
        bytesDownloaded: 400_000_000
      })
    ]);
    fileSystem.__setFileSize(localPath, 400_000_000);

    // A brand new manager instance — as after a real kill.
    const manager = new DownloadManager();
    restoreSessionMock.mockResolvedValue(sessionFor({ token: "fresh-token" }));
    await manager.initialize();
    await settle();

    const item = manager.getDownload("movie-resume");
    expect(item?.status).toBe("downloading");
    expect(item?.bytesDownloaded).toBe(400_000_000);

    const tasks = fileSystem.__getDownloadTasks();
    expect(tasks).toHaveLength(1);
    // expo-file-system turns this into `Range: bytes=400000000-`.
    expect(tasks[0].resumeData).toBe("400000000");
    // A fresh token came from the secure session, never from storage.
    expect(tasks[0].options.headers["X-Emby-Token"]).toBe("fresh-token");
  });

  it("never persists the Jellyfin token in download metadata (Test 2)", async () => {
    const manager = new DownloadManager();
    await manager.startDownload(
      {
        itemId: "movie-secret",
        title: "Secret Movie",
        type: "Movie",
        downloadUrl:
          "https://jellyfin.example.com/Items/movie-secret/Download?api_key=SUPERSECRETVALUE",
        localPath: "finora_downloads/movie-secret.mp4"
      },
      undefined,
      {
        headers: getDownloadHeaders("SUPERSECRETVALUE"),
        quality: "original",
        identity: SERVER_A
      }
    );
    await manager.flushPersist();

    const raw = (await AsyncStorage.getItem(DOWNLOAD_QUEUE_STORAGE_KEY)) as string;
    expect(raw).toBeTruthy();

    const serialized = raw.toLowerCase();
    expect(raw).not.toContain("SUPERSECRETVALUE");
    expect(serialized).not.toContain("token");
    expect(serialized).not.toContain("api_key");
    expect(serialized).not.toContain("authorization");
    expect(serialized).not.toContain("password");

    const entries = JSON.parse(raw);
    expect(entries[0].downloadUrl).not.toContain("api_key");
    // Non-sensitive identity IS persisted, so the download stays bound to its account.
    expect(entries[0].serverId).toBe("server-A");
    expect(entries[0].userId).toBe("user-A");
  });

  it("keeps the partial file and metadata when no session exists (Test 3)", async () => {
    const localPath = localPathFor("movie-no-auth");
    await seedPersistedEntries([
      persistedEntry({ itemId: "movie-no-auth", bytesDownloaded: 250_000_000 })
    ]);
    fileSystem.__setFileSize(localPath, 250_000_000);
    restoreSessionMock.mockResolvedValue(null);

    const manager = new DownloadManager();
    await manager.initialize();
    await settle();

    const item = manager.getDownload("movie-no-auth");
    expect(item?.status).toBe("paused");
    expect(item?.error).toBe(AUTH_REQUIRED_ERROR);
    expect(item?.bytesDownloaded).toBe(250_000_000);
    // No transfer attempted and nothing destroyed.
    expect(fileSystem.__getDownloadTasks()).toHaveLength(0);
    expect(fileSystem.deleteAsync).not.toHaveBeenCalled();
    // Metadata survives for a later resume.
    const raw = await AsyncStorage.getItem(DOWNLOAD_QUEUE_STORAGE_KEY);
    expect(raw).toContain("movie-no-auth");
  });

  it("resets counters instead of showing a fake percentage when the file is gone (Test 4)", async () => {
    const localPath = localPathFor("movie-gone");
    await seedPersistedEntries([
      persistedEntry({
        itemId: "movie-gone",
        status: "downloading",
        progress: 0.5,
        bytesDownloaded: 500_000_000
      })
    ]);
    // Metadata claims 50% but no file exists on disk.
    fileSystem.__removeFile(localPath);

    const manager = new DownloadManager();
    await manager.initialize();
    await settle();

    const item = manager.getDownload("movie-gone");
    expect(item?.bytesDownloaded).toBe(0);
    expect(item?.progress).toBe(0);

    const tasks = fileSystem.__getDownloadTasks();
    expect(tasks).toHaveLength(1);
    // A clean restart from zero — no resume offset was fabricated.
    expect(tasks[0].resumeData).toBeUndefined();
  });

  it("keeps a deliberately paused download paused across a restart (Test 5)", async () => {
    const localPath = localPathFor("movie-paused");
    await seedPersistedEntries([
      persistedEntry({
        itemId: "movie-paused",
        status: "paused",
        progress: 0.3,
        bytesDownloaded: 300_000_000
      })
    ]);
    fileSystem.__setFileSize(localPath, 300_000_000);

    const manager = new DownloadManager();
    await manager.initialize();
    await settle();

    expect(manager.getDownload("movie-paused")?.status).toBe("paused");
    expect(manager.getQueueLength()).toBe(0);
    expect(fileSystem.__getDownloadTasks()).toHaveLength(0);
  });

  it("restores the queue order and never exceeds 3 active downloads (Test 6)", async () => {
    const ids = ["c1", "c2", "c3", "c4", "c5"];
    for (const id of ids) {
      fileSystem.__setFileSize(localPathFor(`movie-${id}`), 100_000_000);
    }
    await seedPersistedEntries(
      ids.map((id) => persistedEntry({ itemId: `movie-${id}`, bytesDownloaded: 100_000_000 }))
    );
    // The FIFO position from before the kill.
    await AsyncStorage.setItem(
      DOWNLOAD_QUEUE_ORDER_STORAGE_KEY,
      JSON.stringify(["movie-c3", "movie-c1", "movie-c5", "movie-c2", "movie-c4"])
    );

    const manager = new DownloadManager();
    await manager.initialize();
    await settle();

    const downloading = manager
      .getAllDownloads()
      .filter((d) => d.status === "downloading")
      .map((d) => d.itemId);
    const queued = manager
      .getAllDownloads()
      .filter((d) => d.status === "queued")
      .map((d) => d.itemId);

    expect(downloading).toHaveLength(3);
    expect([...downloading].sort()).toEqual(["movie-c1", "movie-c3", "movie-c5"]);
    expect(queued).toEqual(["movie-c2", "movie-c4"]);

    // FIFO order was restored: transfers were started in the persisted order.
    const startedOrder = fileSystem
      .__getDownloadTasks()
      .map((task: any) =>
        String(task.fileUri).replace(/^.*finora_downloads\//, "").replace(/\.mp4$/, "")
      );
    expect(startedOrder).toEqual(["movie-c3", "movie-c1", "movie-c5"]);
    // The cap holds: no fourth transfer was ever started.
    expect(fileSystem.__getDownloadTasks().length).toBeLessThanOrEqual(3);
  });

  it("never resumes a download owned by another user (Test 7)", async () => {
    const localPath = localPathFor("movie-other-user");
    await seedPersistedEntries([
      persistedEntry({
        itemId: "movie-other-user",
        bytesDownloaded: 200_000_000,
        userId: "user-A"
      })
    ]);
    fileSystem.__setFileSize(localPath, 200_000_000);
    // Same server, different account.
    restoreSessionMock.mockResolvedValue(sessionFor({ userId: "user-B", userName: "Bob" }));

    const manager = new DownloadManager();
    await manager.initialize();
    await settle();

    const item = manager.getDownload("movie-other-user");
    expect(item?.status).toBe("paused");
    expect(item?.error).toBe(AUTH_REQUIRED_ERROR);
    expect(fileSystem.__getDownloadTasks()).toHaveLength(0);
    expect(fileSystem.deleteAsync).not.toHaveBeenCalled();
  });

  it("never resumes a download owned by another server (Test 8)", async () => {
    const localPath = localPathFor("movie-other-server");
    await seedPersistedEntries([
      persistedEntry({
        itemId: "movie-other-server",
        bytesDownloaded: 200_000_000,
        serverId: SERVER_A.serverId,
        serverUrl: SERVER_A.serverUrl
      })
    ]);
    fileSystem.__setFileSize(localPath, 200_000_000);
    restoreSessionMock.mockResolvedValue(
      sessionFor({ serverId: SERVER_B.serverId, serverUrl: SERVER_B.serverUrl, userId: "user-B" })
    );

    const manager = new DownloadManager();
    await manager.initialize();
    await settle();

    const item = manager.getDownload("movie-other-server");
    expect(item?.status).toBe("paused");
    expect(item?.error).toBe(AUTH_REQUIRED_ERROR);
    expect(fileSystem.__getDownloadTasks()).toHaveLength(0);
  });

  it("refreshes the session once and retries once on a 401 (Test 9)", async () => {
    const localPath = localPathFor("movie-401");
    await seedPersistedEntries([
      persistedEntry({ itemId: "movie-401", bytesDownloaded: 200_000_000 })
    ]);
    fileSystem.__setFileSize(localPath, 200_000_000);

    const manager = new DownloadManager();
    await manager.initialize();
    await settle();

    expect(fileSystem.__getDownloadTasks()).toHaveLength(1);
    expect(restoreSessionMock).toHaveBeenCalledTimes(1);

    // First attempt is rejected with 401.
    await fileSystem.__completeTask(localPath, { status: 401 });
    await settle();

    // Exactly one refresh + rebuild happened.
    expect(restoreSessionMock).toHaveBeenCalledTimes(2);
    expect(fileSystem.__getDownloadTasks()).toHaveLength(2);

    // The retry also fails: bounded recovery, no third attempt, partial kept.
    await fileSystem.__completeTask(localPath, { status: 401 });
    await settle();

    expect(fileSystem.__getDownloadTasks()).toHaveLength(2);
    expect(manager.getDownload("movie-401")?.status).toBe("failed");
    expect(fileSystem.deleteAsync).not.toHaveBeenCalled();
  });

  it("discards and restarts when the source ignores HTTP Range (Test 10)", async () => {
    const localPath = localPathFor("movie-norange");
    await seedPersistedEntries([
      persistedEntry({ itemId: "movie-norange", bytesDownloaded: 300_000_000 })
    ]);
    fileSystem.__setFileSize(localPath, 300_000_000);

    const manager = new DownloadManager();
    await manager.initialize();
    await settle();

    const firstTask = fileSystem.__getDownloadTasks()[0];
    expect(firstTask.resumeData).toBe("300000000");

    // The source ignored the Range header and answered 200 with the FULL body,
    // which the native layer would have appended to the partial file.
    await fileSystem.__completeTask(localPath, { status: 200 });
    await settle();

    // The corrupt file was destroyed and a clean transfer was scheduled.
    expect(fileSystem.deleteAsync).toHaveBeenCalledWith(localPath, { idempotent: true });
    const tasks = fileSystem.__getDownloadTasks();
    expect(tasks).toHaveLength(2);
    expect(tasks[1].resumeData).toBeUndefined();

    // A concatenated result can never be reported as complete.
    expect(manager.getDownload("movie-norange")?.status).not.toBe("completed");
  });

  it("recognises a file that is already fully downloaded (Test 11)", async () => {
    const localPath = localPathFor("movie-done");
    await seedPersistedEntries([
      persistedEntry({
        itemId: "movie-done",
        status: "downloading",
        progress: 0.9,
        bytesDownloaded: 900_000_000
      })
    ]);
    // The file on disk is already the full media.
    fileSystem.__setFileSize(localPath, 1_000_000_000);
    // A process death leaves the signed-in account descriptor in storage, and
    // the offline catalogue is read back through that account scope.
    await AsyncStorage.setItem(
      ACTIVE_SESSION_STORAGE_KEY,
      JSON.stringify({ ...SERVER_A, userName: "Alice", lastActiveAt: Date.now() })
    );

    const manager = new DownloadManager();
    await manager.initialize();
    await settle();

    // Reconciled straight into the offline catalogue, never re-downloaded.
    expect(fileSystem.__getDownloadTasks()).toHaveLength(0);
    expect(manager.getDownload("movie-done")).toBeUndefined();
    const record = await offlineStorageService.getOfflineMedia("movie-done");
    expect(record).not.toBeNull();
    expect(record?.fileSizeBytes).toBe(1_000_000_000);
  });

  it("rebuilds a resumable task from persisted state in a genuinely new manager (Test 12)", async () => {
    const localPath = localPathFor("movie-restart");
    const item = {
      itemId: "movie-restart",
      title: "Restart Me",
      type: "Movie" as const,
      downloadUrl: "https://jellyfin.example.com/Items/movie-restart/Download",
      localPath: "finora_downloads/movie-restart.mp4"
    };

    // ---- Process #1: the user starts a download ---------------------------------
    fileSystem.__setDefaultFileSize(null); // nothing on disk yet → clean start
    const first = new DownloadManager();
    await first.startDownload(item, undefined, {
      headers: getDownloadHeaders("old-token"),
      quality: "original",
      identity: SERVER_A
    });
    await settle();
    first.updateProgress("movie-restart", 400_000_000, 1_000_000_000);
    await first.flushPersist();

    const firstTasks = fileSystem.__getDownloadTasks();
    expect(firstTasks).toHaveLength(1);
    expect(firstTasks[0].options.headers["X-Emby-Token"]).toBe("old-token");

    // ---- Process death ----------------------------------------------------------
    // In-memory task state is gone; only persisted metadata and the partial file remain.
    fileSystem.__clearDownloadTasks();
    fileSystem.__setFileSize(localPath, 400_000_000);
    restoreSessionMock.mockResolvedValue(sessionFor({ token: "rotated-token" }));

    // ---- Process #2 -------------------------------------------------------------
    const second = new DownloadManager();
    expect(second.getAllDownloads()).toHaveLength(0);
    await second.initialize();
    await settle();

    const tasks = fileSystem.__getDownloadTasks();
    expect(tasks).toHaveLength(1);
    // Rebuilt at the real byte offset, not from zero.
    expect(tasks[0].resumeData).toBe("400000000");
    // Re-authenticated with a freshly restored session.
    expect(tasks[0].options.headers["X-Emby-Token"]).toBe("rotated-token");
    expect(tasks[0].url).not.toContain("old-token");
    // Bound to the same server/user.
    expect(tasks[0].url).toContain("https://jellyfin.example.com");
  });
});
