module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^expo-video$": "<rootDir>/__mocks__/expo-video.js",
    "^expo-screen-orientation$": "<rootDir>/__mocks__/expo-screen-orientation.js",
    "^react-test-renderer$": "<rootDir>/__mocks__/react-test-renderer.js"
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
