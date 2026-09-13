import { useAuthStore } from "../authStore";
import { authRepository } from "../../core/jellyfin/authRepository";

jest.mock("../../core/jellyfin/authRepository", () => ({
  authRepository: {
    authenticate: jest.fn(),
    restoreSession: jest.fn(),
    logout: jest.fn()
  }
}));

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.setState({
      status: "idle",
      session: null,
      errorMessage: null
    });
    jest.clearAllMocks();
  });

  it("handles successful login", async () => {
    const mockSession = {
      token: "token-123",
      serverId: "server-1",
      serverUrl: "https://finora.media",
      userId: "user-1",
      userName: "FinoraUser"
    };
    (authRepository.authenticate as jest.Mock).mockResolvedValueOnce(mockSession);

    const success = await useAuthStore.getState().login(
      { username: "FinoraUser", password: "secretPassword" },
      "https://finora.media"
    );

    expect(success).toBe(true);
    const state = useAuthStore.getState();
    expect(state.status).toBe("authenticated");
    expect(state.session).toEqual(mockSession);
    expect(state.errorMessage).toBeNull();
  });

  it("handles failed login and updates status & error", async () => {
    (authRepository.authenticate as jest.Mock).mockRejectedValueOnce(new Error("Invalid credentials"));

    const success = await useAuthStore.getState().login(
      { username: "BadUser", password: "wrong" },
      "https://finora.media"
    );

    expect(success).toBe(false);
    const state = useAuthStore.getState();
    expect(state.status).toBe("unauthenticated");
    expect(state.session).toBeNull();
    expect(state.errorMessage).toBe("Invalid credentials");
  });

  it("restores active session successfully", async () => {
    const mockSession = {
      token: "restored-token",
      serverId: "server-1",
      serverUrl: "https://finora.media",
      userId: "user-1",
      userName: "RestoredUser"
    };
    (authRepository.restoreSession as jest.Mock).mockResolvedValueOnce(mockSession);

    const success = await useAuthStore.getState().restoreSession();
    expect(success).toBe(true);
    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().session).toEqual(mockSession);
  });

  it("sets unauthenticated when no session can be restored", async () => {
    (authRepository.restoreSession as jest.Mock).mockResolvedValueOnce(null);

    const success = await useAuthStore.getState().restoreSession();
    expect(success).toBe(false);
    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().session).toBeNull();
  });

  it("logs out and clears session", async () => {
    useAuthStore.setState({
      status: "authenticated",
      session: {
        token: "active-token",
        serverId: "srv-1",
        serverUrl: "https://finora.media",
        userId: "usr-1",
        userName: "User"
      }
    });

    await useAuthStore.getState().logout();

    expect(authRepository.logout).toHaveBeenCalledWith("srv-1", "usr-1");
    const state = useAuthStore.getState();
    expect(state.status).toBe("unauthenticated");
    expect(state.session).toBeNull();
  });

  it("clears error message with clearError", () => {
    useAuthStore.setState({ errorMessage: "Something went wrong" });
    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().errorMessage).toBeNull();
  });
});
