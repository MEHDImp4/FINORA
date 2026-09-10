const React = require("react");

module.exports = {
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  }),
  useLocalSearchParams: () => ({}),
  usePathname: () => "/",
  Stack: Object.assign(({ children }) => children || null, {
    Screen: () => null
  }),
  Tabs: Object.assign(({ children }) => children || null, {
    Screen: () => null
  }),
  Slot: ({ children }) => children || null,
  Link: ({ children }) => children || null
};
