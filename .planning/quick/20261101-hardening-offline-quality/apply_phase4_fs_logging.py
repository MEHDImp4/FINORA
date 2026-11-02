import subprocess
from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one occurrence, got {count}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1))

adapter = Path("src/core/filesystem/FileSystemAdapter.ts")
adapter.parent.mkdir(parents=True, exist_ok=True)
adapter.write_text(r'''import * as ExpoLegacyFileSystem from "expo-file-system/legacy";

/**
 * FINORA filesystem boundary.
 *
 * Domain code depends on this interface instead of Expo's legacy module so the
 * implementation can move to the modern Expo filesystem API once download
 * resume/range parity is available.
 */
export interface FinoraFileSystem {
  readonly documentDirectory: typeof ExpoLegacyFileSystem.documentDirectory;
  readonly cacheDirectory: typeof ExpoLegacyFileSystem.cacheDirectory;
  getInfoAsync: typeof ExpoLegacyFileSystem.getInfoAsync;
  deleteAsync: typeof ExpoLegacyFileSystem.deleteAsync;
  readDirectoryAsync: typeof ExpoLegacyFileSystem.readDirectoryAsync;
  makeDirectoryAsync: typeof ExpoLegacyFileSystem.makeDirectoryAsync;
  getFreeDiskStorageAsync: typeof ExpoLegacyFileSystem.getFreeDiskStorageAsync;
  getTotalDiskCapacityAsync: typeof ExpoLegacyFileSystem.getTotalDiskCapacityAsync;
  createDownloadResumable: typeof ExpoLegacyFileSystem.createDownloadResumable;
}

/** Legacy-backed implementation kept intentionally until modern Expo has resume parity. */
export class ExpoLegacyFileSystemAdapter implements FinoraFileSystem {
  get documentDirectory() {
    return ExpoLegacyFileSystem.documentDirectory;
  }

  get cacheDirectory() {
    return ExpoLegacyFileSystem.cacheDirectory;
  }

  getInfoAsync: typeof ExpoLegacyFileSystem.getInfoAsync = (...args) =>
    ExpoLegacyFileSystem.getInfoAsync(...args);
  deleteAsync: typeof ExpoLegacyFileSystem.deleteAsync = (...args) =>
    ExpoLegacyFileSystem.deleteAsync(...args);
  readDirectoryAsync: typeof ExpoLegacyFileSystem.readDirectoryAsync = (...args) =>
    ExpoLegacyFileSystem.readDirectoryAsync(...args);
  makeDirectoryAsync: typeof ExpoLegacyFileSystem.makeDirectoryAsync = (...args) =>
    ExpoLegacyFileSystem.makeDirectoryAsync(...args);
  getFreeDiskStorageAsync: typeof ExpoLegacyFileSystem.getFreeDiskStorageAsync = (...args) =>
    ExpoLegacyFileSystem.getFreeDiskStorageAsync(...args);
  getTotalDiskCapacityAsync: typeof ExpoLegacyFileSystem.getTotalDiskCapacityAsync = (...args) =>
    ExpoLegacyFileSystem.getTotalDiskCapacityAsync(...args);
  createDownloadResumable: typeof ExpoLegacyFileSystem.createDownloadResumable = (...args) =>
    ExpoLegacyFileSystem.createDownloadResumable(...args);
}

export const fileSystem: FinoraFileSystem = new ExpoLegacyFileSystemAdapter();
''')

index = Path("src/core/filesystem/index.ts")
index.write_text('export * from "./FileSystemAdapter";\n')

