import { DownloadManager } from "../downloadManager";
import { usePlaybackPreferencesStore } from "../../../stores/playbackPreferencesStore";
import * as Network from "expo-network";

describe("DownloadManager Wi-Fi restriction", () => {
  let manager: DownloadManager;

  beforeEach(async () => {
    DownloadManager.destroyAll();
    jest.clearAllMocks();
    manager = new DownloadManager();
    // Reset store
    await usePlaybackPreferencesStore.getState().setDownloadWifiOnly(true);
  });

  afterEach(() => {
    DownloadManager.destroyAll();
  });

  it("keeps a Wi-Fi-only download queued (not failed) while on cellular", async () => {
    (Network.getNetworkStateAsync as jest.Mock).mockResolvedValueOnce({
      type: Network.NetworkStateType.CELLULAR,
      isConnected: true
    });

    const item = await manager.startDownload({
      itemId: "item-cellular-test",
      title: "Cellular Video",
      type: "Movie",
      downloadUrl: "http://jellyfin/stream.mp4",
      localPath: "file:///local.mp4"
    });

    // DWN-03: waiting for Wi-Fi is a queued state, never a failure.
    expect(item.status).toBe("queued");
    expect(item.error).toContain("Wi-Fi");
    expect(manager.getQueueLength()).toBeGreaterThanOrEqual(1);
  });

  it("promotes a queued Wi-Fi-only download when Wi-Fi returns", async () => {
    (Network.getNetworkStateAsync as jest.Mock).mockResolvedValueOnce({
      type: Network.NetworkStateType.CELLULAR,
      isConnected: true
    });
    await manager.startDownload({
      itemId: "item-waiting-wifi",
      title: "Waiting Video",
      type: "Movie",
      downloadUrl: "http://jellyfin/stream.mp4",
      localPath: "file:///waiting.mp4"
    });
    expect(manager.getDownload("item-waiting-wifi")?.status).toBe("queued");

    // Wi-Fi becomes available and the OS emits a network change.
    (Network.getNetworkStateAsync as jest.Mock).mockResolvedValue({
      type: Network.NetworkStateType.WIFI,
      isConnected: true
    });
    (Network as any).__emitNetworkState();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(manager.getDownload("item-waiting-wifi")?.status).not.toBe("queued");
  });

  it("allows download when downloadWifiOnly is enabled and network is WIFI", async () => {
    (Network.getNetworkStateAsync as jest.Mock).mockResolvedValueOnce({
      type: Network.NetworkStateType.WIFI,
      isConnected: true
    });

    const item = await manager.startDownload({
      itemId: "item-wifi-test",
      title: "Wifi Video",
      type: "Movie",
      downloadUrl: "http://jellyfin/stream.mp4",
      localPath: "file:///local.mp4"
    });

    expect(item.status).toBe("downloading");
    expect(item.error).toBeUndefined();
  });

  it("allows download on cellular when downloadWifiOnly is disabled by user", async () => {
    await usePlaybackPreferencesStore.getState().setDownloadWifiOnly(false);

    (Network.getNetworkStateAsync as jest.Mock).mockResolvedValueOnce({
      type: Network.NetworkStateType.CELLULAR,
      isConnected: true
    });

    const item = await manager.startDownload({
      itemId: "item-cellular-allowed-test",
      title: "Cellular Allowed Video",
      type: "Movie",
      downloadUrl: "http://jellyfin/stream.mp4",
      localPath: "file:///local.mp4"
    });

    expect(item.status).toBe("downloading");
    expect(item.error).toBeUndefined();
  });
});
