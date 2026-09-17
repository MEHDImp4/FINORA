import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { OnboardingScreen } from "../components/OnboardingScreen";
import { DEFAULT_JELLYFIN_SERVER, validateAndDiscoverServer } from "../../../core/jellyfin/serverDiscovery";
import { useAuthStore } from "../../../stores/authStore";
import { useOnboardingStore } from "../../../stores/onboardingStore";
import { useLanguageStore } from "../../../stores/languageStore";
import { usePlaybackPreferencesStore } from "../../../stores/playbackPreferencesStore";
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

jest.mock("../../../core/jellyfin/authRepository", () => {
  const actual = jest.requireActual("../../../core/jellyfin/authRepository");
  return {
    ...actual,
    authRepository: {
      ...actual.authRepository,
      getPublicUsers: jest.fn().mockResolvedValue([])
    }
  };
});

jest.mock("../../../core/notifications/notificationService", () => ({
  notificationService: {
    requestPermissions: jest.fn().mockResolvedValue(true)
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
    useLanguageStore.setState({
      language: "en",
      isLoaded: true
    });
    jest.clearAllMocks();
  });

  it("DEFAULT_JELLYFIN_SERVER is empty so no personal server is distributed", () => {
    expect(DEFAULT_JELLYFIN_SERVER).toBe("");
  });

  it("renders onboarding slides with English as default and allows switching language to French", async () => {
    let component: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(<OnboardingScreen />);
    });

    const root = component!.root;
    // English default checks
    expect(root.findByProps({ children: "LANGUAGE" })).toBeDefined();
    expect(root.findByProps({ children: "Choose your language" })).toBeDefined();
    expect(root.findByProps({ children: "YOUR JELLYFIN" })).toBeDefined();
    expect(root.findByProps({ children: "FINORA PLAYBACK" })).toBeDefined();
    expect(root.findByProps({ children: "Connect your Jellyfin" })).toBeDefined();

    // Find French language selection card
    const frenchCard = root.findByProps({ accessibilityLabel: "French" });
    expect(frenchCard).toBeDefined();

    // Select French
    await ReactTestRenderer.act(async () => {
      frenchCard.props.onPress();
    });

    // Language store should now be 'fr'
    expect(useLanguageStore.getState().language).toBe("fr");

    // Dynamic translation to French should now be reflected
    expect(root.findByProps({ children: "LANGUE" })).toBeDefined();
    expect(root.findByProps({ children: "Choisissez votre langue" })).toBeDefined();
    expect(root.findByProps({ children: "VOTRE JELLYFIN" })).toBeDefined();
    expect(root.findByProps({ children: "LECTURE FINORA" })).toBeDefined();
    expect(root.findByProps({ children: "Connectez votre Jellyfin" })).toBeDefined();
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
    const serverInput = inputs.find((i) => i.props.placeholder === "https://your-server.com");
    ReactTestRenderer.act(() => {
      serverInput?.props.onChangeText(TEST_SERVER_URL);
    });

    const testButton = root.findByProps({ children: "Test" }).parent;

    await ReactTestRenderer.act(async () => {
      testButton?.props.onPress();
    });

    expect(validateAndDiscoverServer).toHaveBeenCalledWith(TEST_SERVER_URL);
    expect(root.findByProps({ children: "Server online: Jellyfin Home" })).toBeDefined();
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

    const serverInput = textInputs.find((i) => i.props.placeholder === "https://your-server.com");
    const usernameInput = textInputs.find((i) => i.props.placeholder === "Your username");

    ReactTestRenderer.act(() => {
      serverInput?.props.onChangeText(TEST_SERVER_URL);
      usernameInput?.props.onChangeText("Bastoz");
    });

    const submitBtn = root.findByProps({ label: "Sign in and get started" });

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
    expect(root.findByProps({ children: "Welcome back, Bastoz!" })).toBeDefined();

    const enterBtn = root.findByProps({ label: "Enter FINORA" });
    await ReactTestRenderer.act(async () => {
      enterBtn.props.onPress();
    });

    expect(useOnboardingStore.getState().isCompleted).toBe(true);
    expect(onCompletedMock).toHaveBeenCalled();
  });

  it("allows selecting download quality in slide 2 and updates preference store", async () => {
    let component: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(<OnboardingScreen />);
    });

    const root = component!.root;
    // Check 1080p option exists and is selected by default
    const radios = root.findAllByProps({ accessibilityRole: "radio" });
    expect(radios.length).toBeGreaterThanOrEqual(3);

    const radio1080 = radios.find((r) => r.props.accessibilityLabel.includes("1080p"));
    expect(radio1080).toBeDefined();
    expect(radio1080!.props.accessibilityState.selected).toBe(true);

    // Select 720p
    const radio720 = radios.find((r) => r.props.accessibilityLabel.includes("720p"));
    expect(radio720).toBeDefined();
    await ReactTestRenderer.act(async () => {
      radio720!.props.onPress();
    });

    expect(usePlaybackPreferencesStore.getState().preferences.defaultDownloadQuality).toBe("720p");
  });

  it("scans public profiles upon testing server and allows profile selection", async () => {
    const { authRepository } = require("../../../core/jellyfin/authRepository");
    authRepository.getPublicUsers.mockResolvedValue([
      {
        id: "user-alice",
        name: "Alice",
        serverId: "srv-1",
        hasPassword: true
      },
      {
        id: "user-bob",
        name: "Bob",
        serverId: "srv-1",
        hasPassword: false
      }
    ]);

    (validateAndDiscoverServer as jest.Mock).mockResolvedValue({
      serverName: "Jellyfin Home",
      version: "10.8.13"
    });

    let component: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(<OnboardingScreen />);
    });

    const root = component!.root;
    const textInputs = root.findAllByType("TextInput" as any);
    const serverInput = textInputs.find((i) => i.props.placeholder === "https://your-server.com");

    ReactTestRenderer.act(() => {
      serverInput?.props.onChangeText(TEST_SERVER_URL);
    });

    const testButton = root.findByProps({ children: "Test" }).parent;

    await ReactTestRenderer.act(async () => {
      testButton?.props.onPress();
    });

    expect(authRepository.getPublicUsers).toHaveBeenCalledWith(TEST_SERVER_URL);
    // Profile picker appears
    expect(root.findByProps({ children: "Who's watching?" })).toBeDefined();
    expect(root.findByProps({ children: "Alice" })).toBeDefined();
    expect(root.findByProps({ children: "Bob" })).toBeDefined();
  });
});
