import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import {
  DownloadManager,
  getScopedDownloadQueueKey,
  getScopedDownloadOrderKey
} from "../downloadManager";
import { buildDownloadRelativePath } from "../downloadPaths";
import { getDownloadHeaders } from "../downloadQuality";
import { authRepository } from "../../../core/jellyfin/authRepository";
import {
  usePlaybackPreferencesStore,
  DEFAULT_PLAYBACK_PREFERENCES
} from "../../../stores/playbackPreferencesStore";

jest.mock("../../../core/jellyfin/authRepository", () => ({
  authRepository: { restoreSession: jest.fn() }
}));

const fileSystem = FileSystem as any;
const restoreSessionMock = authRepository.restoreSession as jest.Mock;
const DOCUMENTS = "file:///mock-documents/";

const A = { serverId: "server-A", userId: "user-A", serverUrl: "https://a.example.com" };
const B = { serverId: "server-A", userId: "user-B", serverUrl: "https://a.example.com" };
const C = { serverId: "server-C", userId: "user-A", serverUrl: "https://c.example.com" };

function sessionFor(identity: { serverId: string; userId: string; serverUrl: string }, token = "token") {
  return { token, userName: "User", ...identity };
}

function itemFor(itemId: string) {
  return {
    itemId,
    title: `Title ${itemId}`,
    type: "Movie" as const,
    downloadUrl: `https://a.example.com/Items/${itemId}/Download`,
    // Relative on purpose — the manager must namespace it itself.
    localPath: `finora_downloads/${itemId}.mp4`
  };
}

