import {
  ACTIVE_SESSION_STORAGE_KEY,
  AuthRepository,
  TRUSTED_HTTP_ENDPOINTS_STORAGE_KEY,
  TrustedHttpEndpoint
} from "../authRepository";

interface HarnessOptions {
  serverUrl: string;
  serverId?: string;
  publicServerId?: string;
  trusted?: TrustedHttpEndpoint[];
  approve?: boolean;
  malformed?: boolean;
}

function createHarness(options: HarnessOptions) {
  const serverId = options.serverId ?? "server-1";
  const token = "saved-secret-token";
  const httpClient = {
    request: jest.fn(async (url: string) => {
      if (url === "/System/Info/Public") {
        return { Id: options.publicServerId ?? serverId };
      }
      if (url === "/System/Info") return { Id: serverId };
      throw new Error(`Unexpected URL ${url}`);
    })
  };
  const client = {
    initialize: jest.fn().mockResolvedValue(undefined),
    setServerUrl: jest.fn(),
    setAuthToken: jest.fn(),
    getHttpClient: jest.fn(() => httpClient),
    getServerUrl: jest.fn(() => options.serverUrl)
  } as any;
  const secureStorage = {
    getToken: jest.fn().mockResolvedValue(token),
    setToken: jest.fn(),
    deleteToken: jest.fn()
  } as any;
  const prefStorage = {
    getItem: jest.fn(async (key: string) => {
      if (key === ACTIVE_SESSION_STORAGE_KEY) {
        return {
          userId: "user-1",
          userName: "User One",
          serverId,
          serverUrl: options.malformed ? "://not-a-url" : options.serverUrl,
          lastActiveAt: 1
        };
      }
      if (key === "finora_saved_servers") return [];
      if (key === TRUSTED_HTTP_ENDPOINTS_STORAGE_KEY) return options.trusted ?? [];
      return null;
    }),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn()
  } as any;
  const confirmInsecureHttp = jest.fn().mockResolvedValue(options.approve ?? false);
  const repository = new AuthRepository(
    client,
    secureStorage,
    prefStorage,
    confirmInsecureHttp
  );

  return { repository, client, secureStorage, prefStorage, httpClient, confirmInsecureHttp, token };
}

