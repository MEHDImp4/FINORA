import { downloadManager } from "../downloadManager";
import { usePlaybackPreferencesStore } from "../../../stores/playbackPreferencesStore";
import * as Network from "expo-network";

describe("DownloadManager Wi-Fi restriction", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset store
    await usePlaybackPreferencesStore.getState().setDownloadWifiOnly(true);
  });

  it("blocks download when downloadWifiOnly is enabled and network is cellular", async () => {
    (Network.getNetworkStateAsync as jest.Mock).mockResolvedValueOnce({
      type: Network.NetworkStateType.CELLULAR,
      isConnected: true
    });

    const item = await downloadManager.startDownload({
      itemId: "item-cellular-test",
      title: "Cellular Video",
      type: "Movie",
      downloadUrl: "http://jellyfin/stream.mp4",
      localPath: "file:///local.mp4"
    });

    expect(item.status).toBe("failed");
    expect(item.error).toContain("Connexion Wi-Fi requise");
  });

  it("allows download when downloadWifiOnly is enabled and network is WIFI", async () => {
    (Network.getNetworkStateAsync as jest.Mock).mockResolvedValueOnce({
      type: Network.NetworkStateType.WIFI,
      isConnected: true
    });

    const item = await downloadManager.startDownload({
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

    const item = await downloadManager.startDownload({
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
