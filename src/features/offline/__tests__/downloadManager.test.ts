import { DownloadManager } from "../downloadManager";

describe("DownloadManager", () => {
  let manager: DownloadManager;

  beforeEach(() => {
    manager = new DownloadManager();
  });

  it("starts a download and tracks downloading state", async () => {
    const item = await manager.startDownload({
      itemId: "movie-1",
      title: "Oppenheimer",
      type: "Movie",
      year: 2023,
      downloadUrl: "https://jellyfin.example.com/Videos/movie-1/stream.mp4",
      localPath: "finora_downloads/movie-1.mp4"
    });

    expect(item.status).toBe("downloading");
    expect(item.progress).toBe(0);
    expect(manager.getDownload("movie-1")).toBeDefined();
  });

  it("updates download progress and marks completed when finished", async () => {
    await manager.startDownload({
      itemId: "movie-2",
      title: "Interstellar",
      type: "Movie",
      downloadUrl: "https://jellyfin.example.com/Videos/movie-2/stream.mp4",
      localPath: "finora_downloads/movie-2.mp4"
    });

    manager.updateProgress("movie-2", 500000, 1000000);
    let item = manager.getDownload("movie-2");
    expect(item?.progress).toBe(0.5);
    expect(item?.status).toBe("downloading");

    manager.updateProgress("movie-2", 1000000, 1000000);
    item = manager.getDownload("movie-2");
    expect(item?.progress).toBe(1);
    expect(item?.status).toBe("completed");
    expect(item?.completedAt).toBeDefined();
  });

  it("pauses, resumes, and cancels a download", async () => {
    await manager.startDownload({
      itemId: "show-1",
      title: "Severance S01E01",
      type: "Episode",
      downloadUrl: "https://jellyfin.example.com/Videos/show-1/stream.mp4",
      localPath: "finora_downloads/show-1.mp4"
    });

    await manager.pauseDownload("show-1");
    let item = manager.getDownload("show-1");
    expect(item?.status).toBe("paused");

    await manager.resumeDownload("show-1");
    item = manager.getDownload("show-1");
    expect(item?.status).toBe("downloading");

    await manager.cancelDownload("show-1");
    item = manager.getDownload("show-1");
    expect(item).toBeUndefined();
  });

  it("notifies subscribers of download changes", async () => {
    const mockListener = jest.fn();
    const unsubscribe = manager.subscribe(mockListener);

    expect(mockListener).toHaveBeenCalledTimes(1); // initial call

    await manager.startDownload({
      itemId: "movie-3",
      title: "Dune",
      type: "Movie",
      downloadUrl: "https://jellyfin.example.com/Videos/movie-3/stream.mp4",
      localPath: "finora_downloads/movie-3.mp4"
    });

    expect(mockListener).toHaveBeenCalledTimes(2);

    unsubscribe();
    manager.updateProgress("movie-3", 100, 200);
    expect(mockListener).toHaveBeenCalledTimes(2); // no more calls after unsubscribe
  });

  it("supports retrying a download with stored configuration", async () => {
    await manager.startDownload(
      {
        itemId: "movie-retry",
        title: "Inception",
        type: "Movie",
        downloadUrl: "https://jellyfin.example.com/Items/movie-retry/Download",
        localPath: "finora_downloads/movie-retry.mp4"
      },
      undefined,
      { headers: { "X-Emby-Token": "test-token" } }
    );

    manager.markFailed("movie-retry", "Erreur réseau");
    expect(manager.getDownload("movie-retry")?.status).toBe("failed");
    expect(manager.getDownload("movie-retry")?.error).toBe("Erreur réseau");

    await manager.retryDownload("movie-retry");
    expect(manager.getDownload("movie-retry")?.status).toBe("downloading");
    expect(manager.getDownload("movie-retry")?.error).toBeUndefined();
  });

  it("limits concurrent downloads to 3 and queues excess items", async () => {
    // Start 5 downloads
    for (let i = 1; i <= 5; i++) {
      await manager.startDownload({
        itemId: `ep-${i}`,
        title: `Episode ${i}`,
        type: "Episode",
        downloadUrl: `https://jellyfin.example.com/Videos/ep-${i}/stream.mp4`,
        localPath: `finora_downloads/ep-${i}.mp4`
      });
    }

    // Check first 3 are downloading, next 2 are queued
    expect(manager.getDownload("ep-1")?.status).toBe("downloading");
    expect(manager.getDownload("ep-2")?.status).toBe("downloading");
    expect(manager.getDownload("ep-3")?.status).toBe("downloading");
    expect(manager.getDownload("ep-4")?.status).toBe("queued");
    expect(manager.getDownload("ep-5")?.status).toBe("queued");
    expect(manager.getQueueLength()).toBe(2);

    // Complete ep-1 -> ep-4 should automatically start downloading
    await manager.completeDownload("ep-1", 500000000);
    expect(manager.getDownload("ep-1")?.status).toBe("completed");
    expect(manager.getDownload("ep-4")?.status).toBe("downloading");
    expect(manager.getQueueLength()).toBe(1);

    // Cancel ep-2 -> ep-5 should automatically start downloading
    await manager.cancelDownload("ep-2");
    expect(manager.getDownload("ep-2")).toBeUndefined();
    expect(manager.getDownload("ep-5")?.status).toBe("downloading");
    expect(manager.getQueueLength()).toBe(0);
  });

  it("retains series poster, series name, and episode poster in download item", async () => {
    const item = await manager.startDownload({
      itemId: "ep-series-1",
      title: "Breaking Bad - Pilot",
      type: "Episode",
      seriesId: "series-bb",
      seriesName: "Breaking Bad",
      seriesPosterPath: "tag-bb-poster",
      posterPath: "tag-ep-poster",
      seasonIndex: 1,
      episodeIndex: 1,
      downloadUrl: "https://jellyfin.example.com/Videos/ep-series-1/stream.mp4",
      localPath: "finora_downloads/ep_1.mp4"
    });

    expect(item.seriesId).toBe("series-bb");
    expect(item.seriesName).toBe("Breaking Bad");
    expect(item.seriesPosterPath).toBe("tag-bb-poster");
    expect(item.posterPath).toBe("tag-ep-poster");
  });
});
