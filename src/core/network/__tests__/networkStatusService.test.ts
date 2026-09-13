import {
  checkInternetReachability,
  checkServerReachability,
  diagnoseNetworkFailure
} from "../networkStatusService";

describe("networkStatusService", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe("checkInternetReachability", () => {
    it("returns true when probe endpoint returns 204", async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        status: 204
      });

      const reachable = await checkInternetReachability(500);
      expect(reachable).toBe(true);
    });

    it("returns true when probe endpoint returns 200", async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        status: 200
      });

      const reachable = await checkInternetReachability(500);
      expect(reachable).toBe(true);
    });

    it("returns false when all probes fail", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network timeout"));

      const reachable = await checkInternetReachability(500);
      expect(reachable).toBe(false);
    });
  });

  describe("checkServerReachability", () => {
    it("returns true when Jellyfin public info returns 200", async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        status: 200
      });

      const reachable = await checkServerReachability("http://192.168.1.50:8096", 500);
      expect(reachable).toBe(true);
    });

    it("returns false when server is unreachable or offline", async () => {
      global.fetch = jest.fn().mockRejectedValueOnce(new Error("Connection refused"));

      const reachable = await checkServerReachability("http://192.168.1.50:8096", 500);
      expect(reachable).toBe(false);
    });

    it("returns false for invalid or empty URL", async () => {
      expect(await checkServerReachability("")).toBe(false);
      expect(await checkServerReachability("not-a-url")).toBe(false);
    });
  });

  describe("diagnoseNetworkFailure", () => {
    it("diagnoses 'no_internet' when internet reachability fails", async () => {
      // Probes fail
      global.fetch = jest.fn().mockRejectedValue(new Error("No route to host"));

      const result = await diagnoseNetworkFailure("http://192.168.1.50:8096", 500);
      expect(result).toBe("no_internet");
    });

    it("diagnoses 'server_unreachable' when internet is OK but server fails", async () => {
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes("clients3.google.com") || url.includes("1.1.1.1")) {
          return Promise.resolve({ status: 204 });
        }
        // Jellyfin endpoint fails
        return Promise.reject(new Error("Server connection refused"));
      });

      const result = await diagnoseNetworkFailure("http://192.168.1.50:8096", 500);
      expect(result).toBe("server_unreachable");
    });

    it("diagnoses 'unknown' when both internet and server are reachable", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200
      });

      const result = await diagnoseNetworkFailure("http://192.168.1.50:8096", 500);
      expect(result).toBe("unknown");
    });
  });
});