replace_once(
    "src/features/offline/offlineStorage.ts",
    'import * as FileSystem from "expo-file-system/legacy";',
    'import { fileSystem as FileSystem } from "../../core/filesystem";\nimport { logger } from "../../core/network/logger";'
)
replace_once(
    "src/features/offline/downloadManager.ts",
    'import * as FileSystem from "expo-file-system/legacy";',
    'import { fileSystem as FileSystem } from "../../core/filesystem";'
)
replace_once(
    "src/features/offline/diskSpace.ts",
    'import * as FileSystem from "expo-file-system/legacy";',
    'import { fileSystem as FileSystem } from "../../core/filesystem";'
)
replace_once(
    "src/core/cache/cacheService.ts",
    'import * as FileSystem from "expo-file-system/legacy";',
    'import { fileSystem as FileSystem } from "../filesystem";'
)

# Recoverable corrupted storage is actionable, but never log the payload itself.
replace_once(
    "src/features/offline/offlineStorage.ts",
    '''  } catch {\n    return [];\n  }\n}\n\n/**\n * Serializes storage mutations per Jellyfin account scope.''',
    '''  } catch (error) {\n    logger.warn("[OfflineStorage] Ignoring invalid persisted array payload.", error);\n    return [];\n  }\n}\n\n/**\n * Serializes storage mutations per Jellyfin account scope.'''
)

# Expected logout network failure: debug only, no URL/token/header data.
replace_once(
    "src/core/jellyfin/authRepository.ts",
    '''    } catch {\n      // Ignore network errors during logout to guarantee local wipe\n    } finally {''',
    '''    } catch (error) {\n      logger.debug("[AuthRepository] Server logout unavailable; continuing local credential wipe.", error);\n    } finally {'''
)

# Cache cleanup is best effort; emit a safe diagnostic without leaking a local path.
replace_once(
    "src/core/cache/cacheService.ts",
    '''          } catch {\n            // Ignore single file deletion failures\n          }''',
    '''          } catch (error) {\n            logger.debug("[CacheService] One cache entry could not be deleted.", error);\n          }'''
)

# Rollback failure is serious because the store must fall back to fail-closed cleanup.
server_store = Path("src/stores/serverStore.ts")
text = server_store.read_text()
if 'from "../core/network/logger"' not in text:
    text = text.replace(
        'import { offlineStorageService } from "../features/offline/offlineStorage";\n',
        'import { offlineStorageService } from "../features/offline/offlineStorage";\nimport { logger } from "../core/network/logger";\n'
    )
text = text.replace(
    '''          } catch {\n            // Fall through to fail-closed cleanup below.\n          }''',
    '''          } catch (error) {\n            logger.error("[ServerStore] Account-switch rollback failed; applying fail-closed cleanup.", error);\n          }''',
    1
)
server_store.write_text(text)

# Dedicated adapter test: domain can replace the implementation without mocking Expo everywhere.
test = Path("src/core/filesystem/__tests__/FileSystemAdapter.test.ts")
test.parent.mkdir(parents=True, exist_ok=True)
test.write_text(r'''import * as ExpoLegacyFileSystem from "expo-file-system/legacy";
import { ExpoLegacyFileSystemAdapter } from "../FileSystemAdapter";

describe("ExpoLegacyFileSystemAdapter", () => {
  it("delegates filesystem operations through the FINORA boundary", async () => {
    const adapter = new ExpoLegacyFileSystemAdapter();
    await adapter.getInfoAsync("file:///mock-documents/test.mp4");
    expect(ExpoLegacyFileSystem.getInfoAsync).toHaveBeenCalledWith(
      "file:///mock-documents/test.mp4"
    );
  });
});
''')

paths = [
    "src/core/filesystem/FileSystemAdapter.ts",
    "src/core/filesystem/index.ts",
    "src/core/filesystem/__tests__/FileSystemAdapter.test.ts",
    "src/features/offline/offlineStorage.ts",
    "src/features/offline/downloadManager.ts",
    "src/features/offline/diskSpace.ts",
    "src/core/cache/cacheService.ts",
    "src/core/jellyfin/authRepository.ts",
    "src/stores/serverStore.ts",
]
subprocess.run(["git", "add", *paths], check=True)
print("Phase 4 filesystem abstraction + secure logging applied")
