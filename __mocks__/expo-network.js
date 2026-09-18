const NetworkStateType = {
  NONE: "NONE",
  UNKNOWN: "UNKNOWN",
  CELLULAR: "CELLULAR",
  WIFI: "WIFI",
  BLUETOOTH: "BLUETOOTH",
  ETHERNET: "ETHERNET",
  WIMAX: "WIMAX",
  VPN: "VPN",
  OTHER: "OTHER"
};

const getNetworkStateAsync = jest.fn().mockResolvedValue({
  type: "WIFI",
  isConnected: true,
  isInternetReachable: true
});

const networkListeners = new Set();

const addNetworkStateListener = jest.fn((listener) => {
  if (typeof listener === "function") networkListeners.add(listener);
  return {
    remove: jest.fn(() => networkListeners.delete(listener))
  };
});

/** Test helper: simulates the OS emitting a network state change. */
function emitNetworkState() {
  networkListeners.forEach((listener) => listener());
}

function resetNetworkListeners() {
  networkListeners.clear();
}

module.exports = {
  NetworkStateType,
  getNetworkStateAsync,
  addNetworkStateListener,
  __emitNetworkState: emitNetworkState,
  __resetNetworkListeners: resetNetworkListeners
};
