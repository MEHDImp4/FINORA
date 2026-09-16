import { AuthRepository } from "../authRepository";

/**
 * A cleartext session is stored against a private IP. After the user roams to
 * another network that IP can belong to a different machine, so the token must
 * not be sent until the host proves it is the server that issued it.
 */
const LAN_URL = "http://192.168.1.50:8096";
const PUBLIC_HTTPS_URL = "https://jellyfin.example.com";
const TOKEN = "stored-lan-token";

interface HarnessOptions {
  serverId?: string;
  serverUrl?: string;
  probeResult?: { Id?: string } | null;
  probeRejects?: boolean;
}

function createHarness(options: HarnessOptions = {}) {
  const {
    serverId = "server-A",
    serverUrl = LAN_URL,
    probeResult = { Id: "server-A" },
    probeRejects = false
  } = options;

  const calls: string[] = [];

  const httpClient = {
    request: jest.fn(async (endpoint: string) => {
      calls.push(`request ${endpoint}`);
      if (endpoint === "/System/Info/Public") {
        if (probeRejects) {
          throw new Error("EHOSTUNREACH");
        }
        return probeResult;
      }
      return { ServerName: "Jellyfin" };
    })
  };

  const client = {
    initialize: jest.fn(async () => {
      calls.push("initialize");
    }),
    setServerUrl: jest.fn(),
    setAuthToken: jest.fn((token: string | null) => {
      calls.push(`setAuthToken ${token ?? "null"}`);
    }),
    getHttpClient: jest.fn(() => httpClient),
    getServerUrl: jest.fn(() => serverUrl)
  };

  const secureStorage = {
    getToken: jest.fn().mockResolvedValue(TOKEN),
    setToken: jest.fn(),
    deleteToken: jest.fn()
  };

  const prefStorage = {
    getItem: jest.fn().mockResolvedValue({
      userId: "user-1",
      userName: "LanUser",
      serverId,
      serverUrl,
      lastActiveAt: 1
    }),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  };

  const repository = new AuthRepository(
    client as never,
    secureStorage as never,
    prefStorage as never
  );

  return { repository, httpClient, client, secureStorage, prefStorage, calls };
}

const probeIndex = (calls: string[]) => calls.indexOf("request /System/Info/Public");

describe("restoreSession — cleartext server identity gate", () => {
  it("restores a LAN session once the host proves the stored serverId", async () => {
    const h = createHarness({ serverId: "server-A", probeResult: { Id: "server-A" } });

    const session = await h.repository.restoreSession(h.httpClient as never);

    expect(session).not.toBeNull();
    expect(session?.token).toBe(TOKEN);
    expect(session?.serverUrl).toBe(LAN_URL);
    expect(h.httpClient.request).toHaveBeenCalledWith(
      "/System/Info/Public",
      expect.objectContaining({ timeoutMs: 2500, retries: 0 })
    );
  });

  it("probes with no credential attached, before the token is ever set", async () => {
    const h = createHarness({ probeResult: { Id: "server-A" } });

    await h.repository.restoreSession(h.httpClient as never);

    const tokenCleared = h.calls.indexOf("setAuthToken null");
    const tokenAttached = h.calls.indexOf(`setAuthToken ${TOKEN}`);

    expect(tokenCleared).toBeGreaterThanOrEqual(0);
    expect(tokenCleared).toBeLessThan(probeIndex(h.calls));
    expect(tokenAttached).toBeGreaterThan(probeIndex(h.calls));
  });

  it("withholds the token and suspends the session when another machine answers", async () => {
    const h = createHarness({ serverId: "server-A", probeResult: { Id: "server-B" } });

    const session = await h.repository.restoreSession(h.httpClient as never);

    expect(session).toBeNull();
    expect(h.calls).not.toContain(`setAuthToken ${TOKEN}`);
    expect(h.calls).not.toContain("request /System/Info");
    // Suspended, not wiped: the token survives so returning to the LAN recovers.
    expect(h.secureStorage.deleteToken).not.toHaveBeenCalled();
    expect(h.prefStorage.removeItem).not.toHaveBeenCalled();
  });

  it("withholds the token when the probe returns no server id", async () => {
    const h = createHarness({ probeResult: {} });

    const session = await h.repository.restoreSession(h.httpClient as never);

    expect(session).toBeNull();
    expect(h.calls).not.toContain(`setAuthToken ${TOKEN}`);
  });

  it("withholds the token when the host cannot be reached to verify identity", async () => {
    const h = createHarness({ probeRejects: true });

    const session = await h.repository.restoreSession(h.httpClient as never);

    expect(session).toBeNull();
    expect(h.calls).not.toContain(`setAuthToken ${TOKEN}`);
    expect(h.secureStorage.deleteToken).not.toHaveBeenCalled();
  });

  it("enforces the gate on the headless path, where no httpClient is passed in", async () => {
    // backgroundFetchTask calls restoreSession() with no argument, so the gate
    // must not be skippable by omitting the client.
    const h = createHarness({ serverId: "server-A", probeResult: { Id: "server-B" } });

    const session = await h.repository.restoreSession();

    expect(probeIndex(h.calls)).toBeGreaterThanOrEqual(0);
    expect(session).toBeNull();
    expect(h.calls).not.toContain(`setAuthToken ${TOKEN}`);
  });

  it("never rejects, so a headless caller cannot surface an error to the UI", async () => {
    const h = createHarness();
    h.secureStorage.getToken.mockRejectedValue(new Error("keychain unavailable"));

    await expect(h.repository.restoreSession(h.httpClient as never)).resolves.toBeNull();
  });

  it("leaves the HTTPS path untouched: no identity probe is performed", async () => {
    const h = createHarness({
      serverUrl: PUBLIC_HTTPS_URL,
      serverId: "server-A",
      probeResult: { Id: "server-B" }
    });

    const session = await h.repository.restoreSession(h.httpClient as never);

    expect(session).not.toBeNull();
    expect(session?.token).toBe(TOKEN);
    expect(probeIndex(h.calls)).toBe(-1);
    expect(h.calls).toContain("request /System/Info");
    expect(h.calls).toContain(`setAuthToken ${TOKEN}`);
  });
});