describe("AuthRepository trusted HTTP endpoint restoration", () => {
  it("restores HTTPS normally without requiring endpoint trust", async () => {
    const harness = createHarness({ serverUrl: "https://jellyfin.example.com" });

    const session = await harness.repository.restoreSession(harness.httpClient as any);

    expect(session?.serverUrl).toBe("https://jellyfin.example.com");
    expect(harness.confirmInsecureHttp).not.toHaveBeenCalled();
    expect(harness.client.setAuthToken).toHaveBeenLastCalledWith(harness.token);
    expect(harness.httpClient.request).toHaveBeenCalledWith("/System/Info", {
      timeoutMs: 2500,
      retries: 0
    });
  });

  it("restores an approved private HTTP endpoint with the expected ServerId", async () => {
    const serverUrl = "http://192.168.1.20:8096";
    const harness = createHarness({
      serverUrl,
      trusted: [{ serverId: "server-1", normalizedUrl: serverUrl, approvedAt: 1 }]
    });

    const session = await harness.repository.restoreSession(harness.httpClient as any);

    expect(session?.serverUrl).toBe(serverUrl);
    expect(harness.confirmInsecureHttp).not.toHaveBeenCalled();
    expect(harness.client.setAuthToken).toHaveBeenLastCalledWith(harness.token);
  });

  it("withholds the token when a private HTTP endpoint reports the wrong ServerId", async () => {
    const serverUrl = "http://192.168.1.20:8096";
    const harness = createHarness({
      serverUrl,
      publicServerId: "different-server",
      trusted: [{ serverId: "server-1", normalizedUrl: serverUrl, approvedAt: 1 }]
    });

    await expect(harness.repository.restoreSession(harness.httpClient as any)).resolves.toBeNull();

    expect(harness.client.setAuthToken).not.toHaveBeenCalledWith(harness.token);
    expect(harness.confirmInsecureHttp).not.toHaveBeenCalled();
    expect(harness.secureStorage.deleteToken).not.toHaveBeenCalled();
  });

  it("withholds the token from a different private HTTP endpoint until explicitly approved", async () => {
    const oldUrl = "http://192.168.1.10:8096";
    const newUrl = "http://192.168.50.10:8096";
    const harness = createHarness({
      serverUrl: newUrl,
      trusted: [{ serverId: "server-1", normalizedUrl: oldUrl, approvedAt: 1 }],
      approve: false
    });

    await expect(harness.repository.restoreSession(harness.httpClient as any)).resolves.toBeNull();

    expect(harness.confirmInsecureHttp).toHaveBeenCalledWith(newUrl);
    expect(harness.client.setAuthToken).not.toHaveBeenCalledWith(harness.token);
    expect(harness.secureStorage.deleteToken).not.toHaveBeenCalled();
    expect(harness.prefStorage.setItem).not.toHaveBeenCalledWith(
      TRUSTED_HTTP_ENDPOINTS_STORAGE_KEY,
      expect.anything()
    );
  });

  it("can explicitly approve a verified new private HTTP endpoint before attaching the token", async () => {
    const serverUrl = "http://100.80.12.5:8096";
    const harness = createHarness({ serverUrl, approve: true });

    const session = await harness.repository.restoreSession(harness.httpClient as any);

    expect(session?.serverUrl).toBe(serverUrl);
    expect(harness.confirmInsecureHttp).toHaveBeenCalledWith(serverUrl);
    expect(harness.prefStorage.setItem).toHaveBeenCalledWith(
      TRUSTED_HTTP_ENDPOINTS_STORAGE_KEY,
      expect.arrayContaining([
        expect.objectContaining({ serverId: "server-1", normalizedUrl: serverUrl })
      ])
    );
    expect(harness.client.setAuthToken).toHaveBeenLastCalledWith(harness.token);
  });

  it("rejects malformed restored endpoints without sending the token", async () => {
    const harness = createHarness({ serverUrl: "http://192.168.1.20:8096", malformed: true });

    await expect(harness.repository.restoreSession(harness.httpClient as any)).resolves.toBeNull();

    expect(harness.httpClient.request).not.toHaveBeenCalled();
    expect(harness.client.setAuthToken).not.toHaveBeenCalledWith(harness.token);
  });

  it("never attaches a saved HTTP token before anonymous identity and trust validation", async () => {
    const serverUrl = "http://server.lan:8096";
    const harness = createHarness({
      serverUrl,
      trusted: [{ serverId: "server-1", normalizedUrl: serverUrl, approvedAt: 1 }]
    });

    await harness.repository.restoreSession(harness.httpClient as any);

    const anonymousProbeOrder = harness.httpClient.request.mock.invocationCallOrder[0];
    const tokenCallIndex = harness.client.setAuthToken.mock.calls.findIndex(
      ([value]: [string | null]) => value === harness.token
    );
    expect(tokenCallIndex).toBeGreaterThanOrEqual(0);
    const tokenAttachOrder = harness.client.setAuthToken.mock.invocationCallOrder[tokenCallIndex];
    expect(harness.client.setAuthToken.mock.calls[0][0]).toBeNull();
    expect(tokenAttachOrder).toBeGreaterThan(anonymousProbeOrder);
  });

  it("does not transfer a saved token across a LAN/WAN origin change without approval", async () => {
    const trustedLan = "http://jellyfin.lan:8096";
    const changedOrigin = "http://100.70.60.50:8096";
    const harness = createHarness({
      serverUrl: changedOrigin,
      trusted: [{ serverId: "server-1", normalizedUrl: trustedLan, approvedAt: 1 }],
      approve: false
    });

    await harness.repository.restoreSession(harness.httpClient as any);

    expect(harness.httpClient.request).toHaveBeenCalledWith("/System/Info/Public", {
      timeoutMs: 2500,
      retries: 0
    });
    expect(harness.client.setAuthToken).not.toHaveBeenCalledWith(harness.token);
    expect(harness.confirmInsecureHttp).toHaveBeenCalledWith(changedOrigin);
  });
});
