// Mock for expo-brightness
module.exports = {
  getBrightnessAsync: jest.fn().mockResolvedValue(0.7),
  setBrightnessAsync: jest.fn().mockResolvedValue(undefined),
  getSystemBrightnessAsync: jest.fn().mockResolvedValue(0.7),
  setSystemBrightnessAsync: jest.fn().mockResolvedValue(undefined),
  restoreSystemBrightnessAsync: jest.fn().mockResolvedValue(undefined),
  BrightnessMode: {
    UNKNOWN: 0,
    AUTOMATIC: 1,
    MANUAL: 2
  }
};
