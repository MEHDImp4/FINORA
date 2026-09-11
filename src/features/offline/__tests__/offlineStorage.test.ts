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
});
