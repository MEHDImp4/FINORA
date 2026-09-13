import React from "react";
import ReactTestRenderer, { act } from "react-test-renderer";
import {
  DownloadsScreen,
  formatBytes,
  formatSpeed,
  formatTimeRemaining
} from "../components/DownloadsScreen";
import { offlineStorageService } from "../offlineStorage";
import { downloadManager } from "../downloadManager";
import { OfflineMediaRecord } from "../types";

// Mock router
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush
  }),
  useFocusEffect: (cb: any) => cb()
}));

describe("DownloadsScreen & OfflineSyncManager", () => {
  const mockRecord: OfflineMediaRecord = {
    itemId: "movie-offline-1",
    title: "Blade Runner",
    type: "Movie",
    year: 1982,
    localPath: "finora_downloads/bladerunner.mp4",
    fileSizeBytes: 1048576000, // ~1000 MB
    totalTicks: 7000000000,
    playbackPositionTicks: 0,
    savedAt: Date.now()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(offlineStorageService, "getAllOfflineMedia").mockResolvedValue([mockRecord]);
    jest.spyOn(offlineStorageService, "getVerifiedOfflineMedia").mockResolvedValue({
      items: [{ ...mockRecord, fileExists: true, actualBytes: mockRecord.fileSizeBytes }],
      totalPhysicalBytes: mockRecord.fileSizeBytes,
      hasOrphans: false
    });
    jest.spyOn(offlineStorageService, "cleanupExpiredWatchedMedia").mockResolvedValue([]);
    jest.spyOn(offlineStorageService, "deleteOfflineMedia").mockResolvedValue();
    jest.spyOn(downloadManager, "subscribe").mockImplementation((listener) => {
      listener([]);
      return () => {};
    });
  });

  it("formatBytes formats bytes to MB and GB appropriately", () => {
    expect(formatBytes(0)).toBe("0 MB");
    expect(formatBytes(500 * 1024 * 1024)).toBe("500 MB");
    expect(formatBytes(2.5 * 1024 * 1024 * 1024)).toBe("2.5 GB");
  });

  it("formatSpeed formats transfer speed to KB/s and MB/s", () => {
    expect(formatSpeed(0)).toBe("");
    expect(formatSpeed(500 * 1024)).toBe("500 KB/s");
    expect(formatSpeed(3.5 * 1024 * 1024)).toBe("3.5 MB/s");
  });

  it("formatTimeRemaining formats ETA seconds into readable strings", () => {
    expect(formatTimeRemaining(0)).toBe("");
    expect(formatTimeRemaining(45)).toBe("~45s");
    expect(formatTimeRemaining(120)).toBe("~2 min");
    expect(formatTimeRemaining(3660)).toBe("~1h 1m");
  });

  it("renders downloaded items and allows offline playback", async () => {
    const mockOnPlay = jest.fn();
    let tree: any;

    await act(async () => {
      tree = ReactTestRenderer.create(<DownloadsScreen onPlayItem={mockOnPlay} />);
    });

    const playButton = tree.root.findByProps({
      accessibilityLabel: "Play offline Blade Runner"
    });
    expect(playButton).toBeTruthy();

    act(() => {
      playButton.props.onPress();
    });

    expect(mockOnPlay).toHaveBeenCalledWith(mockRecord);
  });

  it("deletes a downloaded item upon button press", async () => {
    let tree: any;

    await act(async () => {
      tree = ReactTestRenderer.create(<DownloadsScreen />);
    });

    const deleteButton = tree.root.findByProps({
      accessibilityLabel: "Delete Blade Runner"
    });
    expect(deleteButton).toBeTruthy();

    await act(async () => {
      await deleteButton.props.onPress();
    });

    expect(offlineStorageService.deleteOfflineMedia).toHaveBeenCalledWith("movie-offline-1");
  });

  it("automatically reloads catalog when a download completes", async () => {
    let capturedListener: ((downloads: any[]) => void) | undefined;
    jest.spyOn(downloadManager, "subscribe").mockImplementation((listener) => {
      capturedListener = listener;
      listener([]);
      return () => {};
    });

    const getVerifiedSpy = jest.spyOn(offlineStorageService, "getVerifiedOfflineMedia");

    await act(async () => {
      ReactTestRenderer.create(<DownloadsScreen />);
    });

    const callCountBefore = getVerifiedSpy.mock.calls.length;

    // Simulate download completing
    await act(async () => {
      if (capturedListener) {
        capturedListener([
          {
            itemId: "movie-new",
            title: "New Movie",
            type: "Movie",
            status: "completed",
            progress: 1.0,
            bytesDownloaded: 500000,
            totalBytes: 500000
          }
        ]);
      }
    });

    expect(getVerifiedSpy.mock.calls.length).toBeGreaterThan(callCountBefore);
  });
});
