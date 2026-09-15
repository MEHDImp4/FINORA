const backgroundServer = {
  start: jest.fn(async () => {}),
  stop: jest.fn(async () => {}),
  isRunning: jest.fn(() => false),
  updateNotification: jest.fn(async () => {})
};

module.exports = backgroundServer;
module.exports.default = backgroundServer;
