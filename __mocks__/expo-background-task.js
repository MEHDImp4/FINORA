const BackgroundTaskResult = {
  Success: 1,
  Failed: 2
};

module.exports = {
  BackgroundTaskResult,
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined)
};
