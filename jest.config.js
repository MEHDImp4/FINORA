module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^expo-video$": "<rootDir>/__mocks__/expo-video.js",
    "^expo-file-system(.*)$": "<rootDir>/__mocks__/expo-file-system.js",
    "^expo-screen-orientation$": "<rootDir>/__mocks__/expo-screen-orientation.js",
    "^react-test-renderer$": "<rootDir>/__mocks__/react-test-renderer.js",
    "\\.(png|jpg|jpeg|gif|svg)$": "<rootDir>/__mocks__/fileMock.js"
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx"
        }
      }
    ]
  }
};
