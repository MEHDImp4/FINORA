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
});
