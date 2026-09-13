import { Image } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import { QueryClient } from "@tanstack/react-query";
import { logger } from "../network/logger";

export interface ClearCacheResult {
  success: boolean;
  imageDiskCacheCleared: boolean;
  imageMemoryCacheCleared: boolean;
  queryCacheCleared: boolean;
  tempFilesCleared: number;
  error?: string;
}

export class CacheService {
  /**
   * Clears all expo-image disk and memory caches.
   */
  public async clearImageCache(): Promise<{ disk: boolean; memory: boolean }> {
    let disk = false;
    let memory = false;

    try {
      if (typeof Image.clearDiskCache === "function") {
        await Image.clearDiskCache();
        disk = true;
      }
    } catch (e: any) {
      logger.warn("[CacheService] Failed to clear image disk cache:", e?.message);
    }

    try {
      if (typeof Image.clearMemoryCache === "function") {
        await Image.clearMemoryCache();
        memory = true;
      }
    } catch (e: any) {
      logger.warn("[CacheService] Failed to clear image memory cache:", e?.message);
    }

    return { disk, memory };
  }

  /**
   * Clears temporary files located in FileSystem.cacheDirectory.
   */
  public async clearTempFileSystemCache(): Promise<number> {
    let deletedCount = 0;
    try {
      if (FileSystem.cacheDirectory && typeof FileSystem.readDirectoryAsync === "function") {
        const files = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
        for (const file of files) {
          try {
            await FileSystem.deleteAsync(`${FileSystem.cacheDirectory}${file}`, {
              idempotent: true
            });
            deletedCount++;
          } catch {
            // Ignore single file deletion failures
          }
        }
      }
    } catch (e: any) {
      logger.warn("[CacheService] Failed to read or clear FileSystem cache:", e?.message);
    }
    return deletedCount;
  }

  /**
   * Clears TanStack Query cache if client is provided.
   */
  public clearQueryCache(queryClient?: QueryClient): boolean {
    if (!queryClient) return false;
    try {
      queryClient.clear();
      return true;
    } catch (e: any) {
      logger.warn("[CacheService] Failed to clear QueryClient cache:", e?.message);
      return false;
    }
  }

  /**
   * Clears image cache, temporary file system cache, and query cache.
   */
  public async clearAllCaches(queryClient?: QueryClient): Promise<ClearCacheResult> {
    logger.info("[CacheService] Clearing all application caches...");

    const { disk, memory } = await this.clearImageCache();
    const tempFilesCleared = await this.clearTempFileSystemCache();
    const queryCacheCleared = this.clearQueryCache(queryClient);

    logger.info(
      `[CacheService] Cache cleared successfully (diskCache: ${disk}, memoryCache: ${memory}, queries: ${queryCacheCleared}, tempFiles: ${tempFilesCleared})`
    );

    return {
      success: true,
      imageDiskCacheCleared: disk,
      imageMemoryCacheCleared: memory,
      queryCacheCleared,
      tempFilesCleared
    };
  }
}

export const cacheService = new CacheService();
