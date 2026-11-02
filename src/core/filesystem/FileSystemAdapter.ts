import * as ExpoLegacyFileSystem from "expo-file-system/legacy";

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
