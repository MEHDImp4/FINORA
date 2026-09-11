let storage = {};

const mockAsyncStorage = {
  setItem: jest.fn(async (key, value) => {
    storage[key] = String(value);
    return null;
  }),
  getItem: jest.fn(async (key) => {
    return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
  }),
  removeItem: jest.fn(async (key) => {
    delete storage[key];
    return null;
  }),
  clear: jest.fn(async () => {
    storage = {};
    return null;
  }),
  getAllKeys: jest.fn(async () => {
    return Object.keys(storage);
  }),
  multiGet: jest.fn(async (keys) => {
    return keys.map((key) => [key, storage[key] || null]);
  }),
  multiSet: jest.fn(async (keyValuePairs) => {
    keyValuePairs.forEach(([key, value]) => {
      storage[key] = String(value);
    });
    return null;
  }),
  multiRemove: jest.fn(async (keys) => {
    keys.forEach((key) => {
      delete storage[key];
    });
    return null;
  })
};

module.exports = mockAsyncStorage;
module.exports.default = mockAsyncStorage;
