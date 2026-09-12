import {
  AuthRepository,
  ACTIVE_SESSION_STORAGE_KEY,
  getAuthTokenStorageKey
} from "../authRepository";
import { JellyfinClient } from "../jellyfinClient";
import { HttpClient } from "../../network/httpClient";
import { ISecureTokenStorage, IUserPreferencesStorage } from "../../security/storage";
import { AuthenticationError } from "../../errors";

jest.mock("../jellyfinClient");
jest.mock("../../network/httpClient");

describe("AuthRepository", () => {
  let repository: AuthRepository;
  let mockClient: jest.Mocked<JellyfinClient>;
  let mockSecureStorage: jest.Mocked<ISecureTokenStorage>;
  let mockPrefStorage: jest.Mocked<IUserPreferencesStorage>;
  let mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(() => {
    mockHttpClient = new HttpClient() as jest.Mocked<HttpClient>;
    mockHttpClient.request = jest.fn();

    mockClient = new JellyfinClient() as jest.Mocked<JellyfinClient>;
    mockClient.getHttpClient = jest.fn(() => mockHttpClient);
    mockClient.initialize = jest.fn().mockResolvedValue(undefined);
    mockClient.setServerUrl = jest.fn();
    mockClient.setAuthToken = jest.fn();
    mockClient.getServerUrl = jest.fn(() => "https://jellyfin.example.com");

    mockSecureStorage = {
      getToken: jest.fn(),
      setToken: jest.fn(),
      deleteToken: jest.fn()
    };

    mockPrefStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };

    repository = new AuthRepository(mockClient, mockSecureStorage, mockPrefStorage);
  });

  describe("authenticate", () => {
    it("authenticates and saves token to SecureStore without persisting password", async () => {
      mockHttpClient.request.mockResolvedValue({
        AccessToken: "test-access-token-123",
        ServerId: "server-001",
        User: {
          Id: "user-456",
          Name: "FinoraUser"
        }
      });

      const session = await repository.authenticate(
        { username: "FinoraUser", password: "SecretPassword" },
        "https://jellyfin.example.com",
        mockHttpClient
      );

      expect(session.token).toBe("test-access-token-123");
      expect(session.userId).toBe("user-456");
      expect(session.userName).toBe("FinoraUser");
      expect(session.serverId).toBe("server-001");
      expect((session as any).password).toBeUndefined();

      // Secure storage received token
      const expectedTokenKey = getAuthTokenStorageKey("server-001", "user-456");
      expect(mockSecureStorage.setToken).toHaveBeenCalledWith(
        expectedTokenKey,
        "test-access-token-123"
      );

      // Preferences storage received metadata descriptor only (no token or password)
      expect(mockPrefStorage.setItem).toHaveBeenCalledWith(
        ACTIVE_SESSION_STORAGE_KEY,
        expect.objectContaining({
          userId: "user-456",
          userName: "FinoraUser",
          serverId: "server-001",
          serverUrl: "https://jellyfin.example.com"
        })
      );
      expect(mockClient.setAuthToken).toHaveBeenCalledWith("test-access-token-123");
    });

    it("throws AuthenticationError on failure and does not store token", async () => {
      mockHttpClient.request.mockRejectedValue(new Error("Invalid username or password"));

      await expect(
        repository.authenticate(
          { username: "BadUser", password: "WrongPassword" },
          "https://jellyfin.example.com",
          mockHttpClient
        )
      ).rejects.toThrow(AuthenticationError);

      expect(mockSecureStorage.setToken).not.toHaveBeenCalled();
    });
  });

  describe("restoreSession", () => {
    it("restores session successfully if token is valid on server", async () => {
      mockPrefStorage.getItem.mockResolvedValue({
        userId: "user-456",
        userName: "FinoraUser",
        serverId: "server-001",
        serverUrl: "https://jellyfin.example.com",
        lastActiveAt: 123456
      });

      const expectedTokenKey = getAuthTokenStorageKey("server-001", "user-456");
      mockSecureStorage.getToken.mockResolvedValue("stored-token-abc");
      mockHttpClient.request.mockResolvedValue({ ServerName: "Jellyfin" });

      const session = await repository.restoreSession(mockHttpClient);

      expect(session).not.toBeNull();
      expect(session?.token).toBe("stored-token-abc");
      expect(session?.userId).toBe("user-456");
      expect(mockClient.setAuthToken).toHaveBeenCalledWith("stored-token-abc");
    });

    it("returns null and clears session if server rejects token (401)", async () => {
      mockPrefStorage.getItem.mockResolvedValue({
        userId: "user-456",
        userName: "FinoraUser",
        serverId: "server-001",
        serverUrl: "https://jellyfin.example.com"
      });

      const expectedTokenKey = getAuthTokenStorageKey("server-001", "user-456");
      mockSecureStorage.getToken.mockResolvedValue("expired-token");
      mockHttpClient.request.mockRejectedValue(new AuthenticationError("Expired token"));

      const session = await repository.restoreSession(mockHttpClient);

      expect(session).toBeNull();
      expect(mockSecureStorage.deleteToken).toHaveBeenCalledWith(expectedTokenKey);
      expect(mockPrefStorage.removeItem).toHaveBeenCalledWith(ACTIVE_SESSION_STORAGE_KEY);
    });

    it("returns null if no session descriptor exists in preferences", async () => {
      mockPrefStorage.getItem.mockResolvedValue(null);

      const session = await repository.restoreSession(mockHttpClient);
      expect(session).toBeNull();
    });

    it("preserves session on transient network error during verification", async () => {
      mockPrefStorage.getItem.mockResolvedValue({
        userId: "user-456",
        userName: "FinoraUser",
        serverId: "server-001",
        serverUrl: "https://jellyfin.example.com"
      });

      mockSecureStorage.getToken.mockResolvedValue("stored-token-abc");
      mockHttpClient.request.mockRejectedValue(new Error("Network timeout"));

      const session = await repository.restoreSession(mockHttpClient);

      expect(session).not.toBeNull();
      expect(session?.token).toBe("stored-token-abc");
      expect(mockSecureStorage.deleteToken).not.toHaveBeenCalled();
    });
  });

  describe("logout", () => {
    it("dispatches server logout, removes token and preference record", async () => {
      const expectedTokenKey = getAuthTokenStorageKey("server-001", "user-456");

      await repository.logout("server-001", "user-456", mockHttpClient);

      expect(mockHttpClient.request).toHaveBeenCalledWith(
        "https://jellyfin.example.com/Sessions/Logout",
        { method: "POST" }
      );
      expect(mockSecureStorage.deleteToken).toHaveBeenCalledWith(expectedTokenKey);
      expect(mockPrefStorage.removeItem).toHaveBeenCalledWith(ACTIVE_SESSION_STORAGE_KEY);
      expect(mockClient.setAuthToken).toHaveBeenCalledWith(null);
    });
  });
});
