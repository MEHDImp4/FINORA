const listeners = [];
const responseListeners = [];

module.exports = {
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted", granted: true }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted", granted: true }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue("mock-notification-id"),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(),
  dismissAllNotificationsAsync: jest.fn().mockResolvedValue(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(),
  addNotificationReceivedListener: jest.fn((callback) => {
    listeners.push(callback);
    return {
      remove: jest.fn(() => {
        const index = listeners.indexOf(callback);
        if (index >= 0) listeners.splice(index, 1);
      })
    };
  }),
  addNotificationResponseReceivedListener: jest.fn((callback) => {
    responseListeners.push(callback);
    return {
      remove: jest.fn(() => {
        const index = responseListeners.indexOf(callback);
        if (index >= 0) responseListeners.splice(index, 1);
      })
    };
  }),
  AndroidImportance: {
    HIGH: 4,
    DEFAULT: 3,
    LOW: 2,
    MIN: 1,
    NONE: 0
  }
};
