import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { DownloadManager } from "../downloadManager";
import {
  INSUFFICIENT_STORAGE_ERROR,
  STORAGE_FULL_ERROR,
  evaluateDiskSpace,
  requiredBytesForDownload
} from "../diskSpace";
import {
  DEFAULT_PLAYBACK_PREFERENCES,
  usePlaybackPreferencesStore
} from "../../../stores/playbackPreferencesStore";

const fileSystem = FileSystem as any;
const GB = 1024 * 1024 * 1024;

async function settle() {
  for (let i = 0; i < 8; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe("DWN-01 download disk-space preflight", () => {
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
    DownloadManager.destroyAll();
  });

  it("starts a download when there is enough free space", async () => {
    fileSystem.__setFreeDiskStorage(10 * GB);

    const item = await manager.startDownload(
      {
        itemId: "movie-fits",
        title: "Fits",
        type: "Movie",
        downloadUrl: "https://server/Videos/movie-fits/stream.mp4",
        localPath: "file:///dl/movie-fits.mp4"
      },
      { totalTicks: 3600 * 10_000_000 },
      { quality: "1080p", headers: { "X-Emby-Token": "t" } }
    );

    expect(item.status).toBe("downloading");
    expect(item.error).toBeUndefined();
  });

  it("rejects BEFORE creating any transfer when the estimate does not fit", async () => {
    fileSystem.__setFreeDiskStorage(1024 * 1024); // 1 MB free

    const item = await manager.startDownload(
      {
        itemId: "movie-too-big",
        title: "Too Big",
        type: "Movie",
        downloadUrl: "https://server/Videos/movie-too-big/stream.mp4",
        localPath: "file:///dl/movie-too-big.mp4"
      },
      { totalTicks: 3600 * 10_000_000 },
      { quality: "1080p", headers: { "X-Emby-Token": "t" } }
    );

    expect(item.status).toBe("failed");
    expect(item.error).toBe(INSUFFICIENT_STORAGE_ERROR);
    // No byte was requested.
    expect(FileSystem.createDownloadResumable).not.toHaveBeenCalled();
  });

  it("marks a disk-full (ENOSPC) failure without ever marking completed", async () => {
    fileSystem.__setFreeDiskStorage(10 * GB);
    (FileSystem.createDownloadResumable as jest.Mock).mockImplementationOnce(() => {
      throw new Error("ENOSPC: no space left on device");
    });

    await manager.startDownload(
      {
        itemId: "movie-enospc",
        title: "ENOSPC",
        type: "Movie",
        downloadUrl: "https://server/Videos/movie-enospc/stream.mp4",
        localPath: "file:///dl/movie-enospc.mp4"
      },
      undefined,
      { headers: { "X-Emby-Token": "t" } }
    );
    await settle();

    const item = manager.getDownload("movie-enospc");
    expect(item?.status).toBe("failed");
    expect(item?.error).toBe(STORAGE_FULL_ERROR);
    expect(item?.status).not.toBe("completed");
  });

  it("keeps a safety margin so a download never consumes 100% of free space", () => {
    const check = evaluateDiskSpace(9.5 * GB, 10 * GB);
    // 9.5 GB + 10% margin (1 GB) does not fit in 10 GB.
    expect(check.sufficient).toBe(false);
    expect(check.marginBytes).toBeGreaterThanOrEqual(GB);

    const fits = evaluateDiskSpace(2 * GB, 10 * GB);
    expect(fits.sufficient).toBe(true);
  });

  it("computes remaining bytes for a resumed transfer", () => {
    expect(requiredBytesForDownload(0, 1000, 400)).toBe(600);
    expect(requiredBytesForDownload(1000, 0, 400)).toBe(600);
    // Unknown size → nothing to preflight.
    expect(requiredBytesForDownload(0, 0, 400)).toBe(0);
  });
});
