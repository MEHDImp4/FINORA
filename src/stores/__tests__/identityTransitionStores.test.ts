jest.mock("../../core/jellyfin/authRepository", () => ({
  authRepository: {
    authenticate: jest.fn(),
    restoreSession: jest.fn(),
    logout: jest.fn()
  }
}));

jest.mock("../../core/jellyfin/serverManager", () => ({
  serverManager: {
    getSavedAccounts: jest.fn(),
    getSavedServers: jest.fn(),
    saveServer: jest.fn(),
    removeServer: jest.fn(),
    switchAccount: jest.fn(),
    removeAccount: jest.fn()
  }
}));

jest.mock("../../core/jellyfin/identityTransition", () => ({
  runIdentityTransition: jest.fn((operation: () => Promise<unknown>) => operation()),
  restoreActiveIdentity: jest.fn(),
  clearActiveIdentity: jest.fn()
}));

jest.mock("../../features/offline/downloadManager", () => ({
  downloadManager: {
    handleIdentityChange: jest.fn(),
    initialize: jest.fn()
  }
}));

jest.mock("../notificationStore", () => {
  const state = {
    resetActiveScope: jest.fn(),
    loadPersisted: jest.fn()
  };
  return {
    useNotificationStore: {
      getState: jest.fn(() => state)
    },
    removePersistedNotificationScope: jest.fn()
  };
});

import { authRepository } from "../../core/jellyfin/authRepository";
import { serverManager } from "../../core/jellyfin/serverManager";
import {
  clearActiveIdentity,
  restoreActiveIdentity
} from "../../core/jellyfin/identityTransition";
import { downloadManager } from "../../features/offline/downloadManager";
import { useNotificationStore } from "../notificationStore";
import { useAuthStore } from "../authStore";
import { useServerStore } from "../serverStore";

const sessionA = {
  token: "token-a",
  serverId: "server-a",
  serverUrl: "https://a.example.com",
  userId: "user-a",
  userName: "User A"
};

const sessionB = {
  token: "token-b",
  serverId: "server-b",
  serverUrl: "https://b.example.com",
  userId: "user-b",
  userName: "User B"
};

describe("identity transition hardening", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useAuthStore.setState({
      status: "authenticated",
      session: sessionA,
      errorMessage: null
    });
    useServerStore.setState({
      savedAccounts: [],
      savedServers: [],
      isLocalConnection: false,
      activeResolvedUrl: sessionA.serverUrl,
      isLoading: false,
      errorMessage: null
    });

    (downloadManager.handleIdentityChange as jest.Mock).mockResolvedValue(undefined);
    (downloadManager.initialize as jest.Mock).mockResolvedValue(undefined);
    (useNotificationStore.getState().loadPersisted as jest.Mock).mockResolvedValue(undefined);
    (restoreActiveIdentity as jest.Mock).mockImplementation(async (session) => session);
    (clearActiveIdentity as jest.Mock).mockResolvedValue(undefined);
    (serverManager.getSavedAccounts as jest.Mock).mockResolvedValue([]);
    (serverManager.getSavedServers as jest.Mock).mockResolvedValue([]);
  });

  it("detaches account A downloads before publishing a login to account B", async () => {
    (authRepository.authenticate as jest.Mock).mockResolvedValueOnce(sessionB);

    const success = await useAuthStore
      .getState()
      .login({ username: "User B", password: "secret" }, sessionB.serverUrl);

    expect(success).toBe(true);
    expect(downloadManager.handleIdentityChange).toHaveBeenCalledTimes(1);
    expect(downloadManager.initialize).toHaveBeenCalledTimes(1);
    expect(useNotificationStore.getState().loadPersisted).toHaveBeenCalledWith(
      sessionB.serverId,
      sessionB.userId
    );
    expect(useAuthStore.getState().session).toEqual(sessionB);
    expect(useAuthStore.getState().status).toBe("authenticated");

    const detachOrder = (downloadManager.handleIdentityChange as jest.Mock).mock.invocationCallOrder[0];
    const authenticateOrder = (authRepository.authenticate as jest.Mock).mock.invocationCallOrder[0];
    expect(detachOrder).toBeLessThan(authenticateOrder);
  });

  it("rolls back to account A if login B fails after target authentication", async () => {
    (authRepository.authenticate as jest.Mock).mockResolvedValueOnce(sessionB);
    (downloadManager.initialize as jest.Mock)
      .mockRejectedValueOnce(new Error("target download init failed"))
      .mockResolvedValueOnce(undefined);

    const success = await useAuthStore
      .getState()
      .login({ username: "User B", password: "secret" }, sessionB.serverUrl);

    expect(success).toBe(false);
    expect(restoreActiveIdentity).toHaveBeenCalledWith(sessionA);
    expect(clearActiveIdentity).not.toHaveBeenCalled();
    expect(useNotificationStore.getState().loadPersisted).toHaveBeenLastCalledWith(
      sessionA.serverId,
      sessionA.userId
    );
    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().session).toEqual(sessionA);
  });

  it("rolls back client, persisted identity and scoped services when account switch B fails late", async () => {
    (serverManager.switchAccount as jest.Mock).mockResolvedValueOnce(sessionB);
    (downloadManager.initialize as jest.Mock)
      .mockRejectedValueOnce(new Error("target queue failed"))
      .mockResolvedValueOnce(undefined);

    await expect(
      useServerStore.getState().switchAccount(sessionB.serverId, sessionB.userId)
    ).rejects.toThrow("target queue failed");

    expect(serverManager.switchAccount).toHaveBeenCalledWith(
      sessionB.serverId,
      sessionB.userId
    );
    expect(restoreActiveIdentity).toHaveBeenCalledWith(sessionA);
    expect(clearActiveIdentity).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().session).toEqual(sessionA);
    expect(downloadManager.handleIdentityChange).toHaveBeenCalledTimes(2);
    expect(downloadManager.initialize).toHaveBeenCalledTimes(2);
  });

  it("fails closed when restoring account A itself fails", async () => {
    (serverManager.switchAccount as jest.Mock).mockResolvedValueOnce(sessionB);
    (downloadManager.initialize as jest.Mock).mockRejectedValueOnce(
      new Error("target queue failed")
    );
    (restoreActiveIdentity as jest.Mock).mockRejectedValueOnce(
      new Error("rollback storage failed")
    );

    await expect(
      useServerStore.getState().switchAccount(sessionB.serverId, sessionB.userId)
    ).rejects.toThrow("target queue failed");

    expect(clearActiveIdentity).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().session).toBeNull();
  });
});
