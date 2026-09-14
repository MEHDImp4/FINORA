/**
 * Shared expo-file-system mock (also maps `expo-file-system/legacy`).
 *
 * Defaults are deliberately backward compatible with the pre-existing suites:
 * getInfoAsync reports an existing 500 MB file, and downloadAsync stays pending
 * until a test resolves it.
 *
 * Tests that need real behaviour use the `__` helpers below to control file
 * sizes and to resolve a transfer with a specific HTTP status (200/206/416/401).
 */

const DEFAULT_FILE_SIZE = 500000000;

/** uri -> size. A null size means "file does not exist". */
const fileSizes = new Map();
let defaultFileSize = DEFAULT_FILE_SIZE;

/** Recorded createDownloadResumable invocations. */
const downloadTasks = [];
/** Tasks whose downloadAsync promise has not been resolved yet. */
const pendingTasks = [];

function normalize(uri) {
  return String(uri);
}

function infoFor(uri) {
  const key = normalize(uri);
  if (fileSizes.has(key)) {
    const size = fileSizes.get(key);
    if (size === null) {
      return { exists: false, isDirectory: false, uri: key };
    }
    return { exists: true, uri: key, size, isDirectory: false, modificationTime: 0 };
  }
  if (defaultFileSize === null) {
    return { exists: false, isDirectory: false, uri: key };
  }
  return {
    exists: true,
    uri: key,
    size: defaultFileSize,
    isDirectory: false,
    modificationTime: 0
  };
}

const getInfoAsync = jest.fn(async (uri) => infoFor(uri));

const deleteAsync = jest.fn(async (uri) => {
  // Deleting makes the path read back as non-existent.
  fileSizes.set(normalize(uri), null);
});

const makeDirectoryAsync = jest.fn(async () => {});
const readDirectoryAsync = jest.fn(async () => []);

const createDownloadResumable = jest.fn((url, fileUri, options, callback, resumeData) => {
  let resolveFn;
  const promise = new Promise((resolve) => {
    resolveFn = resolve;
  });

  const task = {
    url,
    fileUri,
    options,
    resumeData,
    savable: jest.fn(() => ({ url, fileUri, options, resumeData })),
    downloadAsync: jest.fn(() => promise),
    resumeAsync: jest.fn(() => promise),
    pauseAsync: jest.fn(async () => ({
      url,
      fileUri,
      options,
      // Mirrors Android: the pause state records the current file length.
      resumeData: String(fileSizes.get(normalize(fileUri)) ?? defaultFileSize ?? 0)
    })),
    cancelAsync: jest.fn(async () => {})
  };

  const record = { url, fileUri, options, resumeData, task, callback, resolve: resolveFn };
  downloadTasks.push(record);
  pendingTasks.push(record);
  return task;
});

/**
 * Resolves the pending transfer for a given local file uri.
 * The HTTP status drives downloadManager's resume safety rules.
 */
async function completeTask(fileUri, result = {}) {
  const key = normalize(fileUri);
  const index = pendingTasks.findIndex((entry) => normalize(entry.fileUri) === key);
  if (index === -1) {
    throw new Error(`No pending download for ${key}`);
  }
  const entry = pendingTasks.splice(index, 1)[0];

  const status = result.status === undefined ? 206 : result.status;
  const uri = result.uri === undefined ? entry.fileUri : result.uri;

  if (entry.callback && (result.writtenBytes !== undefined || result.totalBytes !== undefined)) {
    entry.callback({
      totalBytesWritten: result.writtenBytes ?? 0,
      totalBytesExpectedToWrite: result.totalBytes ?? 0
    });
  }

  entry.resolve({ uri, status, headers: {}, mimeType: null });
  // Let the downloadManager promise chain progress.
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  return entry;
}

const __api = {
  /** Restores every default and forgets recorded calls/tasks. */
  __reset() {
    fileSizes.clear();
    defaultFileSize = DEFAULT_FILE_SIZE;
    downloadTasks.length = 0;
    pendingTasks.length = 0;
  },
  /** Forces the size (or non-existence) of a specific path. */
  __setFileSize(uri, size) {
    fileSizes.set(normalize(uri), size);
  },
  __removeFile(uri) {
    fileSizes.set(normalize(uri), null);
  },
  /** Changes the size reported for any path without an explicit override. */
  __setDefaultFileSize(size) {
    defaultFileSize = size;
  },
  __getDownloadTasks() {
    return downloadTasks;
  },
  /** Forgets recorded transfers without touching file sizes (simulates a process death). */
  __clearDownloadTasks() {
    downloadTasks.length = 0;
    pendingTasks.length = 0;
  },
  __getPendingCount() {
    return pendingTasks.length;
  },
  __completeTask: completeTask
};

module.exports = {
  documentDirectory: "file:///mock-documents/",
  cacheDirectory: "file:///mock-cache/",
  getInfoAsync,
  makeDirectoryAsync,
  readDirectoryAsync,
  deleteAsync,
  createDownloadResumable,
  ...__api
};
