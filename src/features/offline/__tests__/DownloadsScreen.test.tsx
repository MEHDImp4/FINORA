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

// Mock authStore
jest.mock("../../../stores/authStore", () => ({
  useAuthStore: (selector: any) =>
    selector({
      session: {
        serverUrl: "https://jellyfin.example.com",
        userId: "user-123"
      }
    })
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

  it("groups multiple episodes of the same series and opens series detail view", async () => {
    const mockEp1: OfflineMediaRecord = {
      itemId: "ep-1",
      title: "Breaking Bad - Pilot",
      type: "Episode",
      seriesId: "series-bb",
      seriesName: "Breaking Bad",
      seasonIndex: 1,
      episodeIndex: 1,
      localPath: "finora_downloads/ep_1.mp4",
      fileSizeBytes: 500000000,
      totalTicks: 3000000000,
      playbackPositionTicks: 0,
      savedAt: Date.now()
    };
    const mockEp2: OfflineMediaRecord = {
      itemId: "ep-2",
      title: "Breaking Bad - Cat's in the Bag...",
      type: "Episode",
      seriesId: "series-bb",
      seriesName: "Breaking Bad",
      seasonIndex: 1,
      episodeIndex: 2,
      localPath: "finora_downloads/ep_2.mp4",
      fileSizeBytes: 500000000,
      totalTicks: 3000000000,
      playbackPositionTicks: 0,
      savedAt: Date.now()
    };

    jest.spyOn(offlineStorageService, "getVerifiedOfflineMedia").mockResolvedValue({
      items: [
        { ...mockEp1, fileExists: true, actualBytes: mockEp1.fileSizeBytes },
        { ...mockEp2, fileExists: true, actualBytes: mockEp2.fileSizeBytes }
      ],
      totalPhysicalBytes: 1000000000,
      hasOrphans: false
    });

    const mockOnPlay = jest.fn();
    let tree: any;

    await act(async () => {
      tree = ReactTestRenderer.create(<DownloadsScreen onPlayItem={mockOnPlay} />);
    });

    // Should find single series card for Breaking Bad with 2 episodes
    const seriesCard = tree.root.findByProps({
      accessibilityLabel: "Browse series Breaking Bad, 2 episodes"
    });
    expect(seriesCard).toBeTruthy();

    // Click on the series card to open DownloadedSeriesView
    await act(async () => {
      seriesCard.props.onPress();
    });

    // Should now display the series view
    const seriesView = tree.root.findByProps({ testID: "downloaded-series-view" });
    expect(seriesView).toBeTruthy();

    // Should list both episodes
    const ep1Item = tree.root.findByProps({ testID: "series-episode-item-ep-1" });
    const ep2Item = tree.root.findByProps({ testID: "series-episode-item-ep-2" });
    expect(ep1Item).toBeTruthy();
    expect(ep2Item).toBeTruthy();

    // Click play on episode 1
    const ep1PlayBtn = tree.root.findByProps({ accessibilityLabel: "Play offline Breaking Bad - Pilot" });
    act(() => {
      ep1PlayBtn.props.onPress();
    });
    expect(mockOnPlay).toHaveBeenCalledWith(expect.objectContaining({ itemId: "ep-1" }));

    // Back button returns to main catalog
    const backBtn = tree.root.findByProps({ accessibilityLabel: "Retour aux téléchargements" });
    await act(async () => {
      backBtn.props.onPress();
    });

    const seriesCardAgain = tree.root.findByProps({
      accessibilityLabel: "Browse series Breaking Bad, 2 episodes"
    });
    expect(seriesCardAgain).toBeTruthy();
  });

  it("renders active downloads with poster and series info", async () => {
    const activeEp = {
      itemId: "active-ep-1",
      title: "Breaking Bad - And the Bag's in the River",
      type: "Episode" as const,
      seriesId: "series-bb",
      seriesName: "Breaking Bad",
      seriesPosterPath: "tag-bb-poster",
      seasonIndex: 1,
      episodeIndex: 3,
      downloadUrl: "https://jellyfin.example.com/download/ep3",
      localPath: "finora_downloads/ep_active.mp4",
      status: "downloading" as const,
      progress: 0.45,
      bytesDownloaded: 225000000,
      totalBytes: 500000000,
      speedBytesPerSecond: 2000000,
      estimatedSecondsRemaining: 137,
      startedAt: Date.now()
    };

    jest.spyOn(downloadManager, "subscribe").mockImplementation((listener) => {
      listener([activeEp]);
      return () => {};
    });

    let tree: any;
    await act(async () => {
      tree = ReactTestRenderer.create(<DownloadsScreen />);
    });

    const activeCard = tree.root.findByProps({
      testID: "download-progress-card-active-ep-1"
    });
    expect(activeCard).toBeTruthy();
  });

  it("shows an estimated size and percentage for a transcoded download without Content-Length", async () => {
    const transcoded = {
      itemId: "active-transcode-1",
      title: "Obsession (1080P)",
      type: "Movie" as const,
      downloadUrl: "https://jellyfin.example.com/Videos/x/stream.mp4",
      localPath: "finora_downloads/transcode.mp4",
      status: "downloading" as const,
      progress: 0.42,
      bytesDownloaded: 580000000,
      // Jellyfin sends no Content-Length for transcodes
      totalBytes: 0,
      expectedBytes: 1400000000,
      isEstimatedTotal: true,
      speedBytesPerSecond: 3400000,
      startedAt: Date.now()
    };

    jest.spyOn(downloadManager, "subscribe").mockImplementation((listener) => {
      listener([transcoded]);
      return () => {};
    });

    let tree: any;
    await act(async () => {
      tree = ReactTestRenderer.create(<DownloadsScreen />);
    });

    // Collect rendered text without JSON.stringify (React fibers are circular).
    const collectText = (node: any, out: string[] = []): string[] => {
      if (node == null) return out;
      if (typeof node === "string" || typeof node === "number") {
        out.push(String(node));
        return out;
      }
      if (Array.isArray(node)) {
        node.forEach((child) => collectText(child, out));
        return out;
      }
      if (node.children) collectText(node.children, out);
      return out;
    };
    const rendered = collectText(tree.toJSON()).join(" • ");

    // The duration-based estimate stands in for the missing Content-Length,
    // marked with "~" so it is never mistaken for an exact figure.
    expect(rendered).toContain("553 MB / ~1.3 GB");
    expect(rendered).toContain("~42%");
  });
});
