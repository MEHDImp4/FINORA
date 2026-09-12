module.exports = {
  Orientation: {
    UNKNOWN: 0,
    PORTRAIT_UP: 1,
    PORTRAIT_DOWN: 2,
    LANDSCAPE_LEFT: 3,
    LANDSCAPE_RIGHT: 4
  },
  OrientationLock: {
    DEFAULT: 0,
    ALL: 1,
    PORTRAIT: 2,
    PORTRAIT_UP: 3,
    PORTRAIT_DOWN: 4,
    LANDSCAPE: 5,
    LANDSCAPE_LEFT: 6,
    LANDSCAPE_RIGHT: 7
  },
  unlockAsync: jest.fn().mockResolvedValue(undefined),
  lockAsync: jest.fn().mockResolvedValue(undefined),
  getOrientationAsync: jest.fn().mockResolvedValue(1),
  addOrientationChangeListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  removeOrientationChangeListener: jest.fn()
};
