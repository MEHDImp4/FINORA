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

module.exports = {
  NetworkStateType,
  getNetworkStateAsync
};
