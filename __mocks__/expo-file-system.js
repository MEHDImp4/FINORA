module.exports = {
  documentDirectory: "file:///mock-documents/",
  cacheDirectory: "file:///mock-cache/",
  makeDirectoryAsync: jest.fn(async () => {}),
  getInfoAsync: jest.fn(async (uri) => ({ exists: true, size: 500000000 })),
  readDirectoryAsync: jest.fn(async () => []),
  deleteAsync: jest.fn(async () => {}),
  createDownloadResumable: jest.fn((url, fileUri, options, callback) => ({
    downloadAsync: jest.fn(
      () =>
        new Promise((resolve) => {
          // Keep active in tests unless canceled
        })
    ),
    pauseAsync: jest.fn(async () => ({})),
    resumeAsync: jest.fn(
      () =>
        new Promise((resolve) => {
          // Keep active in tests unless canceled
        })
    ),
    cancelAsync: jest.fn(async () => {})
  }))
};
