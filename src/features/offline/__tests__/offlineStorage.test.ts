import AsyncStorage from "@react-native-async-storage/async-storage";
import { OfflineStorageService } from "../offlineStorage";
import { OfflineMediaRecord } from "../types";

describe("OfflineStorageService", () => {
  let service: OfflineStorageService;

  beforeEach(async () => {
    await AsyncStorage.clear();
    service = new OfflineStorageService();
  });

  it("saves and retrieves offline media records", async () => {
    const record: OfflineMediaRecord = {
      itemId: "movie-1",
      title: "Spider-Man: Across the Spider-Verse",
      type: "Movie",
      year: 2023,
      overview: "Miles Morales catapults across the Multiverse...",
      localPath: "finora_downloads/movie-1.mp4",
      fileSizeBytes: 2500000000,
      totalTicks: 7200000000,
      playbackPositionTicks: 0,
      savedAt: Date.now()
    };

    await service.saveOfflineMedia(record);

    const retrieved = await service.getOfflineMedia("movie-1");
    expect(retrieved).toEqual(record);

    const all = await service.getAllOfflineMedia();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe("Spider-Man: Across the Spider-Verse");
  });

  it("updates local playback position for an offline item", async () => {
    const record: OfflineMediaRecord = {
      itemId: "show-ep-1",
      title: "Succession S04E03",
      type: "Episode",
      localPath: "finora_downloads/show-ep-1.mp4",
      fileSizeBytes: 1200000000,
      totalTicks: 3600000000,
      playbackPositionTicks: 0,
      savedAt: Date.now()
    };

    await service.saveOfflineMedia(record);
    await service.updateLocalPlaybackPosition("show-ep-1", 1800000000);

    const updated = await service.getOfflineMedia("show-ep-1");
    expect(updated?.playbackPositionTicks).toBe(1800000000);
  });

  it("deletes offline media record", async () => {
    const record: OfflineMediaRecord = {
      itemId: "item-del",
      title: "Delete Me",
      type: "Movie",
      localPath: "finora_downloads/delete.mp4",
      fileSizeBytes: 5000000,
      totalTicks: 10000000,
      playbackPositionTicks: 0,
      savedAt: Date.now()
    };

    await service.saveOfflineMedia(record);
    expect(await service.getAllOfflineMedia()).toHaveLength(1);

    await service.deleteOfflineMedia("item-del");
    expect(await service.getOfflineMedia("item-del")).toBeNull();
    expect(await service.getAllOfflineMedia()).toHaveLength(0);
  });

  it("enqueues progress sync and clears synced entries", async () => {
    const entry1 = await service.enqueueProgressSync("item-sync-1", 500000, false);
    const entry2 = await service.enqueueProgressSync("item-sync-2", 1000000, true);

    let pending = await service.getPendingSyncEntries();
    expect(pending).toHaveLength(2);

    // Enqueueing same item updates entry to latest position
    await service.enqueueProgressSync("item-sync-1", 750000, false);
    pending = await service.getPendingSyncEntries();
    expect(pending).toHaveLength(2);
    const item1 = pending.find((e) => e.itemId === "item-sync-1");
    expect(item1?.positionTicks).toBe(750000);

    // Clear entry1
    await service.clearSyncEntries([item1!.id]);
    pending = await service.getPendingSyncEntries();
    expect(pending).toHaveLength(1);
    expect(pending[0].itemId).toBe("item-sync-2");
  });

  it("marks item as watched and auto-marks when playback reaches 90%", async () => {
    const record: OfflineMediaRecord = {
      itemId: "movie-watch-1",
      title: "Gladiator II",
      type: "Movie",
      localPath: "finora_downloads/gladiator.mp4",
      fileSizeBytes: 2000000000,
      totalTicks: 100000000,
      playbackPositionTicks: 0,
      savedAt: Date.now()
    };

    await service.saveOfflineMedia(record);

    // Explicit mark as watched
    await service.markAsWatched("movie-watch-1");
    let updated = await service.getOfflineMedia("movie-watch-1");
    expect(updated?.isPlayed).toBe(true);
    expect(updated?.completedWatchedAt).toBeDefined();

    // Auto mark when position is >= 90%
    const record2: OfflineMediaRecord = {
      itemId: "movie-watch-2",
      title: "Dune Part Two",
      type: "Movie",
      localPath: "finora_downloads/dune2.mp4",
      fileSizeBytes: 2000000000,
      totalTicks: 10000,
      playbackPositionTicks: 0,
      savedAt: Date.now()
    };
    await service.saveOfflineMedia(record2);

    await service.updateLocalPlaybackPosition("movie-watch-2", 9500, 10000);
    updated = await service.getOfflineMedia("movie-watch-2");
    expect(updated?.isPlayed).toBe(true);
    expect(updated?.completedWatchedAt).toBeDefined();
  });

  it("automatically purges expired watched downloads after retention period (48h)", async () => {
    const now = Date.now();
    const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;
    const oneHourAgo = now - 1 * 60 * 60 * 1000;

    const expiredRecord: OfflineMediaRecord = {
      itemId: "expired-item",
      title: "Old Watched Movie",
      type: "Movie",
      localPath: "finora_downloads/old.mp4",
      fileSizeBytes: 1500000000,
      totalTicks: 1000,
      playbackPositionTicks: 1000,
      isPlayed: true,
      completedWatchedAt: threeDaysAgo,
      savedAt: threeDaysAgo
    };

    const freshRecord: OfflineMediaRecord = {
      itemId: "fresh-item",
      title: "Recently Watched Movie",
      type: "Movie",
      localPath: "finora_downloads/recent.mp4",
      fileSizeBytes: 1500000000,
      totalTicks: 1000,
      playbackPositionTicks: 1000,
      isPlayed: true,
      completedWatchedAt: oneHourAgo,
      savedAt: oneHourAgo
    };

    const unplayedRecord: OfflineMediaRecord = {
      itemId: "unplayed-item",
      title: "Unplayed Movie",
      type: "Movie",
      localPath: "finora_downloads/unplayed.mp4",
      fileSizeBytes: 1500000000,
      totalTicks: 1000,
      playbackPositionTicks: 0,
      savedAt: threeDaysAgo
    };

    await service.saveOfflineMedia(expiredRecord);
    await service.saveOfflineMedia(freshRecord);
    await service.saveOfflineMedia(unplayedRecord);

    const deletedIds = await service.cleanupExpiredWatchedMedia(48);
    expect(deletedIds).toEqual(["expired-item"]);

    const FileSystem = require("expo-file-system/legacy");
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(expiredRecord.localPath, { idempotent: true });
    expect(FileSystem.deleteAsync).not.toHaveBeenCalledWith(freshRecord.localPath, { idempotent: true });

    const remaining = await service.getAllOfflineMedia();
    expect(remaining).toHaveLength(2);
    expect(remaining.map((r) => r.itemId)).toEqual(
      expect.arrayContaining(["fresh-item", "unplayed-item"])
    );
  });

  it("verifies physical files and detects orphans", async () => {
    const FileSystem = require("expo-file-system/legacy");
    // Mock getInfoAsync to return exists=false for missing item
    (FileSystem.getInfoAsync as jest.Mock).mockImplementation(async (path: string) => {
      if (path.includes("missing")) {
        return { exists: false, isDirectory: false };
      }
      return { exists: true, isDirectory: false, size: 450000000 };
    });

    const existingRecord: OfflineMediaRecord = {
      itemId: "real-1",
      title: "Real File",
      type: "Movie",
      localPath: "file:///mock-documents/finora_downloads/real.mp4",
      fileSizeBytes: 450000000,
      totalTicks: 1000,
      playbackPositionTicks: 0,
      savedAt: Date.now()
    };

    const orphanRecord: OfflineMediaRecord = {
      itemId: "phantom-1",
      title: "Phantom File",
      type: "Movie",
      localPath: "file:///mock-documents/finora_downloads/missing.mp4",
      fileSizeBytes: 7500000000, // 7.5 GB fake size!
      totalTicks: 1000,
      playbackPositionTicks: 0,
      savedAt: Date.now()
    };

    await service.saveOfflineMedia(existingRecord);
    await service.saveOfflineMedia(orphanRecord);

    const verified = await service.getVerifiedOfflineMedia();
    expect(verified.hasOrphans).toBe(true);
    expect(verified.totalPhysicalBytes).toBe(450000000); // Only counts the real file!

    const orphanCount = await service.cleanupOrphanMedia();
    expect(orphanCount).toBe(1);

    const afterCleanup = await service.getAllOfflineMedia();
    expect(afterCleanup).toHaveLength(1);
    expect(afterCleanup[0].itemId).toBe("real-1");
  });

  it("cleans up unregistered/orphaned disk files that are not in the catalog", async () => {
    const FileSystem = require("expo-file-system/legacy");
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true, isDirectory: true });
    (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValueOnce([
      "item-active.mp4",
      "orphan-ghost.mp4"
    ]);

    const activeRecord: OfflineMediaRecord = {
      itemId: "item-active",
      title: "Active Video",
      type: "Movie",
      localPath: "file:///mock-documents/finora_downloads/item-active.mp4",
      fileSizeBytes: 500000000,
      totalTicks: 1000,
      playbackPositionTicks: 0,
      savedAt: Date.now()
    };
    await service.saveOfflineMedia(activeRecord);

    const deleted = await service.cleanupOrphanDiskFiles();
    expect(deleted).toBe(1);
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      "file:///mock-documents/finora_downloads/orphan-ghost.mp4",
      { idempotent: true }
    );
    expect(FileSystem.deleteAsync).not.toHaveBeenCalledWith(
      "file:///mock-documents/finora_downloads/item-active.mp4",
      { idempotent: true }
    );
  });
});
