import { HttpClient } from "../httpClient";
import { SecurityError } from "../../errors";

const BASE = "https://jellyfin.example.com";

function okFetch(payload: unknown = { ok: true }) {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => payload
  } as Response);
}

const CREDENTIAL_HEADERS: Array<[string, string]> = [
  ["Authorization", 'MediaBrowser Token="secret"'],
  ["X-Emby-Token", "secret"],
  ["X-Emby-Authorization", "secret"],
  ["X-MediaBrowser-Token", "secret"],
  ["Cookie", "session=secret"]
];

describe("HttpClient — same-origin credential guard", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("blocks a credential-bearing request to a foreign origin without ever calling fetch", async () => {
    const fetchMock = okFetch();
    globalThis.fetch = fetchMock;

    const client = new HttpClient({
      baseUrl: BASE,
      defaultRetries: 0,
      defaultHeaders: { "X-Emby-Token": "jellyfin-secret-token" }
    });

    await expect(client.get("https://evil.example.com/test")).rejects.toThrow(SecurityError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports the refusal with a clear message", async () => {
    globalThis.fetch = okFetch();

    const client = new HttpClient({
      baseUrl: BASE,
      defaultRetries: 0,
      defaultHeaders: { Authorization: 'MediaBrowser Token="secret"' }
    });

    await expect(client.get("https://evil.example.com/test")).rejects.toThrow(
      "Cross-origin authenticated request blocked."
    );
  });

  it.each(CREDENTIAL_HEADERS)("treats the %s header as a credential", async (header, value) => {
    const fetchMock = okFetch();
    globalThis.fetch = fetchMock;

    const client = new HttpClient({
      baseUrl: BASE,
      defaultRetries: 0,
      defaultHeaders: { [header]: value }
    });

    await expect(client.get("https://evil.example.com/test")).rejects.toThrow(SecurityError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows a same-origin absolute URL that carries credentials", async () => {
    const fetchMock = okFetch({ Id: "server-1" });
    globalThis.fetch = fetchMock;

    const client = new HttpClient({
      baseUrl: BASE,
      defaultRetries: 0,
      defaultHeaders: { "X-Emby-Token": "secret" }
    });

    await expect(client.get(`${BASE}/System/Info`)).resolves.toEqual({ Id: "server-1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("allows a relative URL that carries credentials", async () => {
    const fetchMock = okFetch({ Id: "server-1" });
    globalThis.fetch = fetchMock;

    const client = new HttpClient({
      baseUrl: BASE,
      defaultRetries: 0,
      defaultHeaders: { Authorization: 'MediaBrowser Token="secret"' }
    });

    await expect(client.get("/System/Info")).resolves.toEqual({ Id: "server-1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("allows an unauthenticated request to an external URL", async () => {
    const fetchMock = okFetch({ ok: true });
    globalThis.fetch = fetchMock;

    const client = new HttpClient({ baseUrl: BASE, defaultRetries: 0 });

    await expect(client.get("https://cdn.example.com/catalog.json")).resolves.toEqual({
      ok: true
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("is deny-by-default when no trusted origin is configured", async () => {
    const fetchMock = okFetch();
    globalThis.fetch = fetchMock;

    const client = new HttpClient({
      defaultRetries: 0,
      defaultHeaders: { "X-Emby-Token": "secret" }
    });

    await expect(client.get(`${BASE}/System/Info`)).rejects.toThrow(SecurityError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks another port on the same host, since origin includes the port", async () => {
    const fetchMock = okFetch();
    globalThis.fetch = fetchMock;

    const client = new HttpClient({
      baseUrl: BASE,
      defaultRetries: 0,
      defaultHeaders: { "X-Emby-Token": "secret" }
    });

    await expect(client.get("https://jellyfin.example.com:8443/System/Info")).rejects.toThrow(
      SecurityError
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks a cleartext downgrade to the same host", async () => {
    const fetchMock = okFetch();
    globalThis.fetch = fetchMock;

    const client = new HttpClient({
      baseUrl: BASE,
      defaultRetries: 0,
      defaultHeaders: { "X-Emby-Token": "secret" }
    });

    await expect(client.get("http://jellyfin.example.com/System/Info")).rejects.toThrow(
      SecurityError
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
