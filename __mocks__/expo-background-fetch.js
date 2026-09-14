const BackgroundFetchResult = {
  NoData: 1,
  NewData: 2,
  Failed: 3
};

const BackgroundFetchStatus = {
  Restricted: 0,
  Denied: 1,
  Available: 2
};

module.exports = {
  BackgroundFetchResult,
  BackgroundFetchStatus,
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
  getStatusAsync: jest.fn().mockResolvedValue(2)
};
