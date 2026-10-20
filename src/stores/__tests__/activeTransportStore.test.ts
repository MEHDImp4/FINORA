import { queryClient } from "../../providers/QueryProvider";
import { jellyfinClient } from "../../core/jellyfin/jellyfinClient";
import { serverManager } from "../../core/jellyfin/serverManager";
import { useAuthStore } from "../authStore";
import { useServerStore } from "../serverStore";

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

jest.mock("../../core/jellyfin/jellyfinClient", () => ({
  jellyfinClient: {
    getServerUrl: jest.fn(),
    setServerUrl: jest.fn()
  }
}));

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe("serverStore active transport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();

    (jellyfinClient.getServerUrl as jest.Mock)
      .mockReturnValueOnce("https://jellyfin.example.com")
      .mockReturnValue("http://192.168.1.50:8096");

    (serverManager.getSavedServers as jest.Mock).mockResolvedValue([
      {
        id: "server-1",
        name: "Home Jellyfin",
        url: "https://jellyfin.example.com",
        localUrl: "http://192.168.1.50:8096",
        remoteUrl: "https://jellyfin.example.com",
        lastUsedAt: 1
      }
    ]);

    useServerStore.setState({
      savedAccounts: [],
      savedServers: [],
      isLocalConnection: false,
      activeResolvedUrl: null,
      isLoading: false,
      errorMessage: null
    });

    useAuthStore.setState({
      status: "authenticated",
      session: {
        token: "token",
        userId: "user-1",
        userName: "Mehdi",
        serverId: "server-1",
        serverUrl: "https://jellyfin.example.com",
        canonicalServerUrl: "https://jellyfin.example.com"
      },
      errorMessage: null
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ Id: "server-1", ServerName: "Home Jellyfin" })
    }) as typeof fetch;
  });

  it("moves the active client and runtime session to the detected LAN route", async () => {
    const result = await useServerStore.getState().autoDetectActiveConnection("server-1");

    expect(result.strategy).toBe("local-lan");
    expect(jellyfinClient.setServerUrl).toHaveBeenCalledWith("http://192.168.1.50:8096");
    expect(useAuthStore.getState().session?.serverUrl).toBe("http://192.168.1.50:8096");
    expect(useAuthStore.getState().session?.canonicalServerUrl).toBe(
      "https://jellyfin.example.com"
    );
    expect(useServerStore.getState().activeResolvedUrl).toBe("http://192.168.1.50:8096");
    expect(useServerStore.getState().isLocalConnection).toBe(true);
  });
});
