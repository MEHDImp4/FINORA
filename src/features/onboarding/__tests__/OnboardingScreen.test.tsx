import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { OnboardingScreen } from "../components/OnboardingScreen";
import { DEFAULT_JELLYFIN_SERVER, validateAndDiscoverServer } from "../../../core/jellyfin/serverDiscovery";
import { useAuthStore } from "../../../stores/authStore";
import { useOnboardingStore } from "../../../stores/onboardingStore";
import { serverManager } from "../../../core/jellyfin/serverManager";

jest.mock("../../../core/jellyfin/serverDiscovery", () => ({
  DEFAULT_JELLYFIN_SERVER: "https://azeur-jelly-web.smp4.xyz",
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

  it("renders onboarding slides with default server info and elements", () => {
    let component: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(<OnboardingScreen />);
    });

    const root = component!.root;
    // Check titles and elements
    expect(root.findByProps({ children: "Streaming Haute Fidélité" })).toBeDefined();
    expect(root.findByProps({ children: "Lecteur Intelligent" })).toBeDefined();
    expect(root.findByProps({ children: "Connexion au Serveur" })).toBeDefined();

    // Check default prefilled server input
    const inputs = root.findAllByType("TextInput" as any);
    const serverInput = inputs.find((i) => i.props.value === DEFAULT_JELLYFIN_SERVER);
    expect(serverInput).toBeDefined();
    expect(serverInput?.props.value).toBe("https://azeur-jelly-web.smp4.xyz");
  });

  it("handles test server action successfully", async () => {
    (validateAndDiscoverServer as jest.Mock).mockResolvedValueOnce({
      serverId: "srv-123",
      serverName: "Jellyfin Bastoz",
      version: "10.9.11",
      url: "https://azeur-jelly-web.smp4.xyz",
      isHttps: true,
      hasWarning: false
    });

    let component: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(<OnboardingScreen />);
    });

    const root = component!.root;
    const testButton = root.findByProps({ children: "Tester" }).parent;

    await ReactTestRenderer.act(async () => {
      testButton?.props.onPress();
    });

    expect(validateAndDiscoverServer).toHaveBeenCalledWith("https://azeur-jelly-web.smp4.xyz");
    expect(root.findByProps({ children: "Serveur en ligne : Jellyfin Bastoz" })).toBeDefined();
  });

  it("allows exploring without account and marks onboarding as complete", async () => {
    const onCompletedMock = jest.fn();

    let component: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(<OnboardingScreen onCompleted={onCompletedMock} />);
    });

    const root = component!.root;
    const guestBtn = root.findByProps({ children: "Explorer sans se connecter" }).parent;

    await ReactTestRenderer.act(async () => {
      guestBtn?.props.onPress();
    });

    expect(useOnboardingStore.getState().isCompleted).toBe(true);
    expect(onCompletedMock).toHaveBeenCalled();
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
        serverUrl: "https://azeur-jelly-web.smp4.xyz"
      }
    });

    let component: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(<OnboardingScreen onCompleted={onCompletedMock} />);
    });

    const root = component!.root;
    const textInputs = root.findAllByType("TextInput" as any);
    const usernameInput = textInputs.find((i) => i.props.placeholder === "Votre identifiant");

    ReactTestRenderer.act(() => {
      usernameInput?.props.onChangeText("Bastoz");
    });

    const submitBtn = root.findByProps({ label: "Se connecter et commencer" });

    await ReactTestRenderer.act(async () => {
      submitBtn.props.onPress();
    });

    expect(loginMock).toHaveBeenCalledWith(
      { username: "Bastoz", password: "" },
      "https://azeur-jelly-web.smp4.xyz"
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
        serverUrl: "https://azeur-jelly-web.smp4.xyz"
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
