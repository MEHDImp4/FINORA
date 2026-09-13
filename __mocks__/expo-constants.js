const constants = {
  expoConfig: {
    version: "1.0.0",
    name: "finora"
  },
  appOwnership: null,
  executionEnvironment: "bare"
};

const ExecutionEnvironment = {
  Bare: "bare",
  Standalone: "standalone",
  StoreClient: "storeClient"
};

const AppOwnership = {
  Expo: "expo"
};

module.exports = {
  ...constants,
  default: constants,
  ExecutionEnvironment,
  AppOwnership
};

