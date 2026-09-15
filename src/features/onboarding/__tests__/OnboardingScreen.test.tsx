import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { OnboardingScreen } from "../components/OnboardingScreen";
import { DEFAULT_JELLYFIN_SERVER, validateAndDiscoverServer } from "../../../core/jellyfin/serverDiscovery";
import { useAuthStore } from "../../../stores/authStore";
import { useOnboardingStore } from "../../../stores/onboardingStore";
import { serverManager } from "../../../core/jellyfin/serverManager";

/** Neutral test URL — never a personal server */
const TEST_SERVER_URL = "https://jellyfin.example.com";

jest.mock("../../../core/jellyfin/serverDiscovery", () => ({
  DEFAULT_JELLYFIN_SERVER: "",
  validateAndDiscoverServer: jest.fn()
}));

jest.mock("../../../core/jellyfin/serverManager", () => ({
  serverManager: {
    saveAccount: jest.fn()
  }
}));

describe("OnboardingScreen", () => {
  beforeEach(() => {
    useAuthStore.setState({
      status: "idle",
      session: null,
      errorMessage: null
    });
    useOnboardingStore.setState({
      isCompleted: false,
      isLoaded: true
    });
    jest.clearAllMocks();
  });

  it("DEFAULT_JELLYFIN_SERVER is empty so no personal server is distributed", () => {
    expect(DEFAULT_JELLYFIN_SERVER).toBe("");
  });

  it("renders onboarding slides and server input with empty default", () => {
    let component: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(<OnboardingScreen />);
    });

    const root = component!.root;
    // Check badge text and connection title from the current UI
    expect(root.findByProps({ children: "VOTRE JELLYFIN" })).toBeDefined();
    expect(root.findByProps({ children: "LECTURE FINORA" })).toBeDefined();
    expect(root.findByProps({ children: "Connectez votre Jellyfin" })).toBeDefined();

    // Server input should start empty (no personal server pre-filled)
    const inputs = root.findAllByType("TextInput" as any);
    const serverInput = inputs.find((i) => i.props.placeholder === "https://votre-serveur.com");
    expect(serverInput).toBeDefined();
    expect(serverInput?.props.value).toBe("");
  });

  it("handles test server action successfully with a user-provided URL", async () => {
    (validateAndDiscoverServer as jest.Mock).mockResolvedValueOnce({
      serverId: "srv-123",
      serverName: "Jellyfin Home",
      version: "10.9.11",
      url: TEST_SERVER_URL,
      isHttps: true,
      hasWarning: false
    });

    let component: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(<OnboardingScreen />);
    });

    const root = component!.root;

    // Type a server URL first
    const inputs = root.findAllByType("TextInput" as any);
    const serverInput = inputs.find((i) => i.props.placeholder === "https://votre-serveur.com");
    ReactTestRenderer.act(() => {
      serverInput?.props.onChangeText(TEST_SERVER_URL);
    });

    const testButton = root.findByProps({ children: "Tester" }).parent;

    await ReactTestRenderer.act(async () => {
      testButton?.props.onPress();
    });

    expect(validateAndDiscoverServer).toHaveBeenCalledWith(TEST_SERVER_URL);
    expect(root.findByProps({ children: "Serveur en ligne : Jellyfin Home" })).toBeDefined();
  });

  it("authenticates and completes onboarding upon submitting valid credentials", async () => {
    const onCompletedMock = jest.fn();
    const loginMock = jest.fn().mockResolvedValue(true);
    useAuthStore.setState({
      login: loginMock,
      session: {
        token: "tok-abc",
        userId: "user-1",
        userName: "Bastoz",
        serverId: "srv-1",
        serverUrl: TEST_SERVER_URL
      }
    });

    let component: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(<OnboardingScreen onCompleted={onCompletedMock} />);
    });

    const root = component!.root;
    const textInputs = root.findAllByType("TextInput" as any);

    // Must provide a server URL first (DEFAULT_JELLYFIN_SERVER is now "")
    const serverInput = textInputs.find((i) => i.props.placeholder === "https://votre-serveur.com");
    const usernameInput = textInputs.find((i) => i.props.placeholder === "Votre identifiant");

    ReactTestRenderer.act(() => {
      serverInput?.props.onChangeText(TEST_SERVER_URL);
      usernameInput?.props.onChangeText("Bastoz");
    });

    const submitBtn = root.findByProps({ label: "Se connecter et commencer" });

    await ReactTestRenderer.act(async () => {
      submitBtn.props.onPress();
    });

    expect(loginMock).toHaveBeenCalledWith(
      { username: "Bastoz", password: "" },
      expect.any(String)
    );
    expect(serverManager.saveAccount).toHaveBeenCalled();
    expect(useOnboardingStore.getState().isCompleted).toBe(true);
    expect(onCompletedMock).toHaveBeenCalled();
  });

  it("renders active session card and allows continuing when already authenticated", async () => {
    const onCompletedMock = jest.fn();
    useAuthStore.setState({
      status: "authenticated",
      session: {
        token: "tok-abc",
        userId: "user-1",
        userName: "Bastoz",
        serverId: "srv-1",
        serverUrl: TEST_SERVER_URL
      }
    });

    let component: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(<OnboardingScreen onCompleted={onCompletedMock} />);
    });

    const root = component!.root;
    expect(root.findByProps({ children: "Bienvenue, Bastoz !" })).toBeDefined();

    const enterBtn = root.findByProps({ label: "Accéder à FINORA" });
    await ReactTestRenderer.act(async () => {
      enterBtn.props.onPress();
    });

    expect(useOnboardingStore.getState().isCompleted).toBe(true);
    expect(onCompletedMock).toHaveBeenCalled();
  });
});
