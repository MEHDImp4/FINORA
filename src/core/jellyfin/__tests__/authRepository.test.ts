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
  let confirmInsecureHttp: jest.Mock<Promise<boolean>, [string]>;

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

    confirmInsecureHttp = jest.fn().mockResolvedValue(true);
    repository = new AuthRepository(
      mockClient,
      mockSecureStorage,
      mockPrefStorage,
      confirmInsecureHttp
    );
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
      expect(confirmInsecureHttp).not.toHaveBeenCalled();

      const expectedTokenKey = getAuthTokenStorageKey("server-001", "user-456");
      expect(mockSecureStorage.setToken).toHaveBeenCalledWith(
        expectedTokenKey,
        "test-access-token-123"
      );

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

    it("allows private/local HTTP only after explicit confirmation", async () => {
      mockHttpClient.request.mockResolvedValue({
        AccessToken: "lan-token",
        ServerId: "server-lan",
        User: { Id: "user-lan", Name: "LanUser" }
      });

      const session = await repository.authenticate(
        { username: "LanUser", password: "LocalPassword" },
        "http://192.168.1.50:8096/web/index.html",
        mockHttpClient
      );

      expect(confirmInsecureHttp).toHaveBeenCalledWith("http://192.168.1.50:8096");
      expect(session.serverUrl).toBe("http://192.168.1.50:8096");
      expect(mockHttpClient.request).toHaveBeenCalledWith(
        "http://192.168.1.50:8096/Users/AuthenticateByName",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("does not send local HTTP credentials when the user declines the warning", async () => {
      confirmInsecureHttp.mockResolvedValue(false);

      await expect(
        repository.authenticate(
          { username: "LanUser", password: "LocalPassword" },
          "http://192.168.1.50:8096",
          mockHttpClient
        )
      ).rejects.toThrow(AuthenticationError);

      expect(confirmInsecureHttp).toHaveBeenCalledWith("http://192.168.1.50:8096");
      expect(mockClient.initialize).not.toHaveBeenCalled();
      expect(mockHttpClient.request).not.toHaveBeenCalled();
      expect(mockSecureStorage.setToken).not.toHaveBeenCalled();
    });

    it("rejects public HTTP before confirmation, initialization or credential transmission", async () => {
      await expect(
        repository.authenticate(
          { username: "FinoraUser", password: "SecretPassword" },
          "http://jellyfin.example.com:8096",
          mockHttpClient
        )
      ).rejects.toThrow("Unencrypted HTTP is only allowed for local/private Jellyfin servers");

      expect(confirmInsecureHttp).not.toHaveBeenCalled();
      expect(mockClient.initialize).not.toHaveBeenCalled();
      expect(mockHttpClient.request).not.toHaveBeenCalled();
      expect(mockSecureStorage.setToken).not.toHaveBeenCalled();
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

  describe("getPublicUsers", () => {
    it("fetches and maps public users from server", async () => {
      mockHttpClient.request.mockResolvedValue([
        {
          Id: "user-1",
          Name: "Alice",
          ServerId: "server-001",
          PrimaryImageTag: "tag-alice",
          HasPassword: true
        },
        {
          Id: "user-2",
          Name: "Bob",
          ServerId: "server-001",
          HasPassword: false
        }
      ]);

      const users = await repository.getPublicUsers("https://jellyfin.example.com", mockHttpClient);

      expect(users).toHaveLength(2);
      expect(users[0]).toEqual({
        id: "user-1",
        name: "Alice",
        serverId: "server-001",
        primaryImageTag: "tag-alice",
        hasPassword: true
      });
      expect(users[1]).toEqual({
        id: "user-2",
        name: "Bob",
        serverId: "server-001",
        primaryImageTag: undefined,
        hasPassword: false
      });
    });

    it("returns empty array on network or server error", async () => {
      mockHttpClient.request.mockRejectedValue(new Error("500 Server Error"));

      const users = await repository.getPublicUsers("https://jellyfin.example.com", mockHttpClient);

      expect(users).toEqual([]);
    });

    it("returns empty array when given an empty server URL", async () => {
      const users = await repository.getPublicUsers("", mockHttpClient);
      expect(users).toEqual([]);
      expect(mockHttpClient.request).not.toHaveBeenCalled();
    });
  });

  describe("getAvailableUsers", () => {
    it("combines public and authenticated users when authenticated", async () => {
      mockHttpClient.request
        .mockResolvedValueOnce([
          { Id: "pub-1", Name: "PublicUser", HasPassword: false }
        ])
        .mockResolvedValueOnce([
          { Id: "auth-1", Name: "AdminUser", HasPassword: true },
          { Id: "pub-1", Name: "PublicUser", HasPassword: false }
        ]);

      const users = await repository.getAvailableUsers(
        "https://jellyfin.example.com",
        true,
        mockHttpClient
      );

      expect(users).toHaveLength(2);
      expect(users.map((u) => u.name)).toEqual(["PublicUser", "AdminUser"]);
    });

    it("falls back gracefully to public users if /Users fails", async () => {
      mockHttpClient.request
        .mockResolvedValueOnce([
          { Id: "pub-1", Name: "PublicUser", HasPassword: false }
        ])
        .mockRejectedValueOnce(new Error("403 Forbidden"));

      const users = await repository.getAvailableUsers(
        "https://jellyfin.example.com",
        true,
        mockHttpClient
      );

      expect(users).toHaveLength(1);
      expect(users[0].name).toBe("PublicUser");
    });
  });
});
