import { HttpClient } from "../httpClient";
import { AuthenticationError, NetworkError, ServerUnavailableError } from "../../errors";

describe("HttpClient", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("successfully performs GET request and returns JSON", async () => {
    const mockData = { id: "123", name: "Jellyfin Server" };
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData
    } as Response);

    const client = new HttpClient({ baseUrl: "https://demo.jellyfin.org" });
    const result = await client.get<{ id: string; name: string }>("/System/Info/Public");

    expect(result).toEqual(mockData);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("throws AuthenticationError on 401 response", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ message: "Invalid credentials" }),
      json: async () => ({ message: "Invalid credentials" })
    } as Response);

    const client = new HttpClient({ baseUrl: "https://demo.jellyfin.org", defaultRetries: 0 });

    await expect(client.post("/Users/AuthenticateByName", {})).rejects.toThrow(AuthenticationError);
  });

  it("throws NetworkError with isTimeout=true when request times out", async () => {
    globalThis.fetch = jest.fn().mockImplementation(() => {
      const error = new Error("The operation was aborted");
      error.name = "AbortError";
      return Promise.reject(error);
    });

    const client = new HttpClient({ baseUrl: "https://demo.jellyfin.org", defaultRetries: 0, defaultTimeoutMs: 50 });

    await expect(client.get("/Items")).rejects.toThrow(NetworkError);
  });

  it("retries on 503 for safe GET requests and throws ServerUnavailableError after retries exhausted", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "Service Unavailable"
    } as Response);

    const client = new HttpClient({ baseUrl: "https://demo.jellyfin.org", defaultRetries: 1 });

    await expect(client.get("/System/Info")).rejects.toThrow(ServerUnavailableError);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry on 503 for POST mutations by default (retries=0)", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "Service Unavailable"
    } as Response);

    const client = new HttpClient({ baseUrl: "https://demo.jellyfin.org", defaultRetries: 2 });

    await expect(client.post("/Sessions/Playing", { ItemId: "123" })).rejects.toThrow(ServerUnavailableError);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("allows retries on mutations when explicitly declared retrySafe or retryPolicy='explicit'", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "Service Unavailable"
    } as Response);

    const client = new HttpClient({ baseUrl: "https://demo.jellyfin.org", defaultRetries: 1 });

    await expect(
      client.post("/Sessions/Playing/Progress", { ItemId: "123" }, { retrySafe: true })
    ).rejects.toThrow(ServerUnavailableError);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);

    (globalThis.fetch as jest.Mock).mockClear();

    await expect(
      client.post("/Sessions/Playing/Progress", { ItemId: "123" }, { retryPolicy: "explicit", retries: 1 })
    ).rejects.toThrow(ServerUnavailableError);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});
