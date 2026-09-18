import { AuthRepository, ACTIVE_SESSION_STORAGE_KEY } from "../authRepository";

describe("AuthRepository legacy session transport hardening", () => {
  it("does not restore or transmit a token to a saved public HTTP server", async () => {
    const httpClient = {
      request: jest.fn()
    };
    const client = {
      initialize: jest.fn().mockResolvedValue(undefined),
      setServerUrl: jest.fn(),
      setAuthToken: jest.fn(),
      getHttpClient: jest.fn(() => httpClient),
      getServerUrl: jest.fn(() => "")
    } as any;
    const secureStorage = {
      getToken: jest.fn().mockResolvedValue("legacy-secret-token"),
      setToken: jest.fn(),
      deleteToken: jest.fn()
    } as any;
    const prefStorage = {
      getItem: jest.fn().mockResolvedValue({
        userId: "legacy-user",
        userName: "Legacy User",
        serverId: "legacy-server",
        serverUrl: "http://public-jellyfin.example.com:8096",
        lastActiveAt: 1
      }),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    } as any;

    const repository = new AuthRepository(client, secureStorage, prefStorage);
    const restored = await repository.restoreSession(httpClient as any);

    expect(restored).toBeNull();
    expect(client.initialize).not.toHaveBeenCalled();
    expect(httpClient.request).not.toHaveBeenCalled();
    expect(client.setAuthToken).toHaveBeenCalledWith(null);
    expect(prefStorage.removeItem).toHaveBeenCalledWith(ACTIVE_SESSION_STORAGE_KEY);
    // REL-02: dropping an invalid descriptor also removes its orphaned secure
    // token, so no unusable credential lingers in SecureStore.
    expect(secureStorage.deleteToken).toHaveBeenCalledWith(
      "finora_auth_token_legacy-server_legacy-user"
    );
  });
});
