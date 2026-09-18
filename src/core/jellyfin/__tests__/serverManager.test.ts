import {
  ServerManager,
  SAVED_ACCOUNTS_STORAGE_KEY,
  SAVED_SERVERS_STORAGE_KEY
} from "../serverManager";
import { JellyfinClient } from "../jellyfinClient";
import { ISecureTokenStorage, IUserPreferencesStorage } from "../../security/storage";
import { getAuthTokenStorageKey, ACTIVE_SESSION_STORAGE_KEY } from "../authRepository";

jest.mock("../jellyfinClient");

describe("ServerManager", () => {
  let manager: ServerManager;
  let mockClient: jest.Mocked<JellyfinClient>;
  let mockSecureStorage: jest.Mocked<ISecureTokenStorage>;
  let mockPrefStorage: jest.Mocked<IUserPreferencesStorage>;

  beforeEach(() => {
    mockClient = new JellyfinClient() as jest.Mocked<JellyfinClient>;
    mockClient.setServerUrl = jest.fn();
    mockClient.setAuthToken = jest.fn();

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

    manager = new ServerManager(mockClient, mockSecureStorage, mockPrefStorage);
  });

  describe("saveAccount and getSavedAccounts", () => {
    it("persists accounts list to preferences", async () => {
      mockPrefStorage.getItem.mockResolvedValue([]);

      await manager.saveAccount({
        serverId: "server-A",
        serverName: "Home Server",
        serverUrl: "https://jellyfin-a.local",
        userId: "user-1",
        userName: "Alice",
        lastUsedAt: 100
      });

      expect(mockPrefStorage.setItem).toHaveBeenCalledWith(
        SAVED_ACCOUNTS_STORAGE_KEY,
        expect.arrayContaining([
          expect.objectContaining({
            serverId: "server-A",
            userId: "user-1",
            userName: "Alice"
          })
        ])
      );
    });
  });

  describe("switchAccount", () => {
    it("switches client target and applies token without cross-contamination", async () => {
      mockPrefStorage.getItem.mockImplementation(async (key) => {
        if (key === SAVED_ACCOUNTS_STORAGE_KEY) {
          return [
            {
              serverId: "server-A",
              serverName: "Home Server",
              serverUrl: "https://jellyfin-a.local",
              userId: "user-1",
              userName: "Alice",
              lastUsedAt: 100
            },
            {
              serverId: "server-B",
              serverName: "Remote Server",
              serverUrl: "https://jellyfin-b.remote",
              userId: "user-2",
              userName: "Bob",
              lastUsedAt: 200
            }
          ];
        }
        return null;
      });

      const tokenKeyB = getAuthTokenStorageKey("server-B", "user-2");
      mockSecureStorage.getToken.mockImplementation(async (key) => {
        if (key === tokenKeyB) return "token-for-bob-server-b";
        return null;
      });

      const session = await manager.switchAccount("server-B", "user-2");

      expect(session.userId).toBe("user-2");
      expect(session.serverId).toBe("server-B");
      expect(session.token).toBe("token-for-bob-server-b");

      expect(mockClient.setServerUrl).toHaveBeenCalledWith("https://jellyfin-b.remote");
      expect(mockClient.setAuthToken).toHaveBeenCalledWith("token-for-bob-server-b");

      expect(mockPrefStorage.setItem).toHaveBeenCalledWith(
        ACTIVE_SESSION_STORAGE_KEY,
        expect.objectContaining({
          userId: "user-2",
          serverId: "server-B",
          serverUrl: "https://jellyfin-b.remote"
        })
      );
    });

    it("rejects a legacy public HTTP saved account before mutating the active session", async () => {
      mockPrefStorage.getItem.mockImplementation(async (key) => {
        if (key === SAVED_ACCOUNTS_STORAGE_KEY) {
          return [
            {
              serverId: "server-old",
              serverName: "Legacy Remote",
              serverUrl: "http://public-jellyfin.example.com:8096",
              userId: "user-old",
              userName: "Legacy",
              lastUsedAt: 100
            }
          ];
        }
        return null;
      });
      mockSecureStorage.getToken.mockResolvedValue("legacy-token");

      await expect(manager.switchAccount("server-old", "user-old")).rejects.toThrow(
        "Unencrypted HTTP is only allowed for local/private Jellyfin servers"
      );

      expect(mockSecureStorage.getToken).not.toHaveBeenCalled();
      expect(mockPrefStorage.setItem).not.toHaveBeenCalledWith(
        ACTIVE_SESSION_STORAGE_KEY,
        expect.anything()
      );
      expect(mockClient.setServerUrl).not.toHaveBeenCalled();
      expect(mockClient.setAuthToken).not.toHaveBeenCalled();
    });

    it("throws error if account is not found", async () => {
      mockPrefStorage.getItem.mockResolvedValue([]);

      await expect(manager.switchAccount("server-unknown", "user-unknown")).rejects.toThrow(
        "Account not found"
      );
    });
  });

  describe("removeAccount", () => {
    it("deletes secure token and removes from preferences", async () => {
      mockPrefStorage.getItem.mockImplementation(async (key) => {
        if (key === SAVED_ACCOUNTS_STORAGE_KEY) {
          return [
            {
              serverId: "server-A",
              serverName: "Home Server",
              serverUrl: "https://jellyfin-a.local",
              userId: "user-1",
              userName: "Alice",
              lastUsedAt: 100
            }
          ];
        }
        if (key === ACTIVE_SESSION_STORAGE_KEY) {
          return { serverId: "server-A", userId: "user-1" };
        }
        return null;
      });

      const tokenKeyA = getAuthTokenStorageKey("server-A", "user-1");

      await manager.removeAccount("server-A", "user-1");

      expect(mockSecureStorage.deleteToken).toHaveBeenCalledWith(tokenKeyA);
      expect(mockPrefStorage.setItem).toHaveBeenCalledWith(SAVED_ACCOUNTS_STORAGE_KEY, []);
      expect(mockPrefStorage.removeItem).toHaveBeenCalledWith(ACTIVE_SESSION_STORAGE_KEY);
      expect(mockClient.setAuthToken).toHaveBeenCalledWith(null);
    });
  });

  describe("savedServers management", () => {
    it("returns saved servers sorted by lastUsedAt", async () => {
      mockPrefStorage.getItem.mockResolvedValue([
        { id: "s1", name: "Server 1", url: "https://s1.test", lastUsedAt: 100 },
        { id: "s2", name: "Server 2", url: "https://s2.test", lastUsedAt: 200 }
      ]);

      const servers = await manager.getSavedServers();
      expect(servers).toHaveLength(2);
      expect(servers[0].id).toBe("s2");
      expect(servers[1].id).toBe("s1");
    });

    it("auto-migrates from saved accounts when no saved servers exist", async () => {
      mockPrefStorage.getItem.mockImplementation(async (key) => {
        if (key === SAVED_SERVERS_STORAGE_KEY) return null;
        if (key === SAVED_ACCOUNTS_STORAGE_KEY) {
          return [
            {
              serverId: "srv-alpha",
              serverName: "Alpha",
              serverUrl: "https://alpha.test",
              userId: "u1",
              userName: "Alice",
              lastUsedAt: 500
            }
          ];
        }
        return null;
      });

      const servers = await manager.getSavedServers();
      expect(servers).toHaveLength(1);
      expect(servers[0].id).toBe("srv-alpha");
      expect(mockPrefStorage.setItem).toHaveBeenCalledWith(
        SAVED_SERVERS_STORAGE_KEY,
        expect.arrayContaining([expect.objectContaining({ id: "srv-alpha" })])
      );
    });

    it("saves and upserts server in storage", async () => {
      mockPrefStorage.getItem.mockResolvedValue([]);

      await manager.saveServer({
        id: "srv-new",
        name: "New Server",
        url: "https://new.test",
        lastUsedAt: 10
      });

      expect(mockPrefStorage.setItem).toHaveBeenCalledWith(
        SAVED_SERVERS_STORAGE_KEY,
        expect.arrayContaining([
          expect.objectContaining({
            id: "srv-new",
            name: "New Server",
            url: "https://new.test"
          })
        ])
      );
    });

    it("removes server and associated accounts/tokens", async () => {
      mockPrefStorage.getItem.mockImplementation(async (key) => {
        if (key === SAVED_SERVERS_STORAGE_KEY) {
          return [
            { id: "srv-1", name: "Server 1", url: "https://s1.test", lastUsedAt: 100 },
            { id: "srv-2", name: "Server 2", url: "https://s2.test", lastUsedAt: 200 }
          ];
        }
        if (key === SAVED_ACCOUNTS_STORAGE_KEY) {
          return [
            {
              serverId: "srv-1",
              serverName: "Server 1",
              serverUrl: "https://s1.test",
              userId: "u1",
              userName: "Alice",
              lastUsedAt: 100
            }
          ];
        }
        return null;
      });

      await manager.removeServer("srv-1");

      expect(mockSecureStorage.deleteToken).toHaveBeenCalledWith(
        getAuthTokenStorageKey("srv-1", "u1")
      );
      expect(mockPrefStorage.setItem).toHaveBeenCalledWith(
        SAVED_SERVERS_STORAGE_KEY,
        [expect.objectContaining({ id: "srv-2" })]
      );
      expect(mockPrefStorage.setItem).toHaveBeenCalledWith(SAVED_ACCOUNTS_STORAGE_KEY, []);
    });
  });
});
