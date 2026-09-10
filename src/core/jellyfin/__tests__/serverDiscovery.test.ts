import { normalizeServerUrl, validateAndDiscoverServer } from "../serverDiscovery";
import { HttpClient } from "../../network/httpClient";
import { FinoraError } from "../../errors";

jest.mock("../../network/httpClient");

describe("serverDiscovery", () => {
  describe("normalizeServerUrl", () => {
    it("normalizes clean https URL without trailing slash", () => {
      const result = normalizeServerUrl("https://jellyfin.example.com/");
      expect(result.url).toBe("https://jellyfin.example.com");
      expect(result.isHttps).toBe(true);
      expect(result.hasWarning).toBe(false);
      expect(result.warningMessage).toBeUndefined();
    });

    it("defaults to https if protocol is missing", () => {
      const result = normalizeServerUrl("jellyfin.example.com:8096");
      expect(result.url).toBe("https://jellyfin.example.com:8096");
      expect(result.isHttps).toBe(true);
      expect(result.hasWarning).toBe(false);
    });

    it("detects unencrypted HTTP and sets warning flag & message", () => {
      const result = normalizeServerUrl("http://192.168.1.100:8096/");
      expect(result.url).toBe("http://192.168.1.100:8096");
      expect(result.isHttps).toBe(false);
      expect(result.hasWarning).toBe(true);
      expect(result.warningMessage).toContain("unencrypted HTTP");
    });

    it("throws FinoraError on empty input", () => {
      expect(() => normalizeServerUrl("   ")).toThrow(FinoraError);
    });

    it("throws FinoraError on invalid protocol", () => {
      expect(() => normalizeServerUrl("ftp://files.example.com")).toThrow(FinoraError);
    });
  });

  describe("validateAndDiscoverServer", () => {
    let mockHttpClient: jest.Mocked<HttpClient>;

    beforeEach(() => {
      mockHttpClient = new HttpClient() as jest.Mocked<HttpClient>;
      mockHttpClient.request = jest.fn();
    });

    it("returns parsed server info when /System/Info/Public responds properly", async () => {
      mockHttpClient.request.mockResolvedValue({
        Id: "server-uuid-999",
        ServerName: "My Jellyfin Server",
        Version: "10.9.11",
        OperatingSystem: "Linux"
      });

      const discovery = await validateAndDiscoverServer("https://jellyfin.example.com", mockHttpClient);

      expect(discovery.serverId).toBe("server-uuid-999");
      expect(discovery.serverName).toBe("My Jellyfin Server");
      expect(discovery.version).toBe("10.9.11");
      expect(discovery.isHttps).toBe(true);
      expect(discovery.hasWarning).toBe(false);
    });

    it("throws FinoraError if server response lacks Id or ServerName", async () => {
      mockHttpClient.request.mockResolvedValue({
        SomeOtherProp: "not-jellyfin"
      });

      await expect(
        validateAndDiscoverServer("https://jellyfin.example.com", mockHttpClient)
      ).rejects.toThrow("Target does not appear to be a valid Jellyfin server");
    });

    it("throws SERVER_UNREACHABLE if network request fails", async () => {
      mockHttpClient.request.mockRejectedValue(new Error("Connection refused"));

      await expect(
        validateAndDiscoverServer("https://jellyfin.example.com", mockHttpClient)
      ).rejects.toThrow("Failed to connect to server");
    });
  });
});
