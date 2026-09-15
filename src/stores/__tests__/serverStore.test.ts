import AsyncStorage from "@react-native-async-storage/async-storage";
import { queryClient } from "../../providers/QueryProvider";
import { useAuthStore } from "../authStore";
import { useNotificationStore } from "../notificationStore";
import { useServerStore } from "../serverStore";
import { serverManager } from "../../core/jellyfin/serverManager";

jest.mock("../../core/jellyfin/serverManager", () => ({
  serverManager: {
    getSavedAccounts: jest.fn(),
    switchAccount: jest.fn(),
    removeAccount: jest.fn()
  }
}));

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

describe("serverStore multi-account switch", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    queryClient.clear();

    useAuthStore.setState({
      status: "authenticated",
      session: sessionA,
      errorMessage: null
    });
    useNotificationStore.getState().resetActiveScope();
    useServerStore.setState({
      savedAccounts: [],
      isLoading: false,
      errorMessage: null
    });

    (serverManager.getSavedAccounts as jest.Mock).mockResolvedValue([]);
  });

  it("clears old queries and publishes only the returned target session", async () => {
    queryClient.setQueryData(["media", "old-account"], { id: "old" });
    (serverManager.switchAccount as jest.Mock).mockResolvedValueOnce(sessionB);

    const result = await useServerStore.getState().switchAccount("server-b", "user-b");

    expect(result).toEqual(sessionB);
    expect(queryClient.getQueryData(["media", "old-account"])).toBeUndefined();
    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().session).toEqual(sessionB);
    expect(useNotificationStore.getState().activeScopeKey).toContain("server-b");
    expect(useNotificationStore.getState().activeScopeKey).toContain("user-b");
  });

  it("restores the previous UI session if the target switch fails", async () => {
    queryClient.setQueryData(["media", "old-account"], { id: "old" });
    (serverManager.switchAccount as jest.Mock).mockRejectedValueOnce(new Error("token missing"));

    await expect(
      useServerStore.getState().switchAccount("server-b", "user-b")
    ).rejects.toThrow("token missing");

    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().session).toEqual(sessionA);
    expect(useServerStore.getState().errorMessage).toBe("token missing");
  });
});