async function settle() {
  for (let i = 0; i < 8; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe("DownloadManager — account/server isolation and lifecycle", () => {
  beforeEach(async () => {
    DownloadManager.destroyAll();
    jest.clearAllMocks();
    await AsyncStorage.clear();
    fileSystem.__reset();
    usePlaybackPreferencesStore.setState({
      preferences: { ...DEFAULT_PLAYBACK_PREFERENCES, downloadWifiOnly: false },
      isLoaded: true
    });
  });

  afterEach(() => {
    DownloadManager.destroyAll();
  });

  it("isolates the same itemId between two users of the same server", async () => {
    const pathA = buildDownloadRelativePath(A, "shared-movie");
    const pathB = buildDownloadRelativePath(B, "shared-movie");
    expect(pathA).not.toBe(pathB);

    const managerA = new DownloadManager();
    await managerA.startDownload(itemFor("shared-movie"), undefined, {
      headers: getDownloadHeaders("token-A"),
      quality: "original",
      identity: A
    });
    const managerB = new DownloadManager();
    await managerB.startDownload(itemFor("shared-movie"), undefined, {
      headers: getDownloadHeaders("token-B"),
      quality: "original",
      identity: B
    });

    expect(managerA.getDownload("shared-movie")?.localPath).toBe(`${DOCUMENTS}${pathA}`);
    expect(managerB.getDownload("shared-movie")?.localPath).toBe(`${DOCUMENTS}${pathB}`);

    // Distinct scoped queue keys — no shared global queue between accounts.
    expect(getScopedDownloadQueueKey(A)).not.toBe(getScopedDownloadQueueKey(B));
    expect(getScopedDownloadOrderKey(A)).not.toBe(getScopedDownloadOrderKey(B));
  });

  it("isolates the same itemId between two servers for the same user", async () => {
    const pathA = buildDownloadRelativePath(A, "shared-movie");
    const pathC = buildDownloadRelativePath(C, "shared-movie");
    expect(pathA).not.toBe(pathC);

    const managerA = new DownloadManager();
    await managerA.startDownload(itemFor("shared-movie"), undefined, {
      headers: getDownloadHeaders("t"),
      quality: "original",
      identity: A
    });
    const managerC = new DownloadManager();
    await managerC.startDownload(itemFor("shared-movie"), undefined, {
      headers: getDownloadHeaders("t"),
      quality: "original",
      identity: C
    });

    expect(managerA.getDownload("shared-movie")?.localPath).toBe(`${DOCUMENTS}${pathA}`);
    expect(managerC.getDownload("shared-movie")?.localPath).toBe(`${DOCUMENTS}${pathC}`);
  });

  it("stops in-flight work on logout and never re-issues the old token", async () => {
    restoreSessionMock.mockResolvedValue(sessionFor(A, "token-A"));

    const manager = new DownloadManager();
    await manager.initialize();

    // No caller headers: the request must be built from the live session.
    await manager.startDownload(itemFor("logout-movie"), undefined, {
      quality: "original",
      identity: A
    });
    await settle();

    const tasksBefore = fileSystem.__getDownloadTasks();
    expect(tasksBefore).toHaveLength(1);
    expect(tasksBefore[0].options.headers["X-Emby-Token"]).toBe("token-A");

    // The user logs out.
    restoreSessionMock.mockResolvedValue(null);
    await manager.handleIdentityChange();
    await settle();

    expect(manager.getAllDownloads()).toHaveLength(0);
    expect(manager.getActiveScope()).toBeNull();

    // Even if the old native task resolves afterwards (e.g. 401), the manager
    // must not refresh/retry with the previous token.
    await fileSystem.__completeTask(
      `${DOCUMENTS}${buildDownloadRelativePath(A, "logout-movie")}`,
      { status: 401 }
    );
    await settle();

    expect(fileSystem.__getDownloadTasks()).toHaveLength(1);

    // The previous scope's work was persisted as paused, for that scope only.
    const persisted = await AsyncStorage.getItem(getScopedDownloadQueueKey(A));
    expect(persisted).toContain("logout-movie");
    const entry = JSON.parse(persisted as string)[0];
    expect(entry.status).toBe("paused");
  });

  it("prevents the next account from seeing the previous account's queue/state", async () => {
    restoreSessionMock.mockResolvedValue(sessionFor(A, "token-A"));

    const manager = new DownloadManager();
    await manager.initialize();
    await manager.startDownload(itemFor("movie-x"), undefined, {
      quality: "original",
      identity: A
    });
    await settle();
    await manager.flushPersist();

    // Switch to another user of the same server.
    await manager.handleIdentityChange();
    restoreSessionMock.mockResolvedValue(sessionFor(B, "token-B"));
    await manager.initialize();
    await settle();

    // B sees neither A's download state nor queue nor file.
    expect(manager.getDownload("movie-x")).toBeUndefined();
    expect(manager.getAllDownloads()).toHaveLength(0);
    expect(manager.getQueueLength()).toBe(0);
    const persistedForB = await AsyncStorage.getItem(getScopedDownloadQueueKey(B));
    expect(persistedForB ?? "").not.toContain("movie-x");

    // A's own record survived, scoped to A.
    const persistedForA = await AsyncStorage.getItem(getScopedDownloadQueueKey(A));
    expect(persistedForA).toContain("movie-x");

    // Switching back restores A's paused item, proving persistence + isolation.
    await manager.handleIdentityChange();
    restoreSessionMock.mockResolvedValue(sessionFor(A, "token-A"));
    await manager.initialize();
    await settle();
    expect(manager.getDownload("movie-x")?.status).toBe("paused");
  });

  it("deleting account A's download never deletes account B's file", async () => {
    const managerA = new DownloadManager();
    await managerA.startDownload(itemFor("same-item"), undefined, {
      headers: getDownloadHeaders("t"),
      quality: "original",
      identity: A
    });
    const managerB = new DownloadManager();
    await managerB.startDownload(itemFor("same-item"), undefined, {
      headers: getDownloadHeaders("t"),
      quality: "original",
      identity: B
    });

    const pathA = `${DOCUMENTS}${buildDownloadRelativePath(A, "same-item")}`;
    const pathB = `${DOCUMENTS}${buildDownloadRelativePath(B, "same-item")}`;
    fileSystem.deleteAsync.mockClear();

    await managerA.cancelDownload("same-item");
    await settle();

    expect(fileSystem.deleteAsync).toHaveBeenCalledWith(pathA, { idempotent: true });
    expect(fileSystem.deleteAsync).not.toHaveBeenCalledWith(pathB, { idempotent: true });
  });

  it("rebuilds the request with the refreshed token after a 401 on a fresh download (BLK-03)", async () => {
    // The secure session yields a NEW token once refreshed.
    restoreSessionMock.mockResolvedValue(sessionFor(A, "fresh-token"));

    const manager = new DownloadManager();
    await manager.startDownload(itemFor("refresh-movie"), undefined, {
      headers: getDownloadHeaders("stale-token"),
      quality: "original",
      identity: A
    });
    await settle();

    const first = fileSystem.__getDownloadTasks();
    expect(first).toHaveLength(1);
    expect(first[0].options.headers["X-Emby-Token"]).toBe("stale-token");

    // Server rejects the stale token.
    await fileSystem.__completeTask(
      `${DOCUMENTS}${buildDownloadRelativePath(A, "refresh-movie")}`,
      { status: 401 }
    );
    await settle();

    const tasks = fileSystem.__getDownloadTasks();
    expect(tasks).toHaveLength(2);
    // The retry must use the refreshed session token, never the rejected one.
    expect(tasks[1].options.headers["X-Emby-Token"]).toBe("fresh-token");
    expect(tasks[1].url).not.toContain("stale-token");
  });
});
