from pathlib import Path


def replace_once(text: str, old: str, new: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one occurrence, found {count}: {old[:100]!r}")
    return text.replace(old, new, 1)


path = Path("src/core/jellyfin/authRepository.ts")
text = path.read_text()

text = replace_once(
    text,
    '''interface SavedServerTransport {\n  id: string;\n  url: string;\n  localUrl?: string;\n  remoteUrl?: string;\n}\n''',
    '''interface SavedServerTransport {\n  id: string;\n  url: string;\n  localUrl?: string;\n  remoteUrl?: string;\n}\n\nexport interface TrustedHttpEndpoint {\n  serverId: string;\n  normalizedUrl: string;\n  approvedAt: number;\n}\n''',
)

text = replace_once(
    text,
    '''export const ACTIVE_SESSION_STORAGE_KEY = "finora_active_session";\nconst SAVED_SERVERS_STORAGE_KEY = "finora_saved_servers";''',
    '''export const ACTIVE_SESSION_STORAGE_KEY = "finora_active_session";\nexport const TRUSTED_HTTP_ENDPOINTS_STORAGE_KEY = "finora_trusted_http_endpoints";\nconst SAVED_SERVERS_STORAGE_KEY = "finora_saved_servers";\nconst MAX_TRUSTED_HTTP_ENDPOINTS = 50;''',
)

helpers = '''\n\n  private async getTrustedHttpEndpoints(): Promise<TrustedHttpEndpoint[]> {\n    const stored =\n      (await this.prefStorage.getItem<TrustedHttpEndpoint[]>(TRUSTED_HTTP_ENDPOINTS_STORAGE_KEY)) || [];\n    return stored.filter(\n      (entry) =>\n        Boolean(entry) &&\n        typeof entry.serverId === "string" &&\n        typeof entry.normalizedUrl === "string" &&\n        typeof entry.approvedAt === "number"\n    );\n  }\n\n  private async isHttpEndpointTrusted(serverId: string, normalizedUrl: string): Promise<boolean> {\n    const trusted = await this.getTrustedHttpEndpoints();\n    return trusted.some(\n      (entry) => entry.serverId === serverId && entry.normalizedUrl === normalizedUrl\n    );\n  }\n\n  private async trustHttpEndpoint(serverId: string, normalizedUrl: string): Promise<void> {\n    const trusted = await this.getTrustedHttpEndpoints();\n    const now = Date.now();\n    const next = trusted\n      .filter(\n        (entry) => !(entry.serverId === serverId && entry.normalizedUrl === normalizedUrl)\n      )\n      .concat({ serverId, normalizedUrl, approvedAt: now })\n      .slice(-MAX_TRUSTED_HTTP_ENDPOINTS);\n    await this.prefStorage.setItem(TRUSTED_HTTP_ENDPOINTS_STORAGE_KEY, next);\n  }\n'''
text = replace_once(
    text,
    '''    this.confirmInsecureHttp = confirmInsecureHttp;\n  }\n\n  public async authenticate(''',
    '''    this.confirmInsecureHttp = confirmInsecureHttp;\n  }''' + helpers + '''\n  public async authenticate(''',
)

text = replace_once(
    text,
    '''      // Store sensitive token strictly in SecureStore\n      const tokenKey = getAuthTokenStorageKey(session.serverId, session.userId);''',
    '''      // Record only the explicitly approved non-sensitive HTTP route. The\n      // credential remains exclusively in SecureStore and is never co-located\n      // with endpoint trust metadata.\n      if (!normalized.isHttps) {\n        await this.trustHttpEndpoint(session.serverId, targetUrl);\n      }\n\n      // Store sensitive token strictly in SecureStore\n      const tokenKey = getAuthTokenStorageKey(session.serverId, session.userId);''',
)

text = replace_once(
    text,
    '''      if (typeof this.client.initialize === "function") {\n        await this.client.initialize(activeNormalized.url);\n      } else {\n        this.client.setServerUrl(activeNormalized.url);\n      }\n\n      if (!activeNormalized.isHttps) {''',
    '''      // Detach any previously configured credential before switching transport.\n      // From this point until endpoint validation succeeds, every request is\n      // guaranteed to be unauthenticated.\n      this.client.setAuthToken(null);\n\n      if (typeof this.client.initialize === "function") {\n        await this.client.initialize(activeNormalized.url);\n      } else {\n        this.client.setServerUrl(activeNormalized.url);\n      }\n\n      if (!activeNormalized.isHttps) {''',
)

text = replace_once(
    text,
    '''        // that issued it. This probe is strictly unauthenticated.\n        this.client.setAuthToken(null);\n\n        let publicInfo: { Id?: string } | null = null;''',
    '''        // that issued it. This probe is strictly unauthenticated.\n        let publicInfo: { Id?: string } | null = null;''',
)

text = replace_once(
    text,
    '''        if (!publicInfo?.Id || publicInfo.Id !== descriptor.serverId) {\n          logger.warn(\n            "[Auth] Cleartext server identity mismatch — session suspended, token withheld."\n          );\n          return null;\n        }\n      }\n\n      this.client.setAuthToken(token);''',
    '''        if (!publicInfo?.Id || publicInfo.Id !== descriptor.serverId) {\n          logger.warn(\n            "[Auth] Cleartext server identity mismatch — session suspended, token withheld."\n          );\n          return null;\n        }\n\n        const endpointTrusted = await this.isHttpEndpointTrusted(\n          descriptor.serverId,\n          activeNormalized.url\n        );\n        if (!endpointTrusted) {\n          // The server identity matched, but this exact cleartext route has never\n          // been approved. This is the network-change boundary: require explicit\n          // consent before a saved credential can ever be attached to it.\n          const approved = await this.confirmInsecureHttp(activeNormalized.url);\n          if (!approved) {\n            logger.warn(\n              "[Auth] Cleartext endpoint is not trusted — session suspended, token withheld."\n            );\n            return null;\n          }\n          await this.trustHttpEndpoint(descriptor.serverId, activeNormalized.url);\n        }\n      }\n\n      this.client.setAuthToken(token);''',
)

path.write_text(text)

test_path = Path("src/core/jellyfin/__tests__/httpEndpointTrust.test.ts")
test_path.write_text(r'''import {
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
''')

print("Phase 2 HTTP trust patch applied")
