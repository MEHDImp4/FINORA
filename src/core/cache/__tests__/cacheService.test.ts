import { cacheService } from "../cacheService";
import { Image } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import { QueryClient } from "@tanstack/react-query";

describe("CacheService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("clears expo-image disk and memory cache", async () => {
    const result = await cacheService.clearImageCache();
    expect(result.disk).toBe(true);
    expect(result.memory).toBe(true);
    expect(Image.clearDiskCache).toHaveBeenCalled();
    expect(Image.clearMemoryCache).toHaveBeenCalled();
  });

  it("clears temporary files from FileSystem cacheDirectory", async () => {
    (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValueOnce(["thumb1.jpg", "video_cache.tmp"]);

    const count = await cacheService.clearTempFileSystemCache();
    expect(count).toBe(2);
    expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(2);
  });

  it("clears TanStack QueryClient cache", () => {
    const queryClient = new QueryClient();
    jest.spyOn(queryClient, "clear");

    const success = cacheService.clearQueryCache(queryClient);
    expect(success).toBe(true);
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
  });

  it("clearAllCaches coordinates all cache clearing layers", async () => {
    (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValueOnce(["temp1.json"]);
    const queryClient = new QueryClient();
    jest.spyOn(queryClient, "clear");

    const result = await cacheService.clearAllCaches(queryClient);
    expect(result.success).toBe(true);
    expect(result.imageDiskCacheCleared).toBe(true);
    expect(result.imageMemoryCacheCleared).toBe(true);
    expect(result.queryCacheCleared).toBe(true);
    expect(result.tempFilesCleared).toBe(1);
    expect(queryClient.clear).toHaveBeenCalled();
  });
});
