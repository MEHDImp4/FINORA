import {
  autoDetectServerConnection,
  isLocalNetworkHost,
  normalizeServerUrl,
  normalizeServerUrlForCredentials,
  validateAndDiscoverServer
} from "../serverDiscovery";
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

  describe("credential transport policy", () => {
    it("allows private LAN, loopback, local DNS and Tailscale/CGNAT hosts", () => {
      expect(isLocalNetworkHost("192.168.1.50")).toBe(true);
      expect(isLocalNetworkHost("10.0.0.5")).toBe(true);
      expect(isLocalNetworkHost("172.20.1.2")).toBe(true);
      expect(isLocalNetworkHost("127.0.0.1")).toBe(true);
      expect(isLocalNetworkHost("localhost")).toBe(true);
      expect(isLocalNetworkHost("jellyfin.local")).toBe(true);
      expect(isLocalNetworkHost("jellyfin")).toBe(true);
      expect(isLocalNetworkHost("100.100.20.30")).toBe(true);
      expect(isLocalNetworkHost("::1")).toBe(true);
      expect(isLocalNetworkHost("fd7a:115c:a1e0::1")).toBe(true);
    });

    it("rejects public hosts over cleartext HTTP before credentials are sent", () => {
      expect(() =>
        normalizeServerUrlForCredentials("http://jellyfin.example.com:8096")
      ).toThrow("Unencrypted HTTP is only allowed for local/private Jellyfin servers");
    });

    it("allows HTTPS for public hosts", () => {
      const result = normalizeServerUrlForCredentials("https://jellyfin.example.com");
      expect(result.url).toBe("https://jellyfin.example.com");
      expect(result.isHttps).toBe(true);
    });

    it("does not mistake a public DNS name starting with fc/fd/fe for a private address", () => {
      expect(isLocalNetworkHost("fc-proxy.example.com")).toBe(false);
      expect(isLocalNetworkHost("fdcdn.example.com")).toBe(false);
      expect(isLocalNetworkHost("fcorp.jellyfin.example.com")).toBe(false);
      expect(isLocalNetworkHost("february.example.com")).toBe(false);

      expect(() => normalizeServerUrlForCredentials("http://fc-proxy.example.com")).toThrow(
        "Unencrypted HTTP is only allowed for local/private Jellyfin servers"
      );
    });

    it("still recognises genuine IPv6 loopback, unique-local and link-local literals", () => {
      expect(isLocalNetworkHost("::1")).toBe(true);
      expect(isLocalNetworkHost("fc00::1")).toBe(true);
      expect(isLocalNetworkHost("fd7a:115c:a1e0::1")).toBe(true);
      expect(isLocalNetworkHost("fe80::1")).toBe(true);
      expect(isLocalNetworkHost("[fd00::1]")).toBe(true);
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

    it("keeps local HTTP available but returns an explicit warning", async () => {
      mockHttpClient.request.mockResolvedValue({
        Id: "server-local",
        ServerName: "LAN Jellyfin",
        Version: "10.10.0"
      });

      const discovery = await validateAndDiscoverServer("http://192.168.1.20:8096", mockHttpClient);

      expect(discovery.isHttps).toBe(false);
      expect(discovery.hasWarning).toBe(true);
      expect(discovery.warningMessage).toContain("not encrypted");
    });

    it("does not contact a public HTTP server", async () => {
      await expect(
        validateAndDiscoverServer("http://jellyfin.example.com:8096", mockHttpClient)
      ).rejects.toThrow("Unencrypted HTTP is only allowed");
      expect(mockHttpClient.request).not.toHaveBeenCalled();
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

  describe("autoDetectServerConnection", () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("prefers local LAN URL when local endpoint responds with valid Jellyfin payload", async () => {
      global.fetch = jest.fn().mockImplementation(async (url: string) => {
        if (url.includes("192.168.1.50")) {
          return {
            ok: true,
            json: async () => ({ Id: "srv-local-1", ServerName: "Local Jellyfin" })
          };
        }
        return { ok: false };
      });

      const result = await autoDetectServerConnection(
        "http://192.168.1.50:8096",
        "https://finora.mydomain.com",
        "https://finora.mydomain.com"
      );

      expect(result.activeUrl).toBe("http://192.168.1.50:8096");
      expect(result.isLocal).toBe(true);
      expect(result.strategy).toBe("local-lan");
    });

    it("falls back to remote WAN URL when local LAN endpoint fails or is unreachable", async () => {
      global.fetch = jest.fn().mockImplementation(async (url: string) => {
        if (url.includes("192.168.1.50")) {
          throw new Error("Local host unreachable");
        }
        if (url.includes("finora.mydomain.com")) {
          return {
            ok: true,
            json: async () => ({ Id: "srv-remote-1", ServerName: "Remote Jellyfin" })
          };
        }
        return { ok: false };
      });

      const result = await autoDetectServerConnection(
        "http://192.168.1.50:8096",
        "https://finora.mydomain.com",
        "https://finora.mydomain.com"
      );

      expect(result.activeUrl).toBe("https://finora.mydomain.com");
      expect(result.isLocal).toBe(false);
      expect(result.strategy).toBe("remote-wan");
    });

    it("uses fallback URL if both local and remote candidates fail", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network offline"));

      const result = await autoDetectServerConnection(
        "http://192.168.1.50:8096",
        "https://finora.mydomain.com",
        "https://fallback.domain.com"
      );

      expect(result.activeUrl).toBe("https://fallback.domain.com");
      expect(result.strategy).toBe("fallback");
    });
  });
});
