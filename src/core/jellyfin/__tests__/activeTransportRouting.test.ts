import { AuthRepository, ACTIVE_SESSION_STORAGE_KEY } from "../authRepository";
import { autoDetectServerConnection } from "../serverDiscovery";

const LAN_URL = "http://192.168.1.50:8096";
const WAN_URL = "https://jellyfin.example.com";
const SERVER_ID = "server-transport-1";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe("verified active transport routing", () => {
  it("rejects a reachable LAN endpoint that belongs to another Jellyfin server", async () => {
    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      if (url.startsWith(LAN_URL)) {
        return {
          ok: true,
          json: async () => ({ Id: "different-server", ServerName: "Wrong Jellyfin" })
        };
      }
      if (url.startsWith(WAN_URL)) {
        return {
          ok: true,
          json: async () => ({ Id: SERVER_ID, ServerName: "Home Jellyfin" })
        };
      }
      return { ok: false };
    }) as typeof fetch;

    const result = await autoDetectServerConnection(
      LAN_URL,
      WAN_URL,
      WAN_URL,
      1500,
      SERVER_ID
    );

    expect(result.activeUrl).toBe(WAN_URL);
    expect(result.strategy).toBe("remote-wan");
    expect(result.isLocal).toBe(false);
  });

  it("restores the session on the verified LAN route while keeping the canonical URL", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ Id: SERVER_ID, ServerName: "Home Jellyfin" })
    }) as typeof fetch;

    const httpClient = {
      request: jest
        .fn()
        .mockResolvedValueOnce({ Id: SERVER_ID })
        .mockResolvedValueOnce({ ServerName: "Home Jellyfin" })
    };
    const client = {
      initialize: jest.fn().mockResolvedValue(undefined),
      setServerUrl: jest.fn(),
      setAuthToken: jest.fn(),
      getHttpClient: jest.fn(() => httpClient),
      getServerUrl: jest.fn(() => LAN_URL)
    };
    const secureStorage = {
      getToken: jest.fn().mockResolvedValue("token-123"),
      setToken: jest.fn(),
      deleteToken: jest.fn()
    };
    const prefStorage = {
      getItem: jest.fn(async (key: string) => {
        if (key === ACTIVE_SESSION_STORAGE_KEY) {
          return {
            userId: "user-1",
            userName: "Mehdi",
            serverId: SERVER_ID,
            serverUrl: WAN_URL,
            lastActiveAt: 1
          };
        }
        if (key === "finora_saved_servers") {
          return [
            {
              id: SERVER_ID,
              name: "Home Jellyfin",
              url: WAN_URL,
              localUrl: LAN_URL,
              remoteUrl: WAN_URL,
              lastUsedAt: 1
            }
          ];
        }
        return null;
      }),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };

    const repository = new AuthRepository(
      client as never,
      secureStorage as never,
      prefStorage as never,
      jest.fn().mockResolvedValue(true)
    );

    const session = await repository.restoreSession(httpClient as never);

    expect(session?.serverUrl).toBe(LAN_URL);
    expect(session?.canonicalServerUrl).toBe(WAN_URL);
    expect(client.initialize).toHaveBeenCalledWith(LAN_URL);
    expect(client.setAuthToken).toHaveBeenLastCalledWith("token-123");
  });
});
